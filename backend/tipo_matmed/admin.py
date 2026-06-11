from django.contrib import admin
from tipo_matmed.models import TipoMatMed

class TipoMatMedAdmin(admin.ModelAdmin):
    list_display =('cd_tipo','ds_tipo',)
    search_fields = ('ds_tipo',)

admin.site.register(TipoMatMed, TipoMatMedAdmin)

#Para o tipo espera-se que seja buscado pela descrição, exemplo: 

#MEDICAMENTO = MEDICAMENTO  | cd_tipo = MD01
#SERINGA, LUVA  = MATERIAL  | cd_tipo = MT01
#ÁLCOOL = PRODUTO           | cd_tipo = PD01


