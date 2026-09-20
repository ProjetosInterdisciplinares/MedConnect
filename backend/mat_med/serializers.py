from rest_framework import serializers
from mat_med.models import MatMed

class MatMedSerializer(serializers.ModelSerializer):
    marca_nome = serializers.CharField(source='ds_marca.ds_marca', read_only=True)
    
    class Meta:
        model = MatMed
        fields = '__all__'