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
@api_view(["GET"])
def limpar_banco_view(request):
    """ View temporária para limpar o banco sem precisar de acesso ao Shell do Render """
    from anuncio.models import Anuncio
    
    mensagens = []
    with connection.cursor() as cursor:
        try:
            cursor.execute('TRUNCATE TABLE anuncio_anuncio RESTART IDENTITY CASCADE;')
            cursor.execute('TRUNCATE TABLE mat_med_matmed RESTART IDENTITY CASCADE;')
            mensagens.append("Tabelas mat_med e anuncio limpas e IDs zerados com sucesso.")
        except Exception as e:
            mensagens.append(f"Aviso TRUNCATE: {str(e)}")
            Anuncio.objects.all().delete()
            MatMed.objects.all().delete()
            mensagens.append("Registros apagados via ORM como fallback.")

        tabelas_antigas = ['lote_lote', 'fabricante_fabricante', 'marcas_marcas', 'tipo_matmed_tipomatmed']
        for tabela in tabelas_antigas:
            try:
                cursor.execute(f'DROP TABLE IF EXISTS {tabela} CASCADE;')
                mensagens.append(f"Tabela {tabela} checada/removida.")
            except Exception as e:
                mensagens.append(f"Erro DROP {tabela}: {e}")
                
        try:
            cursor.execute("DELETE FROM django_migrations WHERE app IN ('lote', 'fabricante', 'marcas', 'tipo_matmed');")
        except Exception:
            pass

    return Response({"status": "Banco Limpo", "detalhes": mensagens})