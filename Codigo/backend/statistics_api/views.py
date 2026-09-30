from rest_framework import views, response, status
from rest_framework.permissions import IsAuthenticated
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from anuncio.models import Anuncio, Negociacao
from datetime import datetime

class ApiStatsView(views.APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if not getattr(request.user, 'is_admin', False):
            return response.Response({"erro": "Acesso negado"}, status=status.HTTP_403_FORBIDDEN)
            
        anuncios_ativos = Anuncio.objects.filter(ie_status='A').count()
        anuncios_negociacao = Anuncio.objects.filter(ie_status='N').count()
        anuncios_finalizados = Anuncio.objects.filter(ie_status='F').count()
        anuncios_inativos = Anuncio.objects.filter(ie_status='I').count()
        
        # Volume Financeiro (Anúncios finalizados)
        volume_financeiro = Anuncio.objects.filter(ie_status='F').aggregate(
            total=Sum('val_aceito')
        )['total'] or 0

        # Total de propostas criadas
        total_propostas = Negociacao.objects.count()

        # Dados Históricos (Últimos 6 meses)
        now = datetime.now()
        
        # Calcular data de 6 meses atrás (primeiro dia do mês)
        m = now.month - 5
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        six_months_ago = datetime(y, m, 1)

        # Anúncios por Mês
        anuncios_hist = Anuncio.objects.filter(data_anuncio__gte=six_months_ago)\
            .annotate(month=TruncMonth('data_anuncio'))\
            .values('month')\
            .annotate(count=Count('nr_anuncio'))\
            .order_by('month')
            
        # Propostas por Mês
        propostas_hist = Negociacao.objects.filter(data_proposta__gte=six_months_ago)\
            .annotate(month=TruncMonth('data_proposta'))\
            .values('month')\
            .annotate(count=Count('id'))\
            .order_by('month')

        # Formatar histórico para o frontend (preenchendo meses vazios)
        historico_dict = {}
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            month_str = f"{month:02d}/{year}"
            historico_dict[month_str] = {'name': month_str, 'anuncios': 0, 'propostas': 0}

        for item in anuncios_hist:
            if item['month']:
                month_str = f"{item['month'].month:02d}/{item['month'].year}"
                if month_str in historico_dict:
                    historico_dict[month_str]['anuncios'] = item['count']

        for item in propostas_hist:
            if item['month']:
                month_str = f"{item['month'].month:02d}/{item['month'].year}"
                if month_str in historico_dict:
                    historico_dict[month_str]['propostas'] = item['count']

        return response.Response(data={
            'total_matmeds':           MatMed.objects.count(),
            'total_pessoas_juridicas': PessoaJuridica.objects.count(),
            'total_negociacoes':       anuncios_finalizados,
            'anuncios_ativos': anuncios_ativos,
            'anuncios_negociacao': anuncios_negociacao,
            'anuncios_finalizados': anuncios_finalizados,
            'anuncios_inativos': anuncios_inativos,
            'volume_financeiro': float(volume_financeiro),
            'total_propostas': total_propostas,
            'historico': list(historico_dict.values()),
        }, status=status.HTTP_200_OK)