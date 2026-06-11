from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from pessoa_juridica.models import PessoaJuridica


@api_view(['POST'])
def login(request):
    cnpj = request.data.get('cnpj')
    password = request.data.get('password')

    if not cnpj or not password:
        return Response(
            {"error": "CNPJ e senha são obrigatórios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # remove máscara do CNPJ
    cnpj = cnpj.replace(".", "").replace("/", "").replace("-", "")

    # busca no banco
    user = PessoaJuridica.objects.filter(
        nr_cnpj=cnpj,
        senha_pj=password
    ).first()

    if not user:
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
    # ❌ NÃO usar for_user (não existe User padrão no seu model)
    refresh = RefreshToken()
    
    # payload customizado
    refresh["cnpj"] = user.nr_cnpj
    refresh["id"] = user.cd_pessoaj
    refresh["name"] = user.nm_pessoaj

    return Response({
    "id": user.cd_pessoaj,
    "cnpj": user.nr_cnpj,
    "access": str(refresh.access_token),
    "refresh": str(refresh),
    })

@api_view(['POST'])
def register(request):

    nm_pessoaj = request.data.get('nm_pessoaj')
    email_pj = request.data.get('email_pj')
    senha_pj = request.data.get('senha_pj')
    resp_tec = request.data.get('resp_tec')
    nr_cnpj = request.data.get('nr_cnpj')
    razao_social = request.data.get('razao_social')

    if not all([
        nm_pessoaj,
        email_pj,
        senha_pj,
        resp_tec,
        nr_cnpj,
        razao_social
    ]):
        return Response(
            {
                "error": "Todos os campos são obrigatórios"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    nr_cnpj = (
        nr_cnpj
        .replace(".", "")
        .replace("/", "")
        .replace("-", "")
    )

    if PessoaJuridica.objects.filter(
        nr_cnpj=nr_cnpj
    ).exists():
        return Response(
            {
                "error": "CNPJ já cadastrado"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    empresa = PessoaJuridica.objects.create(
        nm_pessoaj=nm_pessoaj,
        email_pj=email_pj,
        senha_pj=senha_pj,
        resp_tec=resp_tec,
        nr_cnpj=nr_cnpj,
        razao_social=razao_social,
        status="PENDENTE"
    )

    return Response(
        {
            "message": "Solicitação enviada com sucesso",
            "id": empresa.cd_pessoaj,
            "status": empresa.status
        },
        status=status.HTTP_201_CREATED
    )