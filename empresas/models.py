import re
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser, BaseUserManager, PermissionsMixin
)

class EmpresaManager(BaseUserManager):
    def create_user(self, cnpj, password=None, **extra_fields):
        if not cnpj:
            raise ValueError('O CNPJ é obrigatório')
        cnpj = re.sub(r'\D', '', cnpj)
        user = self.model(cnpj=cnpj, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, cnpj, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(cnpj, password, **extra_fields)


class Empresa(AbstractBaseUser, PermissionsMixin):
    cnpj         = models.CharField(max_length=14, unique=True)
    razao_social = models.CharField(max_length=255)
    email        = models.EmailField(unique=True)
    ativo        = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    criado_em    = models.DateTimeField(auto_now_add=True)

    groups = models.ManyToManyField(
        'auth.Group',
        blank=True,
        related_name='empresa_set',     
        verbose_name='groups'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        blank=True,
        related_name='empresa_set',     
        verbose_name='user permissions'
    )

    USERNAME_FIELD  = 'cnpj'
    REQUIRED_FIELDS = ['razao_social', 'email']

    objects = EmpresaManager()

    def __str__(self):
        return f'{self.razao_social} ({self.cnpj})'

    @property
    def is_active(self):
        return self.ativo