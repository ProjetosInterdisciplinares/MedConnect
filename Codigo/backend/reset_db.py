import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    
print("Database schema dropped and recreated.")
