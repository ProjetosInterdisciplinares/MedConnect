from django.urls import path
from . import views

urlpatterns = [
    path('negociacao/', views.NegocicaoCreateListView.as_view(), name='negociacao-create-list'),
    path('negociacao/<int:pk>', views.NegociacaoRetrieveUpdateDestroy.as_view(), name='negociacao-detail-view'),
]