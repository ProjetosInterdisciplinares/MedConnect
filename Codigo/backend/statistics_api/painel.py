"""
PainelIndicadoresFacade — padrão Facade.

Reúne as consultas do painel administrativo. A view pede resumo() e não
conhece os models consultados. Cada grupo de indicadores é um método.
Usa apenas dados registrados; nada é estimado.
"""
from collections import Counter
from datetime import date, datetime, timedelta

from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek, TruncYear
from django.utils import timezone

from anuncio.models import Anuncio, Negociacao
from creditos.models import TransacaoCredito
from creditos.services import REFERENCIA_BOAS_VINDAS
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica

MESES_HISTORICO = 6


class PainelIndicadoresFacade:

    def resumo(self) -> dict:
        anuncios = self._anuncios_por_status()
        return {
            'controle': self.indicadores_controle(),
            'total_matmeds': MatMed.objects.count(),
            'total_pessoas_juridicas': PessoaJuridica.objects.count(),
            'total_negociacoes': self._total_negociacoes_aprovadas(),
            'anuncios_ativos': anuncios.get(Anuncio.STATUS_ATIVO, 0),
            'anuncios_negociacao': anuncios.get(Anuncio.STATUS_NEGOCIACAO, 0),
            'anuncios_finalizados': anuncios.get(Anuncio.STATUS_FINALIZADO, 0),
            'anuncios_inativos': anuncios.get(Anuncio.STATUS_INATIVO, 0),
            'volume_financeiro': float(self._volume_financeiro()),
            'receita_creditos': float(self._compras().aggregate(t=Sum('valor_pago'))['t'] or 0),
            'creditos_consumidos': TransacaoCredito.objects.filter(
                tipo=TransacaoCredito.TIPO_CONSUMO).aggregate(t=Sum('quantidade'))['t'] or 0,
            'total_propostas': Negociacao.objects.count(),
            'historico': self._historico_mensal(),
            'historico_rendas': self._historico_receitas(),
        }

    def indicadores_controle(self) -> dict:
        """Indicadores operacionais da aba "Controle"."""
        empresas = PessoaJuridica.objects.filter(is_admin=False)
        status_empresas = dict(empresas.values_list('status').annotate(n=Count('cd_pessoaj')))
        status_propostas = dict(Negociacao.objects.values_list('status').annotate(n=Count('id')))
        # Aceitas = todas que o vendedor aceitou, concluídas ou não
        aceitas = sum(status_propostas.get(s, 0) for s in Negociacao.STATUS_COM_CONTATOS)
        respondidas = aceitas + status_propostas.get(Negociacao.STATUS_RECUSADA, 0)

        tempo_resposta = Negociacao.objects.filter(data_resposta__isnull=False).aggregate(
            media=Avg(ExpressionWrapper(F('data_resposta') - F('data_proposta'), output_field=DurationField()))
        )['media']

        hoje = date.today()
        return {
            'empresas_aprovadas': status_empresas.get('ATIVA', 0),
            'empresas_pendentes': status_empresas.get('PENDENTE', 0),
            'empresas_bloqueadas': status_empresas.get('BLOQUEADA', 0),
            'empresas_sem_anuncio': empresas.filter(status='ATIVA').annotate(n=Count('anuncios')).filter(n=0).count(),
            'propostas_total': sum(status_propostas.values()),
            'propostas_pendentes': status_propostas.get('P', 0),
            'propostas_aceitas': aceitas,
            'propostas_recusadas': status_propostas.get('R', 0),
            'propostas_canceladas': status_propostas.get('C', 0),
            'propostas_expiradas': status_propostas.get(Negociacao.STATUS_EXPIRADA, 0),
            'propostas_concluidas': status_propostas.get(Negociacao.STATUS_CONCLUIDA, 0),
            'propostas_nao_concluidas': status_propostas.get(Negociacao.STATUS_NAO_CONCLUIDA, 0),
            'taxa_aceite': round(aceitas / respondidas * 100, 1) if respondidas else None,
            'tempo_medio_resposta_horas': round(tempo_resposta.total_seconds() / 3600, 1) if tempo_resposta else None,
            'anuncios_vencendo_30d': Anuncio.objects.filter(
                ie_status=Anuncio.STATUS_ATIVO, dt_validade__isnull=False,
                dt_validade__gte=hoje, dt_validade__lte=hoje + timedelta(days=30),
            ).count(),
            # Produto mais procurado ≈ material com mais propostas recebidas
            'top_materiais_propostas': self._top_materiais(Negociacao.objects.all(), 'anuncio__cd_mat', 'id'),
            'top_materiais_anunciados': self._top_materiais(Anuncio.objects.all(), 'cd_mat', 'nr_anuncio'),
            'top_interesses': self._top_interesses(empresas),
            'creditos_boas_vindas': TransacaoCredito.objects.filter(
                tipo=TransacaoCredito.TIPO_BONUS, referencia=REFERENCIA_BOAS_VINDAS,
            ).aggregate(t=Sum('quantidade'))['t'] or 0,
            'creditos_expirados': TransacaoCredito.objects.filter(
                tipo=TransacaoCredito.TIPO_EXPIRACAO).aggregate(t=Sum('quantidade'))['t'] or 0,
        }

    # ── Consultas ─────────────────────────────────────────────────────

    @staticmethod
    def _anuncios_por_status() -> dict:
        return dict(Anuncio.objects.values_list('ie_status').annotate(n=Count('nr_anuncio')))

    @staticmethod
    def _finalizados_sem_negociacao():
        # Anúncios fechados antes do fluxo de Negociacao existir
        return Anuncio.objects.filter(ie_status=Anuncio.STATUS_FINALIZADO, negociacoes__isnull=True)

    def _volume_financeiro(self):
        # Só conta como venda o que foi concluído (entrega e recebimento confirmados)
        novos = Negociacao.objects.filter(status=Negociacao.STATUS_CONCLUIDA).aggregate(t=Sum('val_proposta'))['t'] or 0
        antigos = self._finalizados_sem_negociacao().aggregate(t=Sum('val_aceito'))['t'] or 0
        return novos + antigos

    def _total_negociacoes_aprovadas(self) -> int:
        return (Negociacao.objects.filter(status=Negociacao.STATUS_CONCLUIDA).count()
                + self._finalizados_sem_negociacao().count())

    @staticmethod
    def _compras():
        return TransacaoCredito.objects.filter(
            tipo=TransacaoCredito.TIPO_COMPRA, status=TransacaoCredito.STATUS_APROVADA,
        )

    @staticmethod
    def _top_materiais(qs, campo_mat, campo_contagem):
        # Agrupa pelo produto (nome + TUSS): cada instituição cadastra a própria cópia do insumo
        return [
            {'nome': row['mat_nome'] or row['mat_tuss'] or 'Material sem nome', 'total': row['total']}
            for row in qs.values(mat_nome=F(f'{campo_mat}__ds_mat'), mat_tuss=F(f'{campo_mat}__cd_tuss'))
                         .annotate(total=Count(campo_contagem))
                         .order_by('-total', 'mat_nome')[:5]
        ]

    @staticmethod
    def _top_interesses(empresas):
        # Interesses inferidos pela IA a partir das buscas (aproximação)
        contador = Counter()
        textos = empresas.exclude(interesses_ia__isnull=True).exclude(interesses_ia='').values_list('interesses_ia', flat=True)
        for texto in textos:
            for tag in {t.strip().lower() for t in texto.split(',') if t.strip()}:
                contador[tag] += 1
        return [{'nome': nome, 'total': total} for nome, total in contador.most_common(5)]

    # ── Séries históricas ─────────────────────────────────────────────

    @staticmethod
    def _meses_recentes(agora: datetime) -> list[tuple[int, int]]:
        meses = []
        for atras in range(MESES_HISTORICO - 1, -1, -1):
            mes, ano = agora.month - atras, agora.year
            while mes <= 0:
                mes += 12
                ano -= 1
            meses.append((ano, mes))
        return meses

    def _historico_mensal(self) -> list[dict]:
        agora = timezone.now()
        meses = self._meses_recentes(agora)
        inicio = datetime(meses[0][0], meses[0][1], 1, tzinfo=agora.tzinfo)

        historico = {f'{m:02d}/{a}': {'name': f'{m:02d}/{a}', 'anuncios': 0, 'propostas': 0} for a, m in meses}

        series = (
            ('anuncios', Anuncio.objects.filter(data_anuncio__gte=inicio.date()), 'data_anuncio', 'nr_anuncio'),
            ('propostas', Negociacao.objects.filter(data_proposta__gte=inicio), 'data_proposta', 'id'),
        )
        for chave, qs, campo_data, campo_id in series:
            por_mes = qs.annotate(month=TruncMonth(campo_data)).values('month').annotate(count=Count(campo_id))
            for item in por_mes:
                if item['month']:
                    nome = f"{item['month'].month:02d}/{item['month'].year}"
                    if nome in historico:
                        historico[nome][chave] = item['count']

        return list(historico.values())

    def _historico_receitas(self) -> dict:
        hoje = timezone.now()
        periodos = {
            'diario': (TruncDay, timedelta(days=14), '%d/%m'),
            'semanal': (TruncWeek, timedelta(weeks=8), 'Sem %W/%Y'),
            'mensal': (TruncMonth, timedelta(days=365), '%m/%Y'),
            'anual': (TruncYear, timedelta(days=365 * 5), '%Y'),
        }
        historico = {}
        for nome, (truncar, janela, formato) in periodos.items():
            serie = (
                self._compras().filter(data_transacao__gte=hoje - janela)
                .annotate(periodo=truncar('data_transacao')).values('periodo')
                .annotate(total=Sum('valor_pago')).order_by('periodo')
            )
            historico[nome] = [
                {'name': item['periodo'].strftime(formato), 'valor': float(item['total'] or 0)}
                for item in serie if item['periodo']
            ]
        return historico
