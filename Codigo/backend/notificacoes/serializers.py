from rest_framework import serializers

from notificacoes.models import AlertaInteresse, Notificacao


class NotificacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Notificacao
        fields = ('id', 'tipo', 'tipo_display', 'mensagem', 'referencia', 'lida', 'criada_em')
        read_only_fields = fields


class AlertaInteresseSerializer(serializers.ModelSerializer):

    class Meta:
        model = AlertaInteresse
        fields = ('id', 'termo', 'ativo', 'criado_em')
        read_only_fields = ('id', 'criado_em')

    def validate_termo(self, valor):
        termo = valor.strip()
        if len(termo) < 2:
            raise serializers.ValidationError('Informe ao menos 2 caracteres.')
        empresa = self.context['request'].user
        repetido = AlertaInteresse.objects.filter(empresa=empresa, termo__iexact=termo)
        if self.instance is not None:
            repetido = repetido.exclude(pk=self.instance.pk)
        if repetido.exists():
            raise serializers.ValidationError('Você já tem um alerta para este termo.')
        return termo
