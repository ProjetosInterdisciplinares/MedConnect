from rest_framework import response, status, views

from pessoa_juridica.permissions import IsAdminUserPJ
from statistics_api.painel import PainelIndicadoresFacade


class ApiStatsView(views.APIView):
    """GET: indicadores do painel administrativo (somente admin)."""
    permission_classes = (IsAdminUserPJ,)

    def get(self, request):
        return response.Response(PainelIndicadoresFacade().resumo(), status=status.HTTP_200_OK)
