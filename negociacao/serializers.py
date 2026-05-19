from rest_framework import serializers
from negociacao.models import Negociacao

class NegociacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Negociacao
        fields = '__all__'