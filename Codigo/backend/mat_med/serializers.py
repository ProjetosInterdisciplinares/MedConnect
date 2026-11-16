from rest_framework import serializers

from mat_med.models import MatMed


class MatMedSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatMed
        fields = (
            'cd_mat', 'ds_mat', 'ds_marca', 'ds_tipo', 'unidade_med',
            'cd_tiss', 'cd_tuss', 'cd_simpro', 'cd_brasindice', 'cd_catmat', 'ds_pessoaj',
        )
        # O dono do insumo é sempre a empresa logada (definido no servidor)
        read_only_fields = ('cd_mat', 'ds_pessoaj')

    def validate_cd_catmat(self, valor):
        """Opcional; quando informado, só números (o código do item no catálogo do governo)."""
        valor = (valor or '').strip()
        if not valor:
            return None
        if not valor.isdigit():
            raise serializers.ValidationError('O código CATMAT tem apenas números.')
        return valor
