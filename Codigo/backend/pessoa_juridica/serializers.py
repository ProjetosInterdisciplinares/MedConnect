from rest_framework import serializers
from pessoa_juridica.models import PessoaJuridica

class PessoaJuridicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PessoaJuridica
        fields = '__all__'
        extra_kwargs = {
            'senha_pj': {'write_only': True}
        }

    def validate(self, attrs):
        # Check if it's a creation or update. If partial update, attrs might not have all keys.
        # But for full registration, we enforce these fields.
        required_fields = ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'telefone']
        missing = []
        for field in required_fields:
            # We enforce this if the field is completely missing or empty string, unless it's a partial update 
            # where the field is not in attrs at all. If it's in attrs but empty, it's an error.
            if field in attrs and not attrs[field]:
                missing.append(field)
            
            # If this is a create operation (no instance), all must be present
            if not self.instance and not attrs.get(field):
                if field not in missing:
                    missing.append(field)
                    
        if missing:
            raise serializers.ValidationError({f: "Este campo é obrigatório para o credenciamento." for f in missing})
            
        return attrs

    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password
        if 'senha_pj' in validated_data:
            validated_data['senha_pj'] = make_password(validated_data['senha_pj'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.auth.hashers import make_password
        if 'senha_pj' in validated_data:
            # Se for uma atualização de senha explícita
            validated_data['senha_pj'] = make_password(validated_data['senha_pj'])
        return super().update(instance, validated_data)