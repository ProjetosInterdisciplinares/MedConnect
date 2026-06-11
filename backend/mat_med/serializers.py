from rest_framework import serializers
from mat_med.models import MatMed

class MatMedSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatMed
        fields = '__all__'