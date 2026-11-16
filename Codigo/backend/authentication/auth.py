from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from pessoa_juridica.models import PessoaJuridica


class CustomJWTAuthentication(JWTAuthentication):
    """
    O token identifica a empresa pelo claim "id". Empresas bloqueadas perdem
    o acesso na hora, mesmo que ainda tenham um token válido.
    """

    def get_user(self, validated_token):
        try:
            empresa = PessoaJuridica.objects.get(cd_pessoaj=validated_token['id'])
        except (KeyError, PessoaJuridica.DoesNotExist):
            raise AuthenticationFailed('Usuário não encontrado')

        if empresa.is_bloqueada:
            raise AuthenticationFailed('Sua empresa está bloqueada.')
        return empresa
