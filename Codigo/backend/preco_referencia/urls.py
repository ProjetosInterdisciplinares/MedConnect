from django.urls import path

from . import views

urlpatterns = [
    path('catmat/sugestoes/', views.SugestoesCatmatView.as_view(), name='catmat-sugestoes'),
    path('preco-referencia/', views.ConsultaPrecoReferenciaView.as_view(), name='preco-referencia'),
]
