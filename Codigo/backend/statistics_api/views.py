from rest_framework import views, response, status
from rest_framework.permissions import IsAuthenticated
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica
from anuncio.models import Anuncio

class ApiStatsView(views.APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return response.Response(data={
            'total_matmeds':           MatMed.objects.count(),
            'total_pessoas_juridicas': PessoaJuridica.objects.count(),
            'total_negociacoes':       Anuncio.objects.filter(ie_status='F').count(),
        }, status=status.HTTP_200_OK)