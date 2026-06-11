from django.db import models

class TipoMatMed(models.Model):
    TIPOS = [
        ('MD01', 'MD01'),
        ('MT01', 'MT01'),
        ('PD01', 'PD01'),
    ]
    
    DESCRICOES = {
        'MD01': 'MEDICAMENTO',
        'MT01': 'MATERIAL',
        'PD01': 'PRODUTO',
    }
    
    cd_tipo = models.CharField(
        primary_key=True,
        max_length=10,
        choices=TIPOS,
        blank=False,
        null=False
    )
    ds_tipo = models.CharField(max_length=50, blank=False, null=False)

    def save(self, *args, **kwargs):
        self.ds_tipo = self.DESCRICOES.get(self.cd_tipo, '')
        super().save(*args, **kwargs)

    def __str__(self):
        return self.ds_tipo
    
#class TipoMatMed(models.Model):
#    cd_tipo= models.IntegerField(primary_key=True, blank=False, null= False)
#    ds_tipo = models.CharField(blank=False, null= False)
      
#    def __str__(self):
#        return str(self.ds_tipo)
    