from django.urls import path

from estoque_ia import views

urlpatterns = [
    path('estoque-ia/modelo/', views.baixar_modelo, name='estoque-ia-modelo'),
    path('estoque-ia/exemplo/<str:tipo>/', views.baixar_exemplo, name='estoque-ia-exemplo'),
    path('estoque-ia/analisar/', views.analisar, name='estoque-ia-analisar'),
    path('estoque-ia/analises/', views.listar, name='estoque-ia-analises'),
    path('estoque-ia/analises/<int:pk>/', views.detalhe, name='estoque-ia-analise'),
    path('estoque-ia/analises/<int:pk>/relatorio/', views.relatorio, name='estoque-ia-relatorio'),
    path('estoque-ia/analises/<int:pk>/publicar/', views.publicar, name='estoque-ia-publicar'),
]
