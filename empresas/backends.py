import re
from django.contrib.auth.backends import BaseBackend
from .models import Empresa


class CNPJBackend(BaseBackend):
    def authenticate(self, request, cnpj=None, password=None, **kwargs):
        if not cnpj:
            return None
        cnpj_limpo = re.sub(r'\D', '', cnpj)
        try:
            empresa = Empresa.objects.get(cnpj=cnpj_limpo)
        except Empresa.DoesNotExist:
            return None
        if empresa.check_password(password) and empresa.ativo:
            return empresa
        return None

    def get_user(self, user_id):
        try:
            return Empresa.objects.get(pk=user_id)
        except Empresa.DoesNotExist:
            return None