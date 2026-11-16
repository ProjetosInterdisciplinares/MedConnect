"""
AnuncioBuilder — padrão Builder.

Monta o anúncio passo a passo e reúne, em um único lugar, as regras de
montagem usadas pelo cadastro manual, pela prévia da planilha e pela
publicação em lote. Cada etapa converte e valida os seus campos;
construir() só entrega o Anuncio quando as etapas obrigatórias foram
chamadas e nenhuma regra foi violada.
"""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from anuncio.models import Anuncio
from anuncio.publicacao.erros import AnuncioInvalidoError
from mat_med.models import MatMed

FORMATOS_DATA = ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y')
CATEGORIAS = tuple(valor for valor, _ in MatMed.CATEGORIA_CHOICES)
TABELAS_TISS = tuple(valor for valor, _ in MatMed.TISS_CHOICES)
LIMITE_OBSERVACOES = 2000


def _texto(valor) -> str:
    return str(valor).strip() if valor is not None else ''


def _data(valor) -> date | None:
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    texto = _texto(valor)
    for formato in FORMATOS_DATA:
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    return None


class AnuncioBuilder:

    def __init__(self, anunciante):
        self._anunciante = anunciante
        self._insumo: MatMed | None = None
        self._campos = {
            'ds_lote': '', 'dt_fabricacao': None, 'dt_validade': None,
            'qtd_mat': None, 'val_base': None, 'ds_obs': '', 'imagem_anuncio': None,
        }
        self._etapas: set[str] = set()
        self._erros: list[str] = []

    @property
    def erros(self) -> list[str]:
        return list(self._erros)

    # ── Etapas ────────────────────────────────────────────────────────

    def com_insumo(self, insumo: MatMed) -> 'AnuncioBuilder':
        """Usa um insumo já cadastrado."""
        self._insumo = insumo
        self._etapas.add('insumo')
        return self

    def com_novo_insumo(self, ds_mat='', ds_tipo='', ds_marca='', unidade_med='', cd_tuss='',
                        cd_tiss='', cd_simpro='', cd_brasindice='') -> 'AnuncioBuilder':
        """Prepara um insumo novo, que será gravado junto com o anúncio."""
        ds_mat, ds_tipo, ds_marca, unidade_med = map(_texto, (ds_mat, ds_tipo, ds_marca, unidade_med))
        cd_tuss, cd_tiss, cd_simpro, cd_brasindice = map(_texto, (cd_tuss, cd_tiss, cd_simpro, cd_brasindice))

        self._exigir(ds_mat, 'Nome do Insumo é obrigatório')
        if not ds_tipo:
            self._erros.append('Categoria do Insumo é obrigatória')
        elif ds_tipo not in CATEGORIAS:
            self._erros.append(f"Categoria '{ds_tipo}' inválida. Use 'Material Hospitalar' ou 'Medicamento'")
        self._exigir(ds_marca, 'Marca do Insumo é obrigatória')
        self._exigir(unidade_med, 'Unidade de Medida é obrigatória')
        if not cd_tuss:
            self._erros.append('Código TUSS é obrigatório')
        elif len(cd_tuss) > 8:
            self._erros.append(f"Código TUSS '{cd_tuss}' excede 8 caracteres")
        if cd_tiss and cd_tiss not in TABELAS_TISS:
            self._erros.append(f"Tabela TISS '{cd_tiss}' inválida. Use '19' ou '20'")
        if len(cd_simpro) > 10:
            self._erros.append(f"Código SIMPRO '{cd_simpro}' excede 10 caracteres")
        if len(cd_brasindice) > 15:
            self._erros.append(f"Código Brasíndice '{cd_brasindice}' excede 15 caracteres")

        self._insumo = MatMed(
            ds_mat=ds_mat, ds_tipo=ds_tipo, ds_marca=ds_marca, unidade_med=unidade_med, cd_tuss=cd_tuss,
            cd_tiss=cd_tiss or None, cd_simpro=cd_simpro or None, cd_brasindice=cd_brasindice or None,
            ds_pessoaj=self._anunciante,
        )
        self._etapas.add('insumo')
        return self

    def com_lote(self, lote, fabricacao, validade, obrigatorio=False) -> 'AnuncioBuilder':
        self._campos['ds_lote'] = _texto(lote)
        if obrigatorio:
            self._exigir(self._campos['ds_lote'], 'Lote é obrigatório')
        self._campos['dt_fabricacao'] = self._data_da_etapa(fabricacao, 'Data de Fabricação', obrigatorio)
        self._campos['dt_validade'] = self._data_da_etapa(validade, 'Data de Validade', obrigatorio)
        return self

    def com_valores(self, quantidade, valor_base) -> 'AnuncioBuilder':
        self._campos['qtd_mat'] = self._quantidade(quantidade)
        self._campos['val_base'] = self._valor(valor_base)
        self._etapas.add('valores')
        return self

    def com_descricao(self, texto, obrigatoria=False) -> 'AnuncioBuilder':
        descricao = _texto(texto)
        if obrigatoria:
            self._exigir(descricao, 'Observações são obrigatórias')
        if len(descricao) > LIMITE_OBSERVACOES:
            self._erros.append(f'Observações excedem {LIMITE_OBSERVACOES} caracteres')
        self._campos['ds_obs'] = descricao
        return self

    def com_imagem(self, base64) -> 'AnuncioBuilder':
        self._campos['imagem_anuncio'] = base64 or None
        return self

    # ── Resultado ─────────────────────────────────────────────────────

    def valores(self) -> dict:
        """Campos do anúncio já convertidos, para exibir na prévia."""
        c = self._campos
        return {
            'ds_lote': c['ds_lote'],
            'dt_fabricacao': c['dt_fabricacao'].isoformat() if c['dt_fabricacao'] else None,
            'dt_validade': c['dt_validade'].isoformat() if c['dt_validade'] else None,
            'qtd_mat': c['qtd_mat'],
            'val_base': str(c['val_base']) if c['val_base'] is not None else None,
            'ds_obs': c['ds_obs'],
        }

    def construir(self) -> Anuncio:
        erros = list(self._erros)
        if 'insumo' not in self._etapas:
            erros.append('Insumo é obrigatório')
        if 'valores' not in self._etapas:
            erros.append('Quantidade e Valor Base são obrigatórios')
        if erros:
            raise AnuncioInvalidoError(erros)

        return Anuncio(
            cd_mat=self._insumo,
            cd_pessoa_anunciante=self._anunciante,
            ie_status=Anuncio.STATUS_ATIVO,
            **self._campos,
        )

    # ── Conversões ────────────────────────────────────────────────────

    def _exigir(self, valor, mensagem):
        if not valor:
            self._erros.append(mensagem)

    def _data_da_etapa(self, valor, nome, obrigatoria) -> date | None:
        convertida = _data(valor)
        if convertida is None:
            if obrigatoria:
                self._erros.append(f'{nome} é obrigatória (formato DD/MM/AAAA)')
            elif _texto(valor):
                self._erros.append(f'{nome} inválida (formato DD/MM/AAAA)')
        return convertida

    def _quantidade(self, valor) -> int | None:
        if valor is None or _texto(valor) == '':
            self._erros.append('Quantidade é obrigatória')
            return None
        try:
            quantidade = int(float(_texto(valor)))
        except (TypeError, ValueError):
            self._erros.append('Quantidade inválida')
            return None
        if quantidade <= 0:
            self._erros.append('Quantidade deve ser um número positivo')
            return None
        return quantidade

    def _valor(self, valor) -> Decimal | None:
        try:
            convertido = Decimal(_texto(valor).replace(',', '.'))
        except (InvalidOperation, ValueError):
            convertido = None
        if convertido is None or not convertido.is_finite() or convertido <= 0:
            self._erros.append('Valor Base é obrigatório e deve ser um número positivo')
            return None
        return convertido
