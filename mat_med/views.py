from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from mat_med.models import MatMed
from mat_med.serializers import MatMedSerializer

class MatMedCreateListView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    queryset =  MatMed.objects.all()
    serializer_class = MatMedSerializer
    
class MatMedRetrieveUpateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = MatMed.objects.all()
    serializer_class = MatMedSerializer