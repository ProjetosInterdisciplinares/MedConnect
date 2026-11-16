from django.db import models

from pessoa_juridica.models import PessoaJuridica


class Notificacao(models.Model):
    """Aviso exibido à empresa dentro da plataforma."""
    TIPO_CREDENCIAMENTO = 'CREDENCIAMENTO'
    TIPO_NEGOCIACAO = 'NEGOCIACAO'
    TIPO_ALERTA = 'ALERTA'
    TIPO_CREDITOS = 'CREDITOS'

    TIPO_CHOICES = [
        (TIPO_CREDENCIAMENTO, 'Credenciamento'),
        (TIPO_NEGOCIACAO, 'Negociação'),
        (TIPO_ALERTA, 'Alerta de interesse'),
        (TIPO_CREDITOS, 'Créditos'),
    ]

    destinatario = models.ForeignKey(PessoaJuridica, on_delete=models.CASCADE, related_name='notificacoes')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    mensagem = models.CharField(max_length=255)
    # Objeto relacionado, ex.: "ANUNCIO-12" ou "NEGOCIACAO-3"
    referencia = models.CharField(max_length=100, blank=True, null=True)
    lida = models.BooleanField(default=False)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ('-criada_em', '-id')
        indexes = [models.Index(fields=['destinatario', 'lida'])]

    def __str__(self):
        return f'{self.get_tipo_display()} para {self.destinatario}: {self.mensagem}'


class AlertaInteresse(models.Model):
    """'Me avise quando aparecer um anúncio de ...'"""
    empresa = models.ForeignKey(PessoaJuridica, on_delete=models.CASCADE, related_name='alertas_interesse')
    termo = models.CharField(max_length=100)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Alerta de interesse'
        verbose_name_plural = 'Alertas de interesse'
        ordering = ('-criado_em', '-id')
        constraints = [models.UniqueConstraint(fields=['empresa', 'termo'], name='alerta_unico_por_empresa')]

    def combina_com(self, anuncio) -> bool:
        termo = self.termo.strip().lower()
        material = anuncio.cd_mat
        return any(termo in (texto or '').lower() for texto in (material.ds_mat, material.ds_tipo, material.ds_marca))

    def __str__(self):
        return f'{self.empresa}: {self.termo}'
