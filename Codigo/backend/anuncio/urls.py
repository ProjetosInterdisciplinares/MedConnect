from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import bulk_views

router = DefaultRouter()
router.register(r'negociacoes', views.NegociacaoViewSet, basename='negociacao')

urlpatterns = [
    path('', include(router.urls)),
    path("anuncio/meus-anuncios/", views.meus_anuncios, name="meus-anuncios"),
    path("anuncio/minhas-compras/", views.minhas_compras, name="minhas-compras"),
    path('anuncio/', views.AnuncioCreateListView.as_view(), name='anuncio-create-list'),
    path('anuncio/<int:nr_anuncio>/', views.AnuncioRetrieveUpdateDestroy.as_view(), name='anuncio-detail-view'),

    # Bulk upload endpoints
    path('anuncio/bulk/template/', bulk_views.download_template, name='anuncio-bulk-template'),
    path('anuncio/bulk/validate/', bulk_views.validate_bulk_upload, name='anuncio-bulk-validate'),
    path('anuncio/bulk/publish/', bulk_views.publish_bulk_ads, name='anuncio-bulk-publish'),
]