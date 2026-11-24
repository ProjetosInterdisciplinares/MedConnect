"""
Análise de estoque — padrão Facade.

As views chamam apenas AnaliseEstoqueFacade. Ela esconde a leitura da
planilha, o motor estatístico, a IA (com plano B quando ela falha), a
cobrança de créditos e o histórico.
"""
import hashlib
import logging
import re
from dataclasses import dataclass, field

from django.db import transaction
from django.utils import timezone

from creditos.acoes import AnalisarEstoqueIA
from creditos.carteira import CarteiraCreditos
from estoque_ia.analise import HORIZONTE_PADRAO_DIAS, MotorAnaliseEstoque, comparar_com_anterior, fmt_data
from estoque_ia.assistente import AnalistaEstoqueIA
from estoque_ia.leitor import Alerta, LeitorPlanilhaEstoque
from estoque_ia.models import AnaliseEstoque
from estoque_ia.tipos import normalizar
from anuncio.publicacao.erros import PublicacaoInvalidaError
from anuncio.publicacao.facade import AnuncioFacade
from gemini_api.provedores import ErroProvedorIA, IAIndisponivelError, IANaoConfiguradaError
from mat_med.models import MatMed

logger = logging.getLogger(__name__)


class AnaliseEstoqueFacade:

    def __init__(self, empresa, analista: AnalistaEstoqueIA | None = None):
        self._empresa = empresa
        self._analista = analista
        self._carteira = CarteiraCreditos(empresa)

    # ── Nova análise ──────────────────────────────────────────────────

    def analisar(self, arquivo, nome_arquivo: str, horizonte_dias: int = HORIZONTE_PADRAO_DIAS) -> AnaliseEstoque:
        """
        Lê a planilha, calcula, consulta a IA e salva no histórico.
        Lança SaldoInsuficienteError (antes de ler o arquivo) e PlanilhaEstoqueInvalidaError.
        A falha da IA não impede a análise: o resultado estatístico é salvo e nada é cobrado.
        """
        acao = AnalisarEstoqueIA(nome_arquivo[:80])
        self._carteira.garantir_saldo(acao)

        hash_arquivo = self._hash(arquivo)
        leitura = LeitorPlanilhaEstoque(arquivo, nome_arquivo).ler()
        resultado = MotorAnaliseEstoque(horizonte_dias).analisar(leitura)

        resumo, recomendacoes, ia_utilizada = '', [], False
        if AnalistaEstoqueIA.candidatos(resultado):
            try:
                resumo, recomendacoes = (self._analista or AnalistaEstoqueIA()).enriquecer(resultado)
                ia_utilizada = True
            except IANaoConfiguradaError:
                logger.error('IA sem chave configurada (GEMINI_API_KEY/GOOGLE_API_KEY): análise só estatística')
                resultado.alertas.insert(0, self._alerta_sem_ia(
                    'não está configurado neste servidor (chave da API ausente)'))
            except IAIndisponivelError:
                logger.warning('IA indisponível na análise de estoque', exc_info=True)
                resultado.alertas.insert(0, self._alerta_sem_ia('está com alta demanda no momento'))
            except ErroProvedorIA:
                logger.exception('Falha da IA na análise de estoque')
                resultado.alertas.insert(0, self._alerta_sem_ia('não respondeu como esperado'))

        # Reenvio da mesma planilha (mesmo horizonte): substitui a análise antiga em vez de duplicar
        repetidas = list(self.historico().filter(hash_arquivo=hash_arquivo, horizonte_dias=resultado.horizonte_dias))
        if repetidas:
            self._herdar_publicacoes(resultado.itens, repetidas)
            resultado.alertas.append(Alerta(
                'info', 'Planilha já analisada',
                f'Esta mesma planilha já tinha sido analisada em {fmt_data(repetidas[0].criado_em.date())}. '
                'A análise anterior foi substituída por esta, e os anúncios já publicados continuam marcados.',
            ).como_dict())

        anterior = self.historico().exclude(pk__in=[a.pk for a in repetidas]).first()
        if anterior:
            recorrentes = comparar_com_anterior(resultado.itens, anterior.itens, anterior.criado_em.date().isoformat())
            if recorrentes:
                resultado.alertas.append(Alerta(
                    'info', 'Sobras recorrentes',
                    f'{recorrentes} item(ns) já tinham sobra na análise de {fmt_data(anterior.criado_em.date())} '
                    'e continuam sobrando. Vale priorizar o anúncio deles.',
                ).como_dict())

        ordem = {'critico': 0, 'aviso': 1, 'info': 2}
        resultado.alertas.sort(key=lambda a: ordem.get(a['nivel'], 3))  # estável: mantém a ordem dentro do nível

        with transaction.atomic():
            creditos = 0
            if ia_utilizada:
                self._carteira.debitar(acao, referencia=f'ESTOQUE-{resultado.periodo_fim:%Y%m%d}')
                creditos = acao.custo()
            analise = AnaliseEstoque.objects.create(
                empresa=self._empresa,
                nome_arquivo=nome_arquivo[:255],
                periodo_inicio=resultado.periodo_inicio,
                periodo_fim=resultado.periodo_fim,
                dias_periodo=resultado.dias_periodo,
                horizonte_dias=resultado.horizonte_dias,
                total_movimentacoes=resultado.indicadores['total_movimentacoes'],
                total_materiais=resultado.indicadores['total_materiais'],
                total_sugeridos=resultado.indicadores['total_sugeridos'],
                ia_utilizada=ia_utilizada,
                creditos_cobrados=creditos,
                resumo_ia=resumo,
                recomendacoes=recomendacoes,
                indicadores=resultado.indicadores,
                alertas=resultado.alertas,
                itens=resultado.itens,
                analise_anterior=anterior,
                hash_arquivo=hash_arquivo,
            )
            AnaliseEstoque.objects.filter(pk__in=[a.pk for a in repetidas]).delete()
            self._limitar_historico()
        return analise

    @staticmethod
    def _hash(arquivo) -> str:
        sha = hashlib.sha256()
        if hasattr(arquivo, 'seek'):
            arquivo.seek(0)
        if hasattr(arquivo, 'chunks'):
            for parte in arquivo.chunks():
                sha.update(parte)
        else:
            sha.update(arquivo.read())
        if hasattr(arquivo, 'seek'):
            arquivo.seek(0)
        return sha.hexdigest()

    @staticmethod
    def _herdar_publicacoes(itens: list[dict], repetidas: list[AnaliseEstoque]) -> None:
        """Os anúncios já publicados a partir da análise substituída continuam marcados na nova."""
        publicados = {}
        for antiga in reversed(repetidas):  # da mais antiga para a mais recente
            publicados.update({i['chave']: i['publicado'] for i in antiga.itens if i.get('publicado')})
        for item in itens:
            if item['chave'] in publicados:
                item['publicado'] = publicados[item['chave']]

    @staticmethod
    def _alerta_sem_ia(motivo: str) -> dict:
        return Alerta(
            'aviso', 'Análise feita sem a IA',
            f'O serviço de inteligência artificial {motivo}. Mostramos a análise estatística do seu estoque e '
            'nenhum crédito foi cobrado. Tente de novo em alguns minutos para receber as justificativas da IA.',
        ).como_dict()

    # ── Histórico ─────────────────────────────────────────────────────

    def historico(self):
        return AnaliseEstoque.objects.filter(empresa=self._empresa)

    def obter(self, pk: int) -> AnaliseEstoque:
        return self.historico().get(pk=pk)

    def excluir(self, pk: int) -> None:
        self.obter(pk).delete()

    def _limitar_historico(self) -> None:
        antigas = self.historico().values_list('pk', flat=True)[AnaliseEstoque.LIMITE_POR_EMPRESA:]
        AnaliseEstoque.objects.filter(pk__in=list(antigas)).delete()

    # ── Publicação das sugestões ──────────────────────────────────────

    def publicar_sugestoes(self, pk: int, itens: list) -> list:
        """
        Publica, em uma transação, os anúncios configurados a partir das sugestões da análise.
        Cada item: {chave, insumo: {cd_mat | dados do novo insumo}, anuncio: {...}}. Insumos que não
        existem são cadastrados na hora (mesmas regras do cadastro em massa). A análise registra o
        que foi publicado, para o histórico mostrar o que já virou anúncio.
        Lança EntradaVaziaError, SaldoInsuficienteError e PublicacaoInvalidaError.
        """
        analise = self.obter(pk)
        itens = itens if isinstance(itens, list) else []
        self._garantir_insumos_vinculados(analise, itens)
        lote = [{'insumo': i.get('insumo'), 'anuncio': i.get('anuncio')} if isinstance(i, dict) else {} for i in itens]
        chaves = [i.get('chave') if isinstance(i, dict) else None for i in itens]
        with transaction.atomic():
            anuncios = AnuncioFacade(self._empresa).publicar_lote(lote)
            por_chave = {i['chave']: i for i in analise.itens}
            for chave, anuncio in zip(chaves, anuncios):
                if chave in por_chave:
                    por_chave[chave]['publicado'] = {
                        'nr_anuncio': anuncio.nr_anuncio,
                        'qtd_mat': anuncio.qtd_mat,
                        'cd_mat': anuncio.cd_mat_id,
                        'data': timezone.localdate().isoformat(),
                    }
            analise.save(update_fields=['itens'])
        return anuncios

    def _garantir_insumos_vinculados(self, analise: AnaliseEstoque, itens: list) -> None:
        """
        O insumo de cada sugestão não pode ser trocado: item vinculado a um insumo cadastrado só
        publica com ele, e item sem vínculo só publica como insumo novo (que o TUSS pode reaproveitar).
        """
        localizar = self.localizador_de_insumos()
        por_chave = {i['chave']: i for i in analise.itens}
        invalidos = []
        for indice, item in enumerate(itens):
            item = item if isinstance(item, dict) else {}
            sugestao = por_chave.get(item.get('chave'))
            if sugestao is None:
                invalidos.append(_ItemRecusado(indice, ['Item não pertence a esta análise.']))
                continue
            vinculado = localizar(sugestao)
            insumo = item.get('insumo') if isinstance(item.get('insumo'), dict) else {}
            informado = insumo.get('cd_mat')
            if vinculado and str(informado) != str(vinculado['cd_mat']):
                invalidos.append(_ItemRecusado(indice, [
                    f"Este material está vinculado ao insumo '{vinculado['ds_mat']}' e não pode ser trocado."]))
            elif not vinculado and informado:
                invalidos.append(_ItemRecusado(indice, [
                    'Este material não tem insumo vinculado: publique como insumo novo (o TUSS reaproveita um já cadastrado).']))
        if invalidos:
            raise PublicacaoInvalidaError(invalidos)

    # ── Ligação com os insumos cadastrados ────────────────────────────

    def localizador_de_insumos(self):
        """
        Função item → insumo já cadastrado (dict) ou None, para anunciar o item.
        Tenta, em ordem: código do item igual a TUSS/SIMPRO/Brasíndice, nome igual e nome
        igual ignorando observações entre parênteses (ex.: "(caixa c/ 50)").
        """
        por_id, por_codigo, por_nome, por_nome_base = {}, {}, {}, {}
        campos = ('cd_mat', 'ds_mat', 'ds_tipo', 'ds_marca', 'unidade_med', 'cd_tuss', 'cd_simpro', 'cd_brasindice')
        for material in MatMed.objects.filter(ds_pessoaj=self._empresa).values(*campos):
            por_id[material['cd_mat']] = material
            for codigo in (material['cd_tuss'], material['cd_simpro'], material['cd_brasindice']):
                if codigo:
                    por_codigo.setdefault(str(codigo).strip(), material)
            if material['ds_mat']:
                por_nome.setdefault(normalizar(material['ds_mat']), material)
                por_nome_base.setdefault(_nome_base(material['ds_mat']), material)

        def localizar(item: dict) -> dict | None:
            publicado = (item.get('publicado') or {}).get('cd_mat')  # insumo usado na publicação
            return (por_id.get(publicado)
                    or por_codigo.get(item.get('codigo') or '')
                    or por_nome.get(normalizar(item['descricao']))
                    or por_nome_base.get(_nome_base(item['descricao'])))
        return localizar


@dataclass
class _ItemRecusado:
    indice: int
    erros: list[str] = field(default_factory=list)


def _nome_base(nome: str) -> str:
    return normalizar(re.sub(r'\([^)]*\)', ' ', nome or ''))
