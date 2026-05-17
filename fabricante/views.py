from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from fabricante.models import Fabricante
from fabricante.serializers import FabricanteSerializer

class FabricanteCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Fabricante.objects.all()
    serializer_class = FabricanteSerializer

class FabricanteRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Fabricante.objects.all()
    serializer_class = FabricanteSerializer