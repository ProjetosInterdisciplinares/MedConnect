from rest_framework import serializers
from anuncio.models import Anuncio, Negociacao

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
    anunciante_email = serializers.CharField(
        source="cd_pessoa_anunciante.email_pj",
        read_only=True
    )
    anunciante_telefone = serializers.CharField(
        source="cd_pessoa_anunciante.telefone",
        read_only=True
    )

    class Meta:
        model = Anuncio
        fields = "__all__"
        read_only_fields = ["data_anuncio"]

class NegociacaoSerializer(serializers.ModelSerializer):
    anuncio_nome = serializers.CharField(
        source="anuncio.cd_mat.ds_mat",
        read_only=True
    )
    vendedor_nome = serializers.CharField(
        source="vendedor.razao_social",
        read_only=True
    )
    vendedor_email = serializers.CharField(
        source="vendedor.email_pj",
        read_only=True
    )
    vendedor_telefone = serializers.CharField(
        source="vendedor.telefone",
        read_only=True
    )
    comprador_nome = serializers.CharField(
        source="comprador.razao_social",
        read_only=True
    )
    comprador_email = serializers.CharField(
        source="comprador.email_pj",
        read_only=True
    )
    comprador_telefone = serializers.CharField(
        source="comprador.telefone",
        read_only=True
    )
    anuncio_val_base = serializers.DecimalField(
        source="anuncio.val_base",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    anuncio_qtd = serializers.IntegerField(
        source="anuncio.qtd_mat",
        read_only=True
    )
    anuncio_lote = serializers.CharField(
        source="anuncio.ds_lote",
        read_only=True
    )

    class Meta:
        model = Negociacao
        fields = "__all__"
        read_only_fields = ["data_proposta", "comprador"]