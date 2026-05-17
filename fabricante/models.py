from django.db import models

class Fabricante(models.Model):
    cd_fabricante = models.AutoField(primary_key=True)
    ds_fabricante = models.CharField(max_length= 255, blank=False, null= False)
    cnpj_fabri = models.CharField(max_length=18, blank=False, null=False, unique=True)

    def __str__(self):
        return str(self.ds_fabricante)
    