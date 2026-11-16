from django.urls import include, path
from rest_framework.routers import DefaultRouter

from notificacoes import views

router = DefaultRouter()
router.register(r'alertas', views.AlertaInteresseViewSet, basename='alerta-interesse')

urlpatterns = [
    path('', include(router.urls)),
    path('notificacoes/', views.NotificacoesView.as_view(), name='notificacoes'),
    path('notificacoes/lidas/', views.MarcarTodasLidasView.as_view(), name='notificacoes-marcar-todas'),
    path('notificacoes/<int:pk>/lida/', views.MarcarNotificacaoLidaView.as_view(), name='notificacao-marcar-lida'),
]
