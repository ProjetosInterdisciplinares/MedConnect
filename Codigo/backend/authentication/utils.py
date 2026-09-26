from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from pessoa_juridica.models import PessoaJuridica


@api_view(['POST'])
def password_reset(request):
    """
    Redefine a senha de uma PessoaJuridica 
    verificando CNPJ + email cadastrado.
    """
    cnpj = request.data.get('cnpj', '').replace(".", "").replace("/", "").replace("-", "")
    email = request.data.get('email', '').strip().lower()
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not all([cnpj, email, new_password, confirm_password]):
        return Response(
            {"error": "Todos os campos são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if new_password != confirm_password:
        return Response(
            {"error": "As senhas não coincidem."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 8:
        return Response(
            {"error": "A senha deve ter pelo menos 8 caracteres."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        empresa = PessoaJuridica.objects.get(
            nr_cnpj=cnpj,
            email_pj__iexact=email
        )
    except PessoaJuridica.DoesNotExist:
        return Response(
            {"error": "CNPJ ou e-mail não encontrado no sistema."},
            status=status.HTTP_404_NOT_FOUND
        )

    from django.contrib.auth.hashers import make_password
    empresa.senha_pj = make_password(new_password)
    empresa.save()

    return Response(
        {"detail": "Senha redefinida com sucesso!"},
        status=status.HTTP_200_OK
    )