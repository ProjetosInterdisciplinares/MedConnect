from django.urls import path
from . import views

urlpatterns = [
    path("mat_med/meus-materiais/", views.meus_materiais, name="meus-materiais"),

    path("mat_med/", views.MatMedCreateListView.as_view(), name="mat_med-create-list"),
    path("mat_med/<int:pk>", views.MatMedRetrieveUpateDestroyView.as_view(), name="mat_med-detail-view"),
]