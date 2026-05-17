from rest_framework import serializers
from tipo_matmed.models import TipoMatMed
class TipoMatMedSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoMatMed
        fields = '__all__'