import re
from django import forms
from validate_docbr import CNPJ
from .models import Empresa


class CadastroForm(forms.ModelForm):
    senha  = forms.CharField(widget=forms.PasswordInput, label='Senha')
    senha2 = forms.CharField(widget=forms.PasswordInput, label='Confirmar senha')

    class Meta:
        model  = Empresa
        fields = ['cnpj', 'razao_social', 'email']
        labels = {
            'cnpj': 'CNPJ',
            'razao_social': 'Razão Social',
            'email': 'E-mail',
        }

    def clean_cnpj(self):              # RF02 — validação dos dígitos
        cnpj_raw   = self.cleaned_data.get('cnpj', '')
        cnpj_limpo = re.sub(r'\D', '', cnpj_raw)
        if not CNPJ().validate(cnpj_limpo):
            raise forms.ValidationError('CNPJ inválido.')
        if Empresa.objects.filter(cnpj=cnpj_limpo).exists():  # RF03
            raise forms.ValidationError('CNPJ já cadastrado.')
        return cnpj_limpo              # salva sem máscara

    def clean(self):
        cleaned = super().clean()
        if cleaned.get('senha') != cleaned.get('senha2'):
            raise forms.ValidationError('As senhas não coincidem.')
        return cleaned

    def save(self, commit=True):
        empresa = super().save(commit=False)
        empresa.set_password(self.cleaned_data['senha'])
        if commit:
            empresa.save()
        return empresa


class LoginForm(forms.Form):
    cnpj  = forms.CharField(label='CNPJ', max_length=18)
    senha = forms.CharField(widget=forms.PasswordInput, label='Senha')