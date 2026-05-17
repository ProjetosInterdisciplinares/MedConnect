from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from tipo_matmed.models import TipoMatMed
from tipo_matmed.serializers import TipoMatMedSerializer

class TipoMatMedCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset =  TipoMatMed.objects.all()
    serializer_class = TipoMatMedSerializer
    
class TipoMatMedRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = TipoMatMed.objects.all()
    serializer_class = TipoMatMedSerializer