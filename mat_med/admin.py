from django.contrib import admin
from mat_med.models import MatMed

class MatMedAdmin(admin.ModelAdmin):
    list_display =('cd_mat','ds_mat',)
    search_fields = ('ds_mat',)

admin.site.register(MatMed, MatMedAdmin)

#Para o MatMed espera que ele seja buscado pela descrição, exemplo: Agulha HiPodérmica Descartável 20x0,55 Descarpack 100 Unid
