from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from statistics_api.views import ApiStatsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/medconnect/', include('fabricante.urls')),
    path('api/medconnect/', include('lote.urls')),
    path('api/medconnect/', include('marcas.urls')),
    path('api/medconnect/', include('mat_med.urls')),
    path('api/medconnect/', include('negociacao.urls')),
    path('api/medconnect/', include('pessoa_juridica.urls')),
    path('api/medconnect/', include('tipo_matmed.urls')),
    path('api/medconnect/', include('gemini_api.urls')),

    path('authentication/token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('authentication/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('authentication/token/verify/', TokenVerifyView.as_view(), name='token-verify'),

    path('statistics/', ApiStatsView.as_view(), name='stats-view'),
]