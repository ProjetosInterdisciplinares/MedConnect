from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from negociacao.models import Negociacao
from negociacao.serializers import NegociacaoSerializer

class NegocicaoCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset =  Negociacao.objects.all()
    serializer_class = NegociacaoSerializer

class NegociacaoRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Negociacao.objects.all()
    serializer_class = NegociacaoSerializer