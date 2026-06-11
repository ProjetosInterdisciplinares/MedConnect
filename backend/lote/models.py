from django.db import models
from fabricante.models import Fabricante
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica

class Lote(models.Model):
    STATUS_CHOICES = [
        ('A', 'Ativo'),
        ('I', 'Inativo'),
    ]
    
    nr_lote = models.AutoField(primary_key=True)
    ds_lote = models.CharField(max_length=20)    #esse é o lote do material
    dt_fabricacao = models.DateTimeField()
    dt_validade = models.DateField()
    qtd_lote = models.IntegerField()
    unidade_med = models.CharField(max_length=20)
    ie_status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='A')
    
    fabricante = models.ForeignKey(Fabricante, on_delete=models.RESTRICT, related_name='lotes')
    cd_material = models.ForeignKey(MatMed, on_delete=models.RESTRICT, related_name='lotes')
    cd_pessoaj = models.ForeignKey(PessoaJuridica, on_delete=models.RESTRICT, related_name='pessoas_jur')
    
    
    def __str__(self):
        return str (self.nr_lote)
    