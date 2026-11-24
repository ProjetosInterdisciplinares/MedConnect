"""
Assistente de IA do MedConnect — padrão Facade.

As views chamam apenas os três métodos públicos. A fachada esconde a
montagem dos prompts, o provedor de IA (Adapter), a leitura da resposta
e a cobrança de créditos.
"""
import json

from anuncio.models import Anuncio
from creditos.acoes import GerarDescricaoIA
from creditos.carteira import CarteiraCreditos
from gemini_api.provedores import GeminiAdapter, ProvedorIA

LIMITE_INTERESSES = 200
LIMITE_RESULTADOS_BUSCA = 20


class AssistenteIAFacade:

    def __init__(self, provedor: ProvedorIA | None = None):
        self._provedor = provedor or GeminiAdapter()

    # ── Operações públicas ────────────────────────────────────────────

    def gerar_descricao(self, empresa, material) -> str:
        """
        Gera a descrição do anúncio e cobra 1 crédito somente se a IA responder.
        Lança SaldoInsuficienteError antes de chamar a IA quando falta saldo.
        Lote, validade e quantidade ficam de fora: já aparecem nos campos do anúncio.
        """
        carteira = CarteiraCreditos(empresa)
        acao = GerarDescricaoIA(self._nome_material(material))

        carteira.garantir_saldo(acao)
        texto = self._provedor.gerar_texto(self._prompt_descricao(material)).strip()
        carteira.debitar(acao, referencia=f'MAT-{material.cd_mat}' if material.cd_mat else 'MAT-NOVO')
        return texto

    def buscar_semanticamente(self, termo: str, empresa) -> list[Anuncio]:
        """Anúncios ativos de outras empresas, na ordem de relevância definida pela IA."""
        anuncios = list(self._anuncios_disponiveis(empresa))
        if not anuncios:
            return []

        resposta = self._provedor.gerar_json(self._prompt_busca(termo, anuncios))
        ids = resposta.get('resultados', []) if isinstance(resposta, dict) else []

        por_id = {a.nr_anuncio: a for a in anuncios}
        return [por_id[i] for i in ids if i in por_id]

    def atualizar_interesses(self, empresa, termo: str) -> str:
        """Atualiza as tags de interesse da empresa a partir da nova pesquisa."""
        bruto = self._provedor.gerar_texto(self._prompt_interesses(empresa.interesses_ia or '', termo))
        tags = bruto.strip().replace('"', '').replace('\n', '')[:LIMITE_INTERESSES]

        empresa.interesses_ia = tags
        empresa.save(update_fields=['interesses_ia'])
        return tags

    # ── Consultas ─────────────────────────────────────────────────────

    @staticmethod
    def _anuncios_disponiveis(empresa):
        Anuncio.objects.inativar_vencidos()
        return (
            Anuncio.objects.filter(ie_status=Anuncio.STATUS_ATIVO)
            .exclude(cd_pessoa_anunciante=empresa)
            .select_related('cd_mat', 'cd_pessoa_anunciante')
        )

    @staticmethod
    def _nome_material(material) -> str:
        return material.ds_mat or material.cd_tuss

    # ── Prompts ───────────────────────────────────────────────────────

    def _prompt_descricao(self, material) -> str:
        return f"""
Você escreve a descrição de anúncios de uma plataforma B2B em que hospitais repassam insumos
excedentes para outras instituições de saúde, evitando desperdício.

Item anunciado:
- Insumo: {self._nome_material(material)}
- Categoria: {material.ds_tipo or 'Não informada'}
- Unidade de venda: {material.unidade_med or 'unidade'}

Escreva a descrição seguindo EXATAMENTE este formato, em português do Brasil:

Parágrafo 1 (1 a 2 frases): o que está sendo repassado e para que serve na rotina hospitalar.
Parágrafo 2 (1 a 2 frases): estado do produto (embalagem original lacrada, armazenado conforme
as recomendações do fabricante) e que está disponível para repasse a outra instituição.

Regras:
- Separe os dois parágrafos com uma linha em branco.
- No máximo 450 caracteres no total.
- Tom formal, direto e objetivo, sem exageros ("ostensivo", "máxima", "excelência" etc.).
- NÃO cite quantidade, lote, validade, marca nem preço: esses dados já aparecem no anúncio.
- NÃO use título, letras maiúsculas para destaque, listas, marcadores, emojis nem markdown.
- NÃO cite o nome do hospital ofertante nem invente informações que não foram dadas.
- Responda apenas com a descrição.
"""

    def _prompt_busca(self, termo: str, anuncios: list[Anuncio]) -> str:
        catalogo = json.dumps([self._resumo_anuncio(a) for a in anuncios], ensure_ascii=False)
        return f"""Você é o motor de busca inteligente do MedConnect, uma plataforma B2B de materiais e medicamentos hospitalares.

O usuário está buscando: "{termo}"

Catálogo de anúncios ativos:
{catalogo}

Sua tarefa:
1. Analise a intenção de busca do usuário
2. Considere sinônimos médicos e hospitalares (ex: "soro" = "solução fisiológica", "EPI" = "luva, máscara, avental")
3. Interprete linguagem natural e coloquial
4. Considere nomes comerciais e genéricos de medicamentos
5. Retorne os IDs dos anúncios mais relevantes, ordenados do mais ao menos relevante

Retorne APENAS um JSON válido no formato:
{{"resultados": [id1, id2, id3, ...]}}

Regras:
- Retorne no máximo {LIMITE_RESULTADOS_BUSCA} resultados
- Se nenhum anúncio for relevante, retorne {{"resultados": []}}
- NÃO inclua explicações, apenas o JSON"""

    @staticmethod
    def _resumo_anuncio(a: Anuncio) -> dict:
        # Sem imagens, para economizar tokens
        return {
            'id': a.nr_anuncio,
            'nome': a.cd_mat.ds_mat or a.cd_mat.cd_tuss,
            'marca': a.cd_mat.ds_marca or 'N/A',
            'categoria': a.cd_mat.ds_tipo or 'N/A',
            'unidade': a.cd_mat.unidade_med or 'unidade',
            'quantidade': a.qtd_mat,
            'valor': str(a.val_base),
            'lote': a.ds_lote or '',
            'validade': str(a.dt_validade) if a.dt_validade else '',
            'descricao': a.ds_obs[:200] if a.ds_obs else '',
            'anunciante': a.cd_pessoa_anunciante.razao_social or a.cd_pessoa_anunciante.nm_pessoaj,
        }

    @staticmethod
    def _prompt_interesses(interesses_atuais: str, termo: str) -> str:
        return f"""
        Você é um assistente de IA que extrai interesses de busca.
        O usuário (hospital/empresa) está navegando em uma plataforma B2B de saúde.

        Tags de interesse atuais: "{interesses_atuais}"
        Nova pesquisa do usuário: "{termo}"

        Baseado nisso, atualize as tags de interesse do usuário dando prioridade aos itens mais recentes pesquisados.
        Retorne APENAS uma lista de até 6 palavras-chave simples, separadas por vírgula.
        Não inclua aspas, parênteses, explicações ou texto extra.
        Exemplo de resposta: luva, seringa, anestésico, cateter, gaze, bisturi
        """
