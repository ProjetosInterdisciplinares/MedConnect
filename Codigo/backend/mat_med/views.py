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

from django.db import connection
from django.core.management import call_command
from rest_framework.decorators import api_view, permission_classes

@api_view(["GET"])
def fix_db_schema_view(request):
    """ View temporária para recriar as tabelas mat_med e anuncio com o schema correto """
    mensagens = []
    with connection.cursor() as cursor:
        try:
            cursor.execute("DROP TABLE IF EXISTS anuncio_anuncio CASCADE;")
            cursor.execute("DROP TABLE IF EXISTS mat_med_matmed CASCADE;")
            mensagens.append("Tabelas antigas dropadas.")
        except Exception as e:
            mensagens.append(f"Erro ao dropar tabelas: {str(e)}")

        try:
            cursor.execute("DELETE FROM django_migrations WHERE app IN ('mat_med', 'anuncio');")
            mensagens.append("Histórico de migrações limpo.")
        except Exception as e:
            mensagens.append(f"Erro ao limpar histórico: {str(e)}")

    try:
        call_command('migrate', 'mat_med')
        call_command('migrate', 'anuncio')
        mensagens.append("Migrações reaplicadas com sucesso! Schema corrigido.")
    except Exception as e:
        mensagens.append(f"Erro ao reaplicar migrações: {str(e)}")

    return Response({"status": "Finalizado", "detalhes": mensagens})
