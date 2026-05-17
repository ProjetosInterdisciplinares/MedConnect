from django.urls import path
from .views import GerarDescricaoNegociacaoView

urlpatterns = [
    path('gerar-anuncio/', GerarDescricaoNegociacaoView.as_view(), name='api_gerar_anuncio'),
]