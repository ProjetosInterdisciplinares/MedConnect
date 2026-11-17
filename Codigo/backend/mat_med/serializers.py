from rest_framework import serializers

from mat_med.models import MatMed, UNIDADES_MEDIDA, unidade_padronizada


class MatMedSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatMed
        fields = (
            'cd_mat', 'ds_mat', 'ds_marca', 'ds_tipo', 'unidade_med',
            'cd_tuss', 'cd_simpro', 'cd_brasindice', 'cd_catmat', 'ds_pessoaj',
        )
        # O dono do insumo é sempre a empresa logada (definido no servidor)
        read_only_fields = ('cd_mat', 'ds_pessoaj')

    def validate_unidade_med(self, valor):
        unidade = unidade_padronizada(valor)
        if unidade is None:
            raise serializers.ValidationError(
                'Unidade de medida inválida. Use uma destas: ' + ', '.join(UNIDADES_MEDIDA) + '.'
            )
        return unidade

    def validate_cd_catmat(self, valor):
        """Opcional; quando informado, só números (o código do item no catálogo do governo)."""
        valor = (valor or '').strip()
        if not valor:
            return None
        if not valor.isdigit():
            raise serializers.ValidationError('O código CATMAT tem apenas números.')
        return valor
