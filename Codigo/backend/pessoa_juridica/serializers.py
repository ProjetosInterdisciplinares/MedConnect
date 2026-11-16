"""
Serializers de empresa, separados por quem usa (segregação de interfaces):

- PerfilEmpresaSerializer: a própria empresa vê e edita os seus dados;
- AdminEmpresaSerializer: o admin também altera o status do credenciamento.

Nenhum dos dois permite alterar is_admin, saldo de créditos ou CNPJ.
"""
from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from pessoa_juridica.cnpj import limpar_cnpj, validar_cnpj
from pessoa_juridica.models import PessoaJuridica

CAMPOS = (
    'cd_pessoaj', 'nm_pessoaj', 'razao_social', 'nr_cnpj', 'email_pj', 'resp_tec', 'telefone',
    'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
    'latitude', 'longitude', 'imagem_perfil', 'status', 'is_admin', 'saldo_creditos',
    'interesses_ia', 'senha_pj',
)
SOMENTE_LEITURA = ('cd_pessoaj', 'nr_cnpj', 'status', 'is_admin', 'saldo_creditos', 'interesses_ia')
CAMPOS_CREDENCIAMENTO = ('cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'telefone')


class PerfilEmpresaSerializer(serializers.ModelSerializer):

    class Meta:
        model = PessoaJuridica
        fields = CAMPOS
        read_only_fields = SOMENTE_LEITURA
        extra_kwargs = {'senha_pj': {'write_only': True, 'required': False}}

    def validate(self, attrs):
        # Na edição parcial, só os campos enviados são conferidos
        faltando = [
            campo for campo in CAMPOS_CREDENCIAMENTO
            if (campo in attrs and not attrs[campo]) or (self.instance is None and not attrs.get(campo))
        ]
        if faltando:
            raise serializers.ValidationError(
                {campo: 'Este campo é obrigatório para o credenciamento.' for campo in faltando}
            )
        return attrs

    def create(self, validated_data):
        if 'senha_pj' in validated_data:
            validated_data['senha_pj'] = make_password(validated_data['senha_pj'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'senha_pj' in validated_data:
            validated_data['senha_pj'] = make_password(validated_data['senha_pj'])
        return super().update(instance, validated_data)


class CadastroEmpresaSerializer(PerfilEmpresaSerializer):
    """
    Solicitação de credenciamento (tela de cadastro). Grava todos os dados
    enviados, inclusive telefone e endereço. O status nasce PENDENTE.
    """

    class Meta(PerfilEmpresaSerializer.Meta):
        read_only_fields = tuple(campo for campo in SOMENTE_LEITURA if campo != 'nr_cnpj')
        extra_kwargs = {'senha_pj': {'write_only': True, 'required': True}}

    def validate_nr_cnpj(self, valor):
        if not validar_cnpj(valor):
            raise serializers.ValidationError('CNPJ inválido. Confira os números digitados.')
        return limpar_cnpj(valor)

    def to_internal_value(self, data):
        # O geocodificador devolve mais casas decimais do que o banco guarda (7)
        data = data.copy()
        for campo in ('latitude', 'longitude'):
            if data.get(campo) not in (None, ''):
                try:
                    data[campo] = round(float(data[campo]), 7)
                except (TypeError, ValueError):
                    data[campo] = None
        return super().to_internal_value(data)


class AdminEmpresaSerializer(PerfilEmpresaSerializer):

    class Meta(PerfilEmpresaSerializer.Meta):
        read_only_fields = tuple(campo for campo in SOMENTE_LEITURA if campo != 'status')
