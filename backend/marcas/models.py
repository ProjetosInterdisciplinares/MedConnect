from django.db import models

class Marcas(models.Model):
    cd_marca = models.AutoField(primary_key=True)
    ds_marca = models.CharField(blank=False, null= False)
    
    class Meta:
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'

    def __str__(self):
        return str(self.ds_marca)
    
    