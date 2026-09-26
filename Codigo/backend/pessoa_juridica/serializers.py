from rest_framework import serializers
from pessoa_juridica.models import PessoaJuridica

class PessoaJuridicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PessoaJuridica
        fields = '__all__'
        extra_kwargs = {
            'senha_pj': {'write_only': True}
        }

    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password
        if 'senha_pj' in validated_data:
            validated_data['senha_pj'] = make_password(validated_data['senha_pj'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.auth.hashers import make_password
        if 'senha_pj' in validated_data:
            # Se for uma atualização de senha explícita
            validated_data['senha_pj'] = make_password(validated_data['senha_pj'])
        return super().update(instance, validated_data)