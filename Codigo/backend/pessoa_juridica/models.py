from django.db import models

class PessoaJuridica(models.Model):

    STATUS_CHOICES = [
        ("PENDENTE", "Pendente"),
        ("ATIVA", "Ativa"),
        ("BLOQUEADA", "Bloqueada"),
    ]

    cd_pessoaj = models.AutoField(primary_key=True)

    nm_pessoaj = models.CharField(blank=False, null=False)

    email_pj = models.CharField(blank=False, null=False)

    senha_pj = models.CharField(blank=False, null=False)

    resp_tec = models.CharField(blank=False, null=False)

    nr_cnpj = models.CharField(
        max_length=18,
        blank=False,
        null=False,
        unique=True
    )

    razao_social = models.CharField(
        blank=False,
        null=False
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDENTE"
    )

    imagem_perfil = models.TextField(blank=True, null=True)

    is_admin = models.BooleanField(default=False)

    cep = models.CharField(max_length=9, blank=True, null=True)
    logradouro = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    complemento = models.CharField(max_length=255, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(max_length=2, blank=True, null=True)
    
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    
    telefone = models.CharField(max_length=20, blank=True, null=True)

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return str(self.nm_pessoaj)