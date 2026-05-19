from django.db import models
from marcas.models import Marcas
from tipo_matmed.models import TipoMatMed
from pessoa_juridica.models import PessoaJuridica

class MatMed(models.Model):
    cd_mat = models.AutoField(primary_key=True)
    ds_mat = models.CharField(blank=False, null= False)
    
    ds_marca = models.ForeignKey(Marcas, on_delete=models.RESTRICT, related_name='materiais')
    
    ds_tipo = models.ForeignKey(TipoMatMed, on_delete=models.RESTRICT, related_name='materiais')
    
    ds_pessoaj = models.ForeignKey(PessoaJuridica, on_delete=models.RESTRICT, related_name='materiais')
    
    
    
    def __str__(self):
        return str(self.ds_mat)
    