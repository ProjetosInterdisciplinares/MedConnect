from django.utils import timezone
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
    is_recommended = serializers.BooleanField(
        read_only=True,
        default=False
    )

    class Meta:
        model = Anuncio
        fields = "__all__"
        # Campos de negociação são controlados exclusivamente pelo fluxo de Negociacao
        read_only_fields = [
            "data_anuncio",
            "val_proposta",
            "val_aceito",
            "cd_pessoa_compradora",
        ]

    def validate_ie_status(self, value):
        # Criação: sempre ativo
        if self.instance is None:
            return 'A'
        atual = self.instance.ie_status
        if value == atual:
            return value
        # O anunciante só pode alterar entre Ativo, Inativo e Saldo de Venda; N e F pertencem à negociação
        if atual in ('A', 'I', 'S') and value in ('A', 'I', 'S'):
            return value
        raise serializers.ValidationError(
            "O status do anúncio só pode ser alterado entre Ativo, Inativo e Saldo de Venda; "
            "negociações são gerenciadas em /negociacoes/."
        )

    def validate(self, attrs):
        # Com proposta em andamento (N) ou negócio fechado (F), dados comerciais ficam congelados
        if self.instance is not None and self.instance.ie_status in ('N', 'F'):
            for campo in ('qtd_mat', 'val_base', 'cd_mat'):
                if campo in attrs and attrs[campo] != getattr(self.instance, campo):
                    raise serializers.ValidationError(
                        "Não é possível alterar quantidade, valor ou material "
                        "de um anúncio em negociação ou finalizado."
                    )
        return attrs

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
        read_only_fields = ["data_proposta", "data_resposta", "comprador", "vendedor"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # ── Atualização: apenas mudança de status por quem tem permissão ──
        if self.instance is not None:
            extras = set(attrs) - {"status"}
            if extras:
                raise serializers.ValidationError(
                    "Somente o status da negociação pode ser alterado."
                )
            novo = attrs.get("status")
            if novo not in ("A", "R", "C"):
                raise serializers.ValidationError({"status": "Status inválido."})
            if self.instance.status != "P":
                raise serializers.ValidationError(
                    "Esta proposta já foi respondida e não pode ser alterada."
                )
            if novo in ("A", "R") and self.instance.vendedor_id != user.pk:
                raise serializers.ValidationError(
                    "Somente o vendedor pode aceitar ou recusar a proposta."
                )
            if novo == "C" and self.instance.comprador_id != user.pk:
                raise serializers.ValidationError(
                    "Somente o comprador pode cancelar a própria proposta."
                )
            return attrs

        # ── Criação: abertura de negociação / envio de proposta ──
        # O status inicial é sempre Pendente; o cliente não pode defini-lo.
        attrs.pop("status", None)
        anuncio = attrs["anuncio"]

        if anuncio.cd_pessoa_anunciante_id == user.pk:
            raise serializers.ValidationError(
                "Você não pode enviar proposta para o seu próprio anúncio."
            )
        if anuncio.ie_status != "A":
            raise serializers.ValidationError(
                "Este anúncio não está disponível para propostas."
            )
        if anuncio.dt_validade and anuncio.dt_validade < timezone.now().date():
            raise serializers.ValidationError("Este anúncio está com a validade expirada.")

        if attrs["val_proposta"] <= 0:
            raise serializers.ValidationError(
                {"val_proposta": "O valor da proposta deve ser maior que zero."}
            )

        qtd = attrs.get("qtd_proposta")
        if qtd is not None and not (1 <= qtd <= anuncio.qtd_mat):
            raise serializers.ValidationError(
                {"qtd_proposta": f"A quantidade deve estar entre 1 e {anuncio.qtd_mat}."}
            )
        # RF15: compra parcial obriga o comprador a sugerir um novo valor total
        if qtd is not None and qtd < anuncio.qtd_mat and attrs["val_proposta"] == anuncio.val_base:
            raise serializers.ValidationError(
                {"val_proposta": "Ao comprar uma quantidade parcial, informe um novo valor "
                                 "total diferente do valor do anúncio."}
            )
        return attrs