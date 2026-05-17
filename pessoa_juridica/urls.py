from django.urls import path
from . import views

urlpatterns = [
    path('pessoa_juridica/', views.PessoaJuridicaCreateListView.as_view(), name='pessoa_juridica-create-list'),
    path('pessoa_juridica/<int:pk>', views.PessoaJuridicaRetrieveUpdateDestroy.as_view(), name='pessoa_juridica-detail-view'),
]