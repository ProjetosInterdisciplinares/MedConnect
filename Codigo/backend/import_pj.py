import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from pessoa_juridica.models import PessoaJuridica

with open('pj_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    PessoaJuridica.objects.create(**item)

print(f"Imported {len(data)} PessoaJuridica records.")
