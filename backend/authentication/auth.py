from rest_framework_simplejwt.authentication import JWTAuthentication
from pessoa_juridica.models import PessoaJuridica
from rest_framework.exceptions import AuthenticationFailed

class CustomJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):
        print("TOKEN:", validated_token)

        try:
            user_id = validated_token["id"]

            print("USER_ID:", user_id)

            user = PessoaJuridica.objects.get(cd_pessoaj=user_id)

            print("USER:", user)

            return user

        except PessoaJuridica.DoesNotExist:
            print("USUARIO NAO ENCONTRADO")
            raise AuthenticationFailed("Usuário não encontrado")