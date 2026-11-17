from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers
from anuncio.datas import hoje
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
    # E-mail e telefone do anunciante não são públicos: só são liberados
    # para o comprador depois que o vendedor aceita a proposta (NegociacaoSerializer).
    is_recommended = serializers.BooleanField(
        read_only=True,
        default=False
    )
    distancia_km = serializers.FloatField(
        read_only=True,
        default=None
    )

    class Meta:
        model = Anuncio
        fields = "__all__"
        # Campos de negociação são controlados exclusivamente pelo fluxo de Negociacao.
        # O anunciante é sempre a empresa logada (definido no servidor).
        read_only_fields = [
            "data_anuncio",
            "val_proposta",
            "val_aceito",
            "cd_pessoa_compradora",
            "cd_pessoa_anunciante",
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

    def to_representation(self, instance):
        dados = super().to_representation(instance)
        # O valor mínimo é estratégia do vendedor: só ele o vê
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if getattr(user, "pk", None) != instance.cd_pessoa_anunciante_id:
            dados.pop("val_minimo", None)
        return dados

    def validate_val_minimo(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("O valor mínimo deve ser maior que zero.")
        return value

    def validate_dt_validade(self, value):
        # Produto vencido não pode ser anunciado. Na edição, só checa se a data mudou.
        mudou = self.instance is None or value != self.instance.dt_validade
        if value and mudou and value < hoje():
            raise serializers.ValidationError("Produto vencido: a validade não pode ser anterior a hoje.")
        return value

    def validate(self, attrs):
        fabricacao = attrs.get('dt_fabricacao', getattr(self.instance, 'dt_fabricacao', None))
        validade = attrs.get('dt_validade', getattr(self.instance, 'dt_validade', None))
        if fabricacao and validade and validade < fabricacao:
            raise serializers.ValidationError(
                {"dt_validade": "A validade não pode ser anterior à data de fabricação."}
            )
        minimo = attrs.get('val_minimo', getattr(self.instance, 'val_minimo', None))
        base = attrs.get('val_base', getattr(self.instance, 'val_base', None))
        if minimo is not None and base is not None and minimo > base:
            raise serializers.ValidationError(
                {"val_minimo": "O valor mínimo não pode ser maior que o valor base."}
            )
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
    comprador_nome = serializers.CharField(
        source="comprador.razao_social",
        read_only=True
    )
    # Contatos: liberados para as duas partes só depois do aceite
    vendedor_email = serializers.SerializerMethodField()
    vendedor_telefone = serializers.SerializerMethodField()
    vendedor_responsavel = serializers.SerializerMethodField()
    comprador_email = serializers.SerializerMethodField()
    comprador_telefone = serializers.SerializerMethodField()
    comprador_responsavel = serializers.SerializerMethodField()

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    motivo_recusa_display = serializers.CharField(source="get_motivo_recusa_display", read_only=True, default=None)
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
    anuncio_descricao = serializers.CharField(
        source="anuncio.ds_obs",
        read_only=True
    )
    anuncio_unidade = serializers.CharField(
        source="anuncio.cd_mat.unidade_med",
        read_only=True,
        default=None
    )

    # Opções do saldo restante, enviadas pelo vendedor ao aceitar uma venda parcial
    CAMPOS_SALDO = ("reativar_saldo", "novo_val_base", "nova_descricao")
    reativar_saldo = serializers.BooleanField(write_only=True, required=False)
    novo_val_base = serializers.DecimalField(
        write_only=True, required=False, max_digits=10, decimal_places=2, min_value=Decimal("0.01")
    )
    nova_descricao = serializers.CharField(write_only=True, required=False, max_length=2000)

    class Meta:
        model = Negociacao
        fields = "__all__"
        read_only_fields = [
            "data_proposta", "data_resposta", "comprador", "vendedor",
            "prazo_resposta", "entregue_em", "recebido_em",
        ]

    # ── Contatos ──────────────────────────────────────────────────────

    @staticmethod
    def _liberado(obj, valor):
        return valor if obj.status in Negociacao.STATUS_COM_CONTATOS else None

    def get_vendedor_email(self, obj):
        return self._liberado(obj, obj.vendedor.email_pj)

    def get_vendedor_telefone(self, obj):
        return self._liberado(obj, obj.vendedor.telefone)

    def get_vendedor_responsavel(self, obj):
        return self._liberado(obj, obj.vendedor.resp_tec)

    def get_comprador_email(self, obj):
        return self._liberado(obj, obj.comprador.email_pj)

    def get_comprador_telefone(self, obj):
        return self._liberado(obj, obj.comprador.telefone)

    def get_comprador_responsavel(self, obj):
        return self._liberado(obj, obj.comprador.resp_tec)

    # ── Validação ─────────────────────────────────────────────────────

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # ── Atualização: apenas mudança de status por quem tem permissão ──
        if self.instance is not None:
            extras = set(attrs) - {"status", "motivo_recusa", "detalhe_recusa", *self.CAMPOS_SALDO}
            if extras:
                raise serializers.ValidationError(
                    "Somente o status da negociação pode ser alterado."
                )
            novo = attrs.get("status")
            if novo != "A" and any(campo in attrs for campo in self.CAMPOS_SALDO):
                raise serializers.ValidationError(
                    "As opções do saldo restante só valem ao aceitar a proposta."
                )
            if novo != "R" and ("motivo_recusa" in attrs or "detalhe_recusa" in attrs):
                raise serializers.ValidationError("O motivo só pode ser informado ao recusar a proposta.")
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
        for campo in (*self.CAMPOS_SALDO, "motivo_recusa", "detalhe_recusa"):
            attrs.pop(campo, None)
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
        qtd_efetiva = qtd or anuncio.qtd_mat
        if not anuncio.ie_aceita_parcial and qtd_efetiva != anuncio.qtd_mat:
            raise serializers.ValidationError(
                {"qtd_proposta": f"Este anúncio não aceita compra parcial: a proposta deve ser pelo lote inteiro ({anuncio.qtd_mat})."}
            )
        if anuncio.val_minimo:
            # Mínimo vale pelo lote inteiro; em compra parcial, proporcional à quantidade
            minimo = (anuncio.val_minimo * qtd_efetiva / anuncio.qtd_mat).quantize(Decimal("0.01"))
            if attrs["val_proposta"] < minimo:
                raise serializers.ValidationError(
                    {"val_proposta": "O valor proposto está abaixo do mínimo aceito pelo vendedor."}
                )
        return attrs
