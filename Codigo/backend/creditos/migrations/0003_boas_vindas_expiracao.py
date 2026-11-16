from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('creditos', '0002_pacotes_iniciais'),
    ]

    operations = [
        migrations.AddField(
            model_name='transacaocredito',
            name='expira_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='transacaocredito',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('C', 'Compra'),
                    ('D', 'Consumo'),
                    ('E', 'Estorno'),
                    ('B', 'Bônus / Ajuste'),
                    ('X', 'Expiração'),
                ],
                max_length=1,
            ),
        ),
    ]
