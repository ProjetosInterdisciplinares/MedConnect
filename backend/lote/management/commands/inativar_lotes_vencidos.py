from django.core.management.base import BaseCommand
from django.utils import timezone
from lote.models import Lote

class Command(BaseCommand):
    help = 'Inativa lotes com validade expirada'

    def handle(self, *args, **kwargs):
        hoje = timezone.now().date()
        lotes_vencidos = Lote.objects.filter(
            dt_validade__lt=hoje,
            ie_status='A'
        )
        total = lotes_vencidos.update(ie_status='I')
        self.stdout.write(f'{total} lote(s) inativado(s) com sucesso.')