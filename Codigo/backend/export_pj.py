import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from pessoa_juridica.models import PessoaJuridica

data = list(PessoaJuridica.objects.values())
with open('pj_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Exported {len(data)} PessoaJuridica records.")
