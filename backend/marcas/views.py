from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from marcas.models import Marcas
from marcas.serializers import MarcasSerializer

class MarcasCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset =  Marcas.objects.all()
    serializer_class = MarcasSerializer
    
class MarcasRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Marcas.objects.all()
    serializer_class = MarcasSerializer