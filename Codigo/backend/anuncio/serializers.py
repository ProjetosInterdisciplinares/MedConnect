from rest_framework import serializers
from anuncio.models import Anuncio

class AnuncioSerializer(serializers.ModelSerializer):
    material_nome = serializers.CharField(
        source="cd_mat.ds_mat",
        read_only=True
    )
    anunciante_razao = serializers.CharField(
        source="cd_pessoa_anunciante.razao_social",
        read_only=True
    )
    anunciante_lat = serializers.FloatField(
        source="cd_pessoa_anunciante.latitude",
        read_only=True
    )
    anunciante_lon = serializers.FloatField(
        source="cd_pessoa_anunciante.longitude",
        read_only=True
    )
    anunciante_cidade = serializers.CharField(
        source="cd_pessoa_anunciante.cidade",
        read_only=True
    )
    anunciante_estado = serializers.CharField(
        source="cd_pessoa_anunciante.estado",
        read_only=True
    )
    anunciante_logradouro = serializers.CharField(
        source="cd_pessoa_anunciante.logradouro",
        read_only=True
    )
    anunciante_numero = serializers.CharField(
        source="cd_pessoa_anunciante.numero",
        read_only=True
    )
    anunciante_bairro = serializers.CharField(
        source="cd_pessoa_anunciante.bairro",
        read_only=True
    )
    anunciante_cep = serializers.CharField(
        source="cd_pessoa_anunciante.cep",
        read_only=True
    )

    class Meta:
        model = Anuncio
        fields = "__all__"
        read_only_fields = ["data_anuncio"]