from datetime import date
from zoneinfo import ZoneInfo

from django.utils import timezone

FUSO_BRASIL = ZoneInfo('America/Sao_Paulo')


def hoje() -> date:
    """Data de hoje no horário de Brasília.

    O servidor roda em UTC: depois das 21h, timezone.localdate() já seria amanhã
    e um produto que vence hoje seria tratado como vencido.
    """
    return timezone.localdate(timezone=FUSO_BRASIL)
