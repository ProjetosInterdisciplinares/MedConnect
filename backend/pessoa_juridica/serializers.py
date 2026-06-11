from rest_framework import serializers
from pessoa_juridica.models import PessoaJuridica

class PessoaJuridicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PessoaJuridica
        fields = '__all__'