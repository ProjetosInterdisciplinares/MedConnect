from django.urls import path
from . import views

urlpatterns = [
    path('lote/', views.LoteCreateListView.as_view(), name='lote-create-list'),
    path('lote/<int:pk>', views.LoteRetrieveUpdateDestroy.as_view(), name='lote-detail-view'),
]