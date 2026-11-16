from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pessoa_juridica.models import PessoaJuridica
from pessoa_juridica.permissions import IsAdminUserPJ, IsPropriaEmpresaOuAdmin
from pessoa_juridica.serializers import AdminEmpresaSerializer, PerfilEmpresaSerializer
from pessoa_juridica.verificacao import VerificacaoCredenciamentoFacade


class PessoaJuridicaCreateListView(generics.ListCreateAPIView):
    """Cadastro direto e listagem de todas as empresas: somente admin."""
    permission_classes = (IsAdminUserPJ,)
    queryset = PessoaJuridica.objects.all()
    serializer_class = AdminEmpresaSerializer


class PessoaJuridicaRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    """A empresa vê e edita o próprio cadastro; remover é exclusivo do admin."""
    permission_classes = (IsAuthenticated, IsPropriaEmpresaOuAdmin)
    queryset = PessoaJuridica.objects.all()

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdminUserPJ()]
        return super().get_permissions()

    def get_serializer_class(self):
        return AdminEmpresaSerializer if getattr(self.request.user, 'is_admin', False) else PerfilEmpresaSerializer


class MinhaPessoaJuridicaView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(PerfilEmpresaSerializer(request.user).data)


class AdminPessoaJuridicaListView(generics.ListAPIView):
    queryset = PessoaJuridica.objects.all().order_by('-cd_pessoaj')
    serializer_class = AdminEmpresaSerializer
    permission_classes = (IsAdminUserPJ,)


class AdminPessoaJuridicaUpdateView(generics.UpdateAPIView):
    queryset = PessoaJuridica.objects.all()
    serializer_class = AdminEmpresaSerializer
    permission_classes = (IsAdminUserPJ,)


class VerificacaoCredenciamentoView(APIView):
    """
    GET: relatório de verificação do CNPJ da empresa (usa a última consulta guardada).
    POST: consulta a Receita Federal de novo e devolve o relatório atualizado.
    """
    permission_classes = (IsAdminUserPJ,)

    def get(self, request, pk):
        return self._relatorio(pk, atualizar=False)

    def post(self, request, pk):
        return self._relatorio(pk, atualizar=True)

    @staticmethod
    def _relatorio(pk, atualizar):
        empresa = get_object_or_404(PessoaJuridica, pk=pk)
        return Response(VerificacaoCredenciamentoFacade().verificar(empresa, atualizar=atualizar).como_dict())
