"""
Verificação do credenciamento — padrão Facade.

A tela de Solicitações pede verificar() e recebe um relatório pronto. A
fachada esconde a validação do número (cnpj.py), a consulta à Receita
(Adapter em receita.py), o cache da consulta (VerificacaoCNPJ) e as
comparações com o que a empresa informou no cadastro.
A decisão de aprovar continua com o admin: o relatório é uma ajuda.
"""
import difflib
import re
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import datetime

from pessoa_juridica.cnpj import formatar_cnpj, validar_cnpj
from pessoa_juridica.models import PessoaJuridica, VerificacaoCNPJ
from pessoa_juridica.receita import (
    BrasilAPIAdapter, CNPJNaoEncontradoError, ConsultaCNPJ, ConsultaCNPJError, DadosReceita,
)

OK, ALERTA, ERRO = 'ok', 'alerta', 'erro'

# Prefixos de CNAE de atividades ligadas à saúde (hospitais, clínicas,
# distribuidores e fabricantes de medicamentos e materiais médico-hospitalares)
CNAES_SAUDE = {
    '86': 'Atenção à saúde humana',
    '87': 'Atenção à saúde integrada com assistência social',
    '2121': 'Fabricação de medicamentos',
    '2123': 'Fabricação de preparações farmacêuticas',
    '3250': 'Fabricação de instrumentos e materiais médicos',
    '4644': 'Comércio atacadista de medicamentos',
    '4645': 'Comércio atacadista de instrumentos e materiais médico-hospitalares',
    '4664': 'Comércio atacadista de equipamentos médico-hospitalares',
    '4771': 'Farmácias e drogarias',
    '4773': 'Comércio de artigos médicos e ortopédicos',
}

# Sufixos societários ignorados ao comparar razões sociais
SUFIXOS = r'\b(LTDA|S ?A|SA|S/A|ME|EPP|EIRELI|SS|SOCIEDADE SIMPLES|EM RECUPERACAO JUDICIAL)\b'
SIMILARIDADE_MINIMA = 0.85


@dataclass
class ItemVerificacao:
    chave: str
    rotulo: str
    situacao: str      # ok | alerta | erro
    detalhe: str


@dataclass
class RelatorioVerificacao:
    cnpj: str
    itens: list[ItemVerificacao] = field(default_factory=list)
    dados_receita: dict | None = None
    consultado_em: datetime | None = None
    aviso: str | None = None   # ex.: consulta indisponível, mostrando o último resultado guardado

    @property
    def resultado(self) -> str:
        situacoes = {item.situacao for item in self.itens}
        return ERRO if ERRO in situacoes else ALERTA if ALERTA in situacoes else OK

    def como_dict(self) -> dict:
        dados = asdict(self)
        dados['resultado'] = self.resultado
        return dados


def _normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize('NFD', texto or '').encode('ascii', 'ignore').decode()
    limpo = re.sub(r'[^A-Z0-9 ]', ' ', sem_acento.upper())
    return re.sub(r'\s+', ' ', limpo).strip()


def _sem_sufixos(texto: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(SUFIXOS, ' ', _normalizar(texto))).strip()


