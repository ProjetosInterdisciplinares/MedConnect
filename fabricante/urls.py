from django.urls import path
from . import views

urlpatterns = [
    path('fabricante/', views.FabricanteCreateListView.as_view(), name='fabricante-create-list'),
    path('fabricante/<int:pk>', views.FabricanteRetrieveUpdateDestroy.as_view(), name='fabricante-detail-view'),
]