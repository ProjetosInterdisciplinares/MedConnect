from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from pessoa_juridica.models import PessoaJuridica
from pessoa_juridica.serializers import PessoaJuridicaSerializer

class PessoaJuridicaCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset =  PessoaJuridica.objects.all()
    serializer_class = PessoaJuridicaSerializer
    
class PessoaJuridicaRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = PessoaJuridica.objects.all()
    serializer_class = PessoaJuridicaSerializer