import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

def limpar_banco():
    print("Iniciando a limpeza do banco de dados...")

    from anuncio.models import Anuncio
    from mat_med.models import MatMed
    
    # Apagando insumos e anúncios usando ORM (isso garante que os sinais do Django sejam respeitados se houver)
    # ou usando TRUNCATE RESTART IDENTITY no Postgres para zerar o contador de ID.
    
    with connection.cursor() as cursor:
        print("Limpando e zerando os IDs das tabelas MatMed e Anuncio...")
        try:
            # Em PostgreSQL, TRUNCATE RESTART IDENTITY zera os IDs
            cursor.execute('TRUNCATE TABLE anuncio_anuncio RESTART IDENTITY CASCADE;')
            cursor.execute('TRUNCATE TABLE mat_med_matmed RESTART IDENTITY CASCADE;')
            print("- Tabelas mat_med e anuncio limpas e IDs zerados com sucesso.")
        except Exception as e:
            print("- Aviso: não foi possível executar TRUNCATE (pode ser ambiente SQLite). Usando ORM...")
            Anuncio.objects.all().delete()
            MatMed.objects.all().delete()
            print("- Registros apagados via ORM.")

        print("\nProcurando por tabelas antigas (lote, fabricante, marcas, tipo_matmed)...")
        tabelas_antigas = [
            'lote_lote',
            'fabricante_fabricante',
            'marcas_marcas',
            'tipo_matmed_tipomatmed'
        ]
        
        for tabela in tabelas_antigas:
            try:
                cursor.execute(f'DROP TABLE IF EXISTS {tabela} CASCADE;')
                print(f"- Tabela {tabela} removida (ou já não existia).")
            except Exception as e:
                print(f"- Erro ao tentar remover {tabela}: {e}")
                
        # Removendo o histórico de migrações dessas tabelas antigas
        try:
            cursor.execute("DELETE FROM django_migrations WHERE app IN ('lote', 'fabricante', 'marcas', 'tipo_matmed');")
            print("- Histórico de migrações de apps antigos removido.")
        except Exception:
            pass

    print("\nConcluído! Insumos e anúncios foram apagados, e o único cadastro forçado restante é o Admin (Pessoa Jurídica).")

if __name__ == '__main__':
    limpar_banco()
