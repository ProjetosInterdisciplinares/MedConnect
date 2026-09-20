from django.urls import path
from . import views

urlpatterns = [
    path('tipo_matmed/', views.TipoMatMedCreateListView.as_view(), name='tipo_matmed-create-list'),
    path('tipo_matmed/<int:pk>', views.TipoMatMedRetrieveUpdateDestroy.as_view(), name='tipo_matmed-detail-view'),
]