class VerificacaoCredenciamentoFacade:

    def __init__(self, consulta: ConsultaCNPJ | None = None):
        self._consulta = consulta or BrasilAPIAdapter()

    def verificar(self, empresa: PessoaJuridica, atualizar: bool = False) -> RelatorioVerificacao:
        """atualizar=True consulta a Receita de novo, mesmo havendo resultado guardado."""
        relatorio = RelatorioVerificacao(cnpj=formatar_cnpj(empresa.nr_cnpj))

        if not validar_cnpj(empresa.nr_cnpj):
            relatorio.itens.append(ItemVerificacao(
                'digitos', 'Número do CNPJ', ERRO,
                'Os dígitos verificadores não conferem: o número foi digitado errado ou não existe.',
            ))
            return relatorio
        relatorio.itens.append(ItemVerificacao('digitos', 'Número do CNPJ', OK, 'Dígitos verificadores corretos.'))

        dados = self._dados_da_receita(empresa, atualizar, relatorio)
        if dados is not None:
            relatorio.dados_receita = dados.como_dict()
            relatorio.itens += [
                self._situacao(dados),
                self._razao_social(empresa, dados),
                self._atividade(dados),
                self._localizacao(empresa, dados),
            ]
        return relatorio

    # ── Consulta com cache ────────────────────────────────────────────

    def _dados_da_receita(self, empresa, atualizar, relatorio) -> DadosReceita | None:
        guardada = VerificacaoCNPJ.objects.filter(empresa=empresa).first()
        if guardada and not atualizar:
            relatorio.consultado_em = guardada.consultado_em
            return DadosReceita.de_dict(guardada.dados)

        try:
            dados = self._consulta.consultar(empresa.nr_cnpj)
        except CNPJNaoEncontradoError:
            relatorio.itens.append(ItemVerificacao(
                'receita', 'Cadastro na Receita Federal', ERRO, 'CNPJ não encontrado na base da Receita Federal.',
            ))
            return None
        except ConsultaCNPJError:
            if guardada:
                relatorio.aviso = 'A consulta à Receita está indisponível agora. Mostrando o último resultado guardado.'
                relatorio.consultado_em = guardada.consultado_em
                return DadosReceita.de_dict(guardada.dados)
            relatorio.itens.append(ItemVerificacao(
                'receita', 'Cadastro na Receita Federal', ALERTA,
                'Não foi possível consultar a Receita agora. Tente de novo em alguns minutos.',
            ))
            return None

        verificacao, _ = VerificacaoCNPJ.objects.update_or_create(empresa=empresa, defaults={'dados': dados.como_dict()})
        relatorio.consultado_em = verificacao.consultado_em
        return dados

    # ── Comparações ───────────────────────────────────────────────────

    @staticmethod
    def _situacao(dados: DadosReceita) -> ItemVerificacao:
        if dados.situacao == 'ATIVA':
            return ItemVerificacao('situacao', 'Situação na Receita', OK, 'ATIVA')
        return ItemVerificacao('situacao', 'Situação na Receita', ERRO,
                               f'{dados.situacao or "Desconhecida"}: a empresa não está ativa na Receita.')

    @staticmethod
    def _razao_social(empresa, dados: DadosReceita) -> ItemVerificacao:
        informada, oficial = _sem_sufixos(empresa.razao_social), _sem_sufixos(dados.razao_social)
        parecida = difflib.SequenceMatcher(None, informada, oficial).ratio() >= SIMILARIDADE_MINIMA
        if informada and (informada == oficial or informada in oficial or oficial in informada or parecida):
            return ItemVerificacao('razao_social', 'Razão social', OK, dados.razao_social)
        return ItemVerificacao('razao_social', 'Razão social', ALERTA,
                               f'Diferente da informada. Na Receita: "{dados.razao_social}".')

    @staticmethod
    def _atividade(dados: DadosReceita) -> ItemVerificacao:
        def da_saude(codigo: str) -> bool:
            return any(codigo.startswith(prefixo) for prefixo in CNAES_SAUDE)

        principal = f'{dados.cnae_codigo} {dados.cnae_descricao}'.strip()
        if da_saude(dados.cnae_codigo):
            return ItemVerificacao('atividade', 'Atividade principal', OK, principal)
        secundaria = next((c for c in dados.cnaes_secundarios if da_saude(c['codigo'])), None)
        if secundaria:
            return ItemVerificacao('atividade', 'Atividade principal', ALERTA,
                                   f'{principal}. A área da saúde aparece só como atividade secundária '
                                   f'({secundaria["codigo"]} {secundaria["descricao"]}).')
        return ItemVerificacao('atividade', 'Atividade principal', ALERTA,
                               f'{principal}. Nenhuma atividade da área da saúde registrada.')

    @staticmethod
    def _localizacao(empresa, dados: DadosReceita) -> ItemVerificacao:
        oficial = f'{dados.municipio}/{dados.uf}'
        if not empresa.cidade or not empresa.estado:
            return ItemVerificacao('localizacao', 'Cidade/UF', ALERTA, f'Não informada no cadastro. Na Receita: {oficial}.')
        if _normalizar(empresa.cidade) == _normalizar(dados.municipio) and empresa.estado.upper() == dados.uf.upper():
            return ItemVerificacao('localizacao', 'Cidade/UF', OK, oficial)
        return ItemVerificacao('localizacao', 'Cidade/UF', ALERTA,
                               f'Informada: {empresa.cidade}/{empresa.estado}. Na Receita: {oficial}.')
