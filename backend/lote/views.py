from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from lote.models import Lote
from lote.serializers import LoteSerializer
from django.utils import timezone

class LoteCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = LoteSerializer

    def get_queryset(self):
        hoje = timezone.now().date()

        return Lote.objects.filter(
            ie_status="A",
            dt_validade__gte=hoje
        )

class LoteRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer