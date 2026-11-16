from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password

from pessoa_juridica.cnpj import limpar_cnpj
from pessoa_juridica.models import PessoaJuridica
from pessoa_juridica.serializers import CadastroEmpresaSerializer


@api_view(['POST'])
def login(request):
    cnpj = request.data.get('cnpj')
    password = request.data.get('password')

    if not cnpj or not password:
        return Response(
            {"error": "CNPJ e senha são obrigatórios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = PessoaJuridica.objects.filter(nr_cnpj=limpar_cnpj(cnpj)).first()

    if not user:
        return Response(
            {"error": "Credenciais inválidas"},
            status=status.HTTP_401_UNAUTHORIZED
        )
        
    # Verifica a senha criptografada.
    if not check_password(password, user.senha_pj):
        return Response(
            {"error": "Credenciais inválidas"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    if user.status == "PENDENTE":
        return Response(
            {
                "error": "Sua empresa ainda está aguardando aprovação."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if user.status == "BLOQUEADA":
        return Response(
            {
                "error": "Sua empresa está bloqueada."
            },
            status=status.HTTP_403_FORBIDDEN
        )
    # A empresa não é um User do Django, por isso o token é montado à mão
    refresh = RefreshToken()
    refresh["cnpj"] = user.nr_cnpj
    refresh["id"] = user.cd_pessoaj
    refresh["name"] = user.nm_pessoaj
    refresh["is_admin"] = user.is_admin

    return Response({
    "id": user.cd_pessoaj,
    "cnpj": user.nr_cnpj,
    "is_admin": user.is_admin,
    "access": str(refresh.access_token),
    "refresh": str(refresh),
    })

@api_view(['POST'])
def register(request):

    obrigatorios = ('nm_pessoaj', 'email_pj', 'senha_pj', 'resp_tec', 'nr_cnpj', 'razao_social')
    if not all(request.data.get(campo) for campo in obrigatorios):
        return Response({"error": "Todos os campos são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

    dados = {**request.data, 'nr_cnpj': limpar_cnpj(request.data.get('nr_cnpj'))}

    if PessoaJuridica.objects.filter(nr_cnpj=dados['nr_cnpj']).exists():
        return Response({"error": "CNPJ já cadastrado"}, status=status.HTTP_400_BAD_REQUEST)

    # Grava todos os dados do formulário (inclusive telefone e endereço); a senha vai com hash
    serializer = CadastroEmpresaSerializer(data=dados)
    if not serializer.is_valid():
        campo, mensagens = next(iter(serializer.errors.items()))
        return Response(
            {"error": f"{campo}: {mensagens[0]}", "detalhes": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    empresa = serializer.save()

    return Response(
        {
            "message": "Solicitação enviada com sucesso",
            "id": empresa.cd_pessoaj,
            "status": empresa.status
        },
        status=status.HTTP_201_CREATED
    )