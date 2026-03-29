from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .forms import CadastroForm, LoginForm


def cadastro_view(request):          # RF01
    if request.method == 'POST':
        form = CadastroForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('login')
    else:
        form = CadastroForm()
    return render(request, 'empresas/cadastro.html', {'form': form})


def login_view(request):             # RF04
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            empresa = authenticate(
                request,
                cnpj=form.cleaned_data['cnpj'],
                password=form.cleaned_data['senha']
            )
            if empresa:
                login(request, empresa,
                      backend='empresas.backends.CNPJBackend')
                return redirect('dashboard')
            form.add_error(None, 'CNPJ ou senha inválidos.')
    else:
        form = LoginForm()
    return render(request, 'empresas/login.html', {'form': form})


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def dashboard_view(request):
    return render(request, 'empresas/dashboard.html')