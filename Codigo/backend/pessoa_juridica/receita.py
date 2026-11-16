"""
Consulta dos dados oficiais de um CNPJ na Receita Federal — padrão Adapter.

A verificação do credenciamento depende apenas da interface ConsultaCNPJ.
O BrasilAPIAdapter traduz essa interface para a API pública da BrasilAPI
(dados abertos da Receita). Trocar de serviço (ReceitaWS, CNPJá...) exige
apenas um novo adaptador.
"""
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field

import requests

from pessoa_juridica.cnpj import limpar_cnpj


class ConsultaCNPJError(Exception):
    """Falha ao consultar o CNPJ."""


class CNPJNaoEncontradoError(ConsultaCNPJError):
    """O CNPJ não existe na base da Receita."""


class ConsultaCNPJIndisponivelError(ConsultaCNPJError):
    """O serviço de consulta está fora do ar, lento ou limitou as consultas."""


@dataclass(frozen=True)
class DadosReceita:
    cnpj: str
    razao_social: str
    nome_fantasia: str = ''
    situacao: str = ''                  # ATIVA, BAIXADA, INAPTA, SUSPENSA, NULA
    cnae_codigo: str = ''               # ex.: "8610101"
    cnae_descricao: str = ''
    cnaes_secundarios: list[dict] = field(default_factory=list)  # [{"codigo", "descricao"}]
    municipio: str = ''
    uf: str = ''
    cep: str = ''
    data_abertura: str = ''

    def como_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def de_dict(cls, dados: dict) -> 'DadosReceita':
        campos = cls.__dataclass_fields__
        return cls(**{chave: valor for chave, valor in dados.items() if chave in campos})


class ConsultaCNPJ(ABC):
    """Interface do cliente: o que a verificação espera de qualquer serviço de CNPJ."""

    @abstractmethod
    def consultar(self, cnpj: str) -> DadosReceita:
        ...


class BrasilAPIAdapter(ConsultaCNPJ):
    """Adaptador: chama a BrasilAPI (serviço) e traduz a resposta e os erros."""

    URL = 'https://brasilapi.com.br/api/cnpj/v1/{cnpj}'
    TEMPO_LIMITE_S = 10

    def consultar(self, cnpj: str) -> DadosReceita:
        numero = limpar_cnpj(cnpj)
        try:
            resposta = requests.get(
                self.URL.format(cnpj=numero), timeout=self.TEMPO_LIMITE_S,
                headers={'User-Agent': 'MedConnect/1.0', 'Accept': 'application/json'},
            )
        except requests.RequestException as erro:
            raise ConsultaCNPJIndisponivelError('Não foi possível acessar o serviço de consulta de CNPJ.') from erro

        if resposta.status_code in (400, 404):
            raise CNPJNaoEncontradoError('CNPJ não encontrado na Receita Federal.')
        if resposta.status_code != 200:
            raise ConsultaCNPJIndisponivelError(f'Serviço de consulta de CNPJ respondeu {resposta.status_code}.')

        try:
            dados = resposta.json()
        except ValueError as erro:
            raise ConsultaCNPJIndisponivelError('Resposta inválida do serviço de consulta de CNPJ.') from erro

        return DadosReceita(
            cnpj=numero,
            razao_social=dados.get('razao_social') or '',
            nome_fantasia=dados.get('nome_fantasia') or '',
            situacao=(dados.get('descricao_situacao_cadastral') or '').upper(),
            cnae_codigo=str(dados.get('cnae_fiscal') or ''),
            cnae_descricao=dados.get('cnae_fiscal_descricao') or '',
            cnaes_secundarios=[
                {'codigo': str(c.get('codigo') or ''), 'descricao': c.get('descricao') or ''}
                for c in (dados.get('cnaes_secundarios') or []) if c.get('codigo')
            ],
            municipio=dados.get('municipio') or '',
            uf=dados.get('uf') or '',
            cep=dados.get('cep') or '',
            data_abertura=dados.get('data_inicio_atividade') or '',
        )
