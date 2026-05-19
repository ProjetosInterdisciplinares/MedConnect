from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from anuncio.models import Anuncio
from anuncio.serializers import AnuncioSerializer


class AnuncioCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Anuncio.objects.all()
    serializer_class = AnuncioSerializer


class AnuncioRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Anuncio.objects.all()
    serializer_class = AnuncioSerializer
    lookup_field = 'nr_anuncio'
    
class AnuncioCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = AnuncioSerializer

    def get_queryset(self):
        status = self.request.query_params.get('status', 'A')
        return Anuncio.objects.filter(ie_status=status)