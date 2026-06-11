from django.contrib import admin
from mat_med.models import MatMed

class MatMedAdmin(admin.ModelAdmin):
    list_display = ('cd_mat', 'ds_mat', 'cd_tuss', 'cd_simpro', 'cd_brasindice')
    search_fields = ('ds_mat', 'cd_tuss', 'cd_simpro', 'cd_brasindice')

admin.site.register(MatMed, MatMedAdmin)
# Para o MatMed espera que ele seja buscado pela descrição, exemplo: Agulha Hipodérmica Descartável 20x0,55 Descarpack 100 Unid
# Ou pelos códigos de referência: cd_tuss, cd_simpro, cd_brasindice


