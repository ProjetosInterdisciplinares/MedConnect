from rest_framework import serializers
from marcas.models import Marcas

class MarcasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marcas
        fields = '__all__'