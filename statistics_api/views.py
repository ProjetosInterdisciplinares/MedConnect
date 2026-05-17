from rest_framework import views, response, status
from rest_framework.permissions import IsAuthenticated
from fabricante.models import Fabricante
from lote.models import Lote
from marcas.models import Marcas
from mat_med.models import MatMed
from negociacao.models import Negociacao
from pessoa_juridica.models import PessoaJuridica
from tipo_matmed.models import TipoMatMed

class ApiStatsView(views.APIView):
    permission_classes = (IsAuthenticated,)
    
    def get(self, request):
        total_fabricantes = Fabricante.objects.count()
        total_lotes = Lote.objects.count()
        total_marcas = Marcas.objects.count()
        total_matmeds = MatMed.objects.count()
        total_negociacoes = Negociacao.objects.count()
        total_pessoas_juridicas = PessoaJuridica.objects.count()
        total_tipos_matmed = TipoMatMed.objects.count()

        return response.Response(data={
            'total_fabricantes': total_fabricantes,
            'total_lotes': total_lotes,
            'total_marcas': total_marcas,
            'total_matmeds': total_matmeds,
            'total_negociacoes': total_negociacoes,
            'total_pessoas_juridicas': total_pessoas_juridicas,
            'total_tipos_matmed': total_tipos_matmed,
        }, status=status.HTTP_200_OK,
        )