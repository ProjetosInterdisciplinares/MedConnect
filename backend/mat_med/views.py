from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from mat_med.models import MatMed
from mat_med.serializers import MatMedSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import MatMed
from .serializers import MatMedSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def meus_materiais(request):
    materiais = MatMed.objects.filter(
        ds_pessoaj=request.user
    )

    serializer = MatMedSerializer(
        materiais,
        many=True
    )

    return Response(serializer.data)

class MatMedCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset =  MatMed.objects.all()
    serializer_class = MatMedSerializer
    
class MatMedRetrieveUpateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = MatMed.objects.all()
    serializer_class = MatMedSerializer