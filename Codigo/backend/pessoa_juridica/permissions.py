from rest_framework.permissions import SAFE_METHODS, BasePermission


def _eh_admin(user) -> bool:
    return bool(user and user.is_authenticated and getattr(user, 'is_admin', False))


class IsAdminUserPJ(BasePermission):
    """Somente empresas administradoras do MedConnect."""
    message = 'Acesso negado'

    def has_permission(self, request, view):
        return _eh_admin(request.user)


class IsPropriaEmpresaOuAdmin(BasePermission):
    """A empresa só lê e altera o próprio cadastro; o admin acessa todos."""

    def has_object_permission(self, request, view, obj):
        return _eh_admin(request.user) or obj.pk == request.user.pk


class IsDonoOuSomenteLeitura(BasePermission):
    """Qualquer empresa logada lê; somente o dono altera ou remove."""
    campo_dono = 'ds_pessoaj_id'

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, self.campo_dono) == request.user.pk
