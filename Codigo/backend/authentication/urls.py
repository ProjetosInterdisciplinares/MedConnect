from django.urls import path
from .views import login, register
from .utils import password_reset

urlpatterns = [
    path('login', login, name='login'),
    path('register', register, name='register'),
    path('password-reset', password_reset, name='password-reset'),
]