from django.urls import path
from . import views

urlpatterns = [
    path('creditos/pacotes/', views.PacotesCreditoListView.as_view(), name='creditos-pacotes'),
    path('creditos/saldo/', views.SaldoCreditosView.as_view(), name='creditos-saldo'),
    path('creditos/extrato/', views.ExtratoCreditosView.as_view(), name='creditos-extrato'),
    path('creditos/comprar/', views.ComprarCreditosView.as_view(), name='creditos-comprar'),
]
