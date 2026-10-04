from rest_framework import serializers
from creditos.models import PacoteCredito, TransacaoCredito


class PacoteCreditoSerializer(serializers.ModelSerializer):
    total_creditos = serializers.IntegerField(read_only=True)

    class Meta:
        model = PacoteCredito
        fields = (
            'id', 'nome', 'descricao', 'quantidade_creditos', 'bonus_creditos',
            'total_creditos', 'preco', 'destaque',
        )


class TransacaoCreditoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    metodo_pagamento_display = serializers.CharField(source='get_metodo_pagamento_display', read_only=True)
    is_entrada = serializers.BooleanField(read_only=True)
    pacote_nome = serializers.CharField(source='pacote.nome', read_only=True, default=None)

    class Meta:
        model = TransacaoCredito
        fields = (
            'id', 'tipo', 'tipo_display', 'status', 'status_display',
            'quantidade', 'saldo_apos', 'is_entrada', 'descricao',
            'funcionalidade', 'referencia', 'pacote', 'pacote_nome',
            'valor_pago', 'metodo_pagamento', 'metodo_pagamento_display',
            'codigo_pagamento', 'data_transacao',
        )
        read_only_fields = fields


class ComprarCreditosSerializer(serializers.Serializer):
    pacote_id = serializers.IntegerField()
    metodo_pagamento = serializers.ChoiceField(choices=TransacaoCredito.METODO_CHOICES)

    def validate_pacote_id(self, value):
        try:
            return PacoteCredito.objects.get(pk=value, ativo=True)
        except PacoteCredito.DoesNotExist:
            raise serializers.ValidationError('Pacote inválido ou indisponível.')
