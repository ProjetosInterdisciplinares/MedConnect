from django.urls import path
from . import views
from . import bulk_views

urlpatterns = [
    path("anuncio/meus-anuncios/", views.meus_anuncios, name="meus-anuncios"),
    path("anuncio/minhas-compras/", views.minhas_compras, name="minhas-compras"),
    path("anuncio/minhas-propostas/", views.minhas_propostas, name="minhas-propostas"),  # ← subiu
    path('anuncio/', views.AnuncioCreateListView.as_view(), name='anuncio-create-list'),
    path('anuncio/<int:nr_anuncio>/', views.AnuncioRetrieveUpdateDestroy.as_view(), name='anuncio-detail-view'),

    # Bulk upload endpoints
    path('anuncio/bulk/template/', bulk_views.download_template, name='anuncio-bulk-template'),
    path('anuncio/bulk/validate/', bulk_views.validate_bulk_upload, name='anuncio-bulk-validate'),
    path('anuncio/bulk/publish/', bulk_views.publish_bulk_ads, name='anuncio-bulk-publish'),
]