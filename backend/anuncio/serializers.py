from rest_framework import serializers
from anuncio.models import Anuncio

class AnuncioSerializer(serializers.ModelSerializer):
    material_nome = serializers.CharField(
        source="cd_mat.ds_mat",
        read_only=True
    )

    class Meta:
        model = Anuncio
        fields = "__all__"
        read_only_fields = ["data_anuncio"]