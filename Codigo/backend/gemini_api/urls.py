from django.urls import path
from .views import GerarDescricaoAnuncioView, BuscaSemanticaView, AtualizarInteressesView

urlpatterns = [
    path('gerar-anuncio/', GerarDescricaoAnuncioView.as_view(), name='api_gerar_anuncio'),
    path('busca-semantica/', BuscaSemanticaView.as_view(), name='api_busca_semantica'),
    path('atualizar-interesses/', AtualizarInteressesView.as_view(), name='api_atualizar_interesses'),
]