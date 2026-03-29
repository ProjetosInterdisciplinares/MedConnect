from django.contrib import admin
from django.urls import path
from django.contrib.auth import views as auth_views
from empresas import views

urlpatterns = [
    path('admin/', admin.site.urls),

    path('',           views.dashboard_view, name='dashboard'),
    path('cadastro/',  views.cadastro_view,  name='cadastro'),
    path('login/',     views.login_view,     name='login'),
    path('logout/',    views.logout_view,    name='logout'),

    # RF05 — recuperação de senha 
    path('senha/recuperar/',
        auth_views.PasswordResetView.as_view(
            template_name='empresas/senha_recuperar.html',
            email_template_name='empresas/email_recuperar.html',
            success_url='/senha/enviado/'
        ), name='password_reset'),

    path('senha/enviado/',
        auth_views.PasswordResetDoneView.as_view(
            template_name='empresas/senha_enviado.html'
        ), name='password_reset_done'),

    path('senha/redefinir///',
        auth_views.PasswordResetConfirmView.as_view(
            template_name='empresas/senha_redefinir.html',
            success_url='/login/'
        ), name='password_reset_confirm'),
]