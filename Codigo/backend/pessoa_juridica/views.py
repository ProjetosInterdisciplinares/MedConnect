from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from pessoa_juridica.models import PessoaJuridica
from pessoa_juridica.serializers import PessoaJuridicaSerializer
from rest_framework.views import APIView
from rest_framework.response import Response

class PessoaJuridicaCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset =  PessoaJuridica.objects.all()
    serializer_class = PessoaJuridicaSerializer
    
class PessoaJuridicaRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = PessoaJuridica.objects.all()
    serializer_class = PessoaJuridicaSerializer

class MinhaPessoaJuridicaView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = PessoaJuridicaSerializer(request.user)
        return Response(serializer.data)

from rest_framework.permissions import BasePermission

class IsAdminUserPJ(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'is_admin', False))

class AdminPessoaJuridicaListView(generics.ListAPIView):
    queryset = PessoaJuridica.objects.all().order_by('-cd_pessoaj')
    serializer_class = PessoaJuridicaSerializer
    permission_classes = [IsAdminUserPJ]

class AdminPessoaJuridicaUpdateView(generics.UpdateAPIView):
    queryset = PessoaJuridica.objects.all()
    serializer_class = PessoaJuridicaSerializer
    permission_classes = [IsAdminUserPJ]