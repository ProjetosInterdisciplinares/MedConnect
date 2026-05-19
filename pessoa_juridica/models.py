from django.db import models
from fabricante.models import Fabricante

class PessoaJuridica(models.Model):
    cd_pessoaj = models.AutoField(primary_key=True)
    nm_pessoaj = models.CharField(blank=False, null= False)
    email_pj = models.CharField(blank=False, null= False)
    senha_pj = models.CharField(blank=False, null= False)
    resp_tec = models.CharField(blank=False, null= False)
    nr_cnpj = models.CharField(max_length=18, blank=False, null=False, unique=True)
    razao_social = models.CharField(blank=False, null= False)
        
    def __str__(self):
        return str(self.nm_pessoaj)