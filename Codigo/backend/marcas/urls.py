from django.urls import path
from . import views

urlpatterns = [
    path('marcas/', views.MarcasCreateListView.as_view(), name='marcas-create-list'),
    path('marcas/<int:pk>', views.MarcasRetrieveUpdateDestroy.as_view(), name='marcas-detail-view'),
]