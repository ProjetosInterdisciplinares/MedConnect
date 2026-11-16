"""
Base do padrão Observer no MedConnect.

A Publicadora é o sinal post_save do Django: ele mantém a lista de
receptores e notifica cada um quando um model é salvo. Cada Assinante
escolhe o model que observa (publicadora), se inscreve com assinar() e
cancela com cancelar(). Para reagir a mudanças de um campo (ex.: status
PENDENTE → ATIVA), o assinante lista o campo em campos_observados e
consulta mudou_para().
"""
from abc import ABC, abstractmethod

from django.db.models import Model
from django.db.models.signals import post_save, pre_save


class Assinante(ABC):
    publicadora: type[Model]
    campos_observados: tuple[str, ...] = ()

    # ── Inscrição ─────────────────────────────────────────────────────

    def assinar(self) -> None:
        if self.campos_observados:
            pre_save.connect(self._guardar_valores_anteriores, sender=self.publicadora,
                             weak=False, dispatch_uid=f'{self._id}.pre_save')
        post_save.connect(self._receber, sender=self.publicadora, weak=False, dispatch_uid=f'{self._id}.post_save')

    def cancelar(self) -> None:
        pre_save.disconnect(sender=self.publicadora, dispatch_uid=f'{self._id}.pre_save')
        post_save.disconnect(sender=self.publicadora, dispatch_uid=f'{self._id}.post_save')

    # ── Notificação ───────────────────────────────────────────────────

    @abstractmethod
    def atualizar(self, instancia, criado: bool) -> None:
        """Chamado depois que a publicadora salva uma instância."""

    def valor_anterior(self, instancia, campo: str):
        return getattr(instancia, '_valores_anteriores', {}).get(self._id, {}).get(campo)

    def mudou_para(self, instancia, campo: str, valor) -> bool:
        return getattr(instancia, campo) == valor and self.valor_anterior(instancia, campo) != valor

    # ── Internos ──────────────────────────────────────────────────────

    @property
    def _id(self) -> str:
        return f'{type(self).__module__}.{type(self).__qualname__}'

    def _guardar_valores_anteriores(self, sender, instance, raw=False, **kwargs):
        if raw:
            return
        anteriores = {}
        if instance.pk:
            anteriores = sender.objects.filter(pk=instance.pk).values(*self.campos_observados).first() or {}
        if not hasattr(instance, '_valores_anteriores'):
            instance._valores_anteriores = {}
        instance._valores_anteriores[self._id] = anteriores

    def _receber(self, sender, instance, created, raw=False, **kwargs):
        if not raw:
            self.atualizar(instance, created)
