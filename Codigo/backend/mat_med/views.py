from django.db.models import ProtectedError, RestrictedError
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from mat_med.models import MatMed
from mat_med.serializers import MatMedSerializer
from pessoa_juridica.permissions import IsDonoOuSomenteLeitura


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def meus_materiais(request):
    materiais = MatMed.objects.filter(ds_pessoaj=request.user)
    return Response(MatMedSerializer(materiais, many=True).data)


class MatMedCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = MatMed.objects.all()
    serializer_class = MatMedSerializer

    def perform_create(self, serializer):
        serializer.save(ds_pessoaj=self.request.user)


class MatMedRetrieveUpateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated, IsDonoOuSomenteLeitura)
    queryset = MatMed.objects.all()
    serializer_class = MatMedSerializer

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except (ProtectedError, RestrictedError):
            raise ValidationError('Este insumo possui anúncios e não pode ser removido.')
