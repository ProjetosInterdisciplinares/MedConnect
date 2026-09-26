import os
import django
from django.core.management.color import no_style
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

def reset_sequences():
    print("Sincronizando as sequências do banco de dados (PostgreSQL)...")
    
    from django.apps import apps
    
    # Pegar todos os modelos
    models = apps.get_models()
    
    # Gerar os comandos SQL para resetar as sequências
    with connection.cursor() as cursor:
        statements = connection.ops.sequence_reset_sql(no_style(), models)
        if not statements:
            print("Nenhuma sequência precisava ser ajustada ou o banco não suporta (ex: SQLite local sem suporte nativo).")
            return
            
        for statement in statements:
            cursor.execute(statement)
            
    print("Sequências ajustadas com sucesso!")

if __name__ == '__main__':
    reset_sequences()
