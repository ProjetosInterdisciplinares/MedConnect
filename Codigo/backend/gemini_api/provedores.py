"""
Provedores de inteligência artificial — padrão Adapter.

O restante do sistema depende apenas da interface ProvedorIA. O
GeminiAdapter traduz essa interface para a biblioteca google-genai.
Trocar de provedor ou de modelo exige apenas um novo adaptador.
"""
import json
import os
import threading
import time
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as TempoEsgotado

from google import genai


class ErroProvedorIA(Exception):
    """Falha ao se comunicar com o provedor de IA."""


class IAIndisponivelError(ErroProvedorIA):
    """O provedor está fora do ar, sobrecarregado ou demorou demais."""


class RespostaInvalidaIAError(ErroProvedorIA):
    """O provedor respondeu, mas não no formato esperado."""


class ProvedorIA(ABC):
    """Interface do cliente: o que o MedConnect espera de qualquer IA."""

    @abstractmethod
    def gerar_texto(self, prompt: str) -> str:
        ...

    @abstractmethod
    def gerar_json(self, prompt: str) -> dict:
        ...


class GeminiAdapter(ProvedorIA):
    """
    Adaptador: encapsula o genai.Client (serviço) e traduz chamadas,
    respostas e erros.

    Tenta os modelos em ordem: se o principal estiver sobrecarregado ou
    fora do ar, passa para o próximo. Cada tentativa tem um limite de tempo
    garantido pelo próprio adaptador, para a tela nunca ficar presa.
    A lista pode ser trocada pela variável de ambiente GEMINI_MODELOS.
    """

    MODELOS_PADRAO = ('gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite')
    TEMPO_POR_TENTATIVA_S = 12
    TEMPO_TOTAL_S = 40
    # Disjuntor: um modelo que falhou por indisponibilidade é pulado por este tempo
    PAUSA_MODELO_INDISPONIVEL_S = 300
    # Erros que indicam indisponibilidade do modelo: vale tentar o próximo
    SINAIS_INDISPONIBILIDADE = (
        '503', '504', '429', '404', 'unavailable', 'high demand', 'deadline',
        'resource_exhausted', 'not_found', 'timed out', 'timeout',
    )

    _executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix='gemini')
    _pausados_ate: dict[str, float] = {}  # compartilhado entre requisições
    _trava = threading.Lock()

    def __init__(self, api_key: str | None = None, modelos: tuple[str, ...] | None = None):
        self._api_key = api_key or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
        configurados = tuple(m.strip() for m in os.environ.get('GEMINI_MODELOS', '').split(',') if m.strip())
        self._modelos = modelos or configurados or self.MODELOS_PADRAO
        self._cliente = None

    @property
    def cliente(self) -> genai.Client:
        # Criado sob demanda: instanciar o adaptador não exige rede nem chave.
        if self._cliente is None:
            self._cliente = genai.Client(
                api_key=self._api_key,
                http_options={'timeout': self.TEMPO_POR_TENTATIVA_S * 1000},
            )
        return self._cliente

    def gerar_texto(self, prompt: str) -> str:
        return self._gerar(prompt)

    def gerar_json(self, prompt: str) -> dict:
        texto = self._gerar(prompt, config={'response_mime_type': 'application/json'})
        try:
            return json.loads(texto)
        except (json.JSONDecodeError, TypeError) as erro:
            raise RespostaInvalidaIAError('A IA não retornou um JSON válido.') from erro

    # ── Internos ──────────────────────────────────────────────────────

    def _gerar(self, prompt: str, **opcoes) -> str:
        inicio = time.monotonic()
        ultimo_erro: Exception | None = None

        for modelo in self._modelos_na_ordem():
            restante = self.TEMPO_TOTAL_S - (time.monotonic() - inicio)
            if restante <= 0:
                break
            try:
                return self._chamar(modelo, prompt, min(self.TEMPO_POR_TENTATIVA_S, restante), **opcoes)
            except IAIndisponivelError as erro:
                ultimo_erro = erro
                self._pausar(modelo)  # tenta o próximo modelo

        raise IAIndisponivelError(f'Nenhum modelo de IA respondeu a tempo. Último erro: {ultimo_erro}')

    def _modelos_na_ordem(self) -> list[str]:
        """Modelos disponíveis primeiro; os pausados ficam por último, como última opção."""
        agora = time.monotonic()
        with self._trava:
            pausados = {m for m, ate in self._pausados_ate.items() if ate > agora}
        return [m for m in self._modelos if m not in pausados] + [m for m in self._modelos if m in pausados]

    def _pausar(self, modelo: str) -> None:
        with self._trava:
            self._pausados_ate[modelo] = time.monotonic() + self.PAUSA_MODELO_INDISPONIVEL_S

    def _chamar(self, modelo: str, prompt: str, limite_s: float, **opcoes) -> str:
        tarefa = self._executor.submit(
            self.cliente.models.generate_content, model=modelo, contents=prompt, **opcoes,
        )
        try:
            resposta = tarefa.result(timeout=limite_s)
        except TempoEsgotado as erro:
            raise IAIndisponivelError(f'{modelo}: sem resposta em {limite_s:.0f}s') from erro
        except Exception as erro:
            mensagem = str(erro).lower()
            if any(sinal in mensagem for sinal in self.SINAIS_INDISPONIBILIDADE):
                raise IAIndisponivelError(f'{modelo}: {erro}') from erro
            raise ErroProvedorIA(str(erro)) from erro

        texto = resposta.text
        if not texto:
            raise RespostaInvalidaIAError(f'{modelo}: resposta vazia')
        return texto
