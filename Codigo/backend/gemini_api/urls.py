from django.urls import path
from .views import GerarDescricaoAnuncioView

urlpatterns = [
    path('gerar-anuncio/', GerarDescricaoAnuncioView.as_view(), name='api_gerar_anuncio'),
]