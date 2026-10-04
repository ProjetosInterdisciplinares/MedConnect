from decimal import Decimal
from django.db import migrations


PACOTES_INICIAIS = [
    {
        'nome': 'Essencial',
        'descricao': 'Ideal para conhecer as funcionalidades premium.',
        'quantidade_creditos': 50,
        'bonus_creditos': 0,
        'preco': Decimal('25.00'),
        'destaque': False,
        'ordem': 1,
    },
    {
        'nome': 'Profissional',
        'descricao': 'Para operações recorrentes de compra e venda.',
        'quantidade_creditos': 150,
        'bonus_creditos': 15,
        'preco': Decimal('69.90'),
        'destaque': True,
        'ordem': 2,
    },
    {
        'nome': 'Empresarial',
        'descricao': 'Para equipes de suprimentos com alto volume.',
        'quantidade_creditos': 400,
        'bonus_creditos': 60,
        'preco': Decimal('179.90'),
        'destaque': False,
        'ordem': 3,
    },
    {
        'nome': 'Hospitalar',
        'descricao': 'Máxima economia para redes e grandes hospitais.',
        'quantidade_creditos': 1000,
        'bonus_creditos': 200,
        'preco': Decimal('399.90'),
        'destaque': False,
        'ordem': 4,
    },
]


def criar_pacotes(apps, schema_editor):
    PacoteCredito = apps.get_model('creditos', 'PacoteCredito')
    for dados in PACOTES_INICIAIS:
        PacoteCredito.objects.get_or_create(nome=dados['nome'], defaults=dados)


def remover_pacotes(apps, schema_editor):
    PacoteCredito = apps.get_model('creditos', 'PacoteCredito')
    PacoteCredito.objects.filter(nome__in=[p['nome'] for p in PACOTES_INICIAIS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('creditos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(criar_pacotes, remover_pacotes),
    ]
