"""
Assinantes (Observer) que geram notificações dentro da plataforma.

Cada classe observa um model (publicadora) e cria Notificacao para as
empresas interessadas. Novos avisos entram como novos assinantes, sem
alterar os models nem as views que os salvam.
"""
from django.utils import timezone

from anuncio.models import Anuncio, Negociacao
from app.observador import Assinante
from creditos.acoes import PublicarAnuncio
from creditos.models import TransacaoCredito
from notificacoes.models import AlertaInteresse, Notificacao
from pessoa_juridica.models import PessoaJuridica


def _nome(empresa) -> str:
    return empresa.razao_social or empresa.nm_pessoaj


def _material(anuncio) -> str:
    return anuncio.cd_mat.ds_mat or anuncio.cd_mat.cd_tuss


class NotificarCredenciamento(Assinante):
    """Avisa os administradores de novas solicitações e a empresa da aprovação ou do bloqueio."""
    publicadora = PessoaJuridica
    campos_observados = ('status',)

    def atualizar(self, instancia, criado):
        if criado and instancia.status == 'PENDENTE':
            admins = PessoaJuridica.objects.filter(is_admin=True)
            Notificacao.objects.bulk_create([
                Notificacao(destinatario=admin, tipo=Notificacao.TIPO_CREDENCIAMENTO,
                            mensagem=f'Nova solicitação de credenciamento: {_nome(instancia)}.',
                            referencia=f'EMPRESA-{instancia.pk}')
                for admin in admins
            ])
        elif self.mudou_para(instancia, 'status', 'ATIVA'):
            self._avisar(instancia, 'Seu credenciamento foi aprovado. Boas-vindas ao MedConnect!')
        elif self.mudou_para(instancia, 'status', 'BLOQUEADA'):
            self._avisar(instancia, 'O acesso da sua empresa foi bloqueado pela administração.')

    @staticmethod
    def _avisar(empresa, mensagem):
        Notificacao.objects.create(destinatario=empresa, tipo=Notificacao.TIPO_CREDENCIAMENTO,
                                   mensagem=mensagem, referencia=f'EMPRESA-{empresa.pk}')


class NotificarPartesNegociacao(Assinante):
    """Acompanha o percurso da negociação e avisa a outra parte a cada etapa."""
    publicadora = Negociacao
    campos_observados = ('status', 'entregue_em', 'recebido_em')

    def atualizar(self, instancia, criado):
        material = _material(instancia.anuncio)
        comprador, vendedor = _nome(instancia.comprador), _nome(instancia.vendedor)

        if criado:
            prazo = timezone.localtime(instancia.prazo_resposta).strftime('%d/%m às %H:%M') if instancia.prazo_resposta else None
            self._avisar(instancia.vendedor, instancia,
                         f'Nova proposta de {comprador} para {material}.' + (f' Responda até {prazo}.' if prazo else ''))
            return

        if self.mudou_para(instancia, 'status', Negociacao.STATUS_ACEITA):
            self._avisar(instancia.comprador, instancia,
                         f'Sua proposta para {material} foi aceita. O contato de {vendedor} já está liberado.')
        elif self.mudou_para(instancia, 'status', Negociacao.STATUS_RECUSADA):
            motivo = instancia.get_motivo_recusa_display() if instancia.motivo_recusa else None
            detalhe = f' {instancia.detalhe_recusa}' if instancia.detalhe_recusa else ''
            self._avisar(instancia.comprador, instancia,
                         f'Sua proposta para {material} foi recusada.' + (f' Motivo: {motivo}.' if motivo else '') + detalhe)
        elif self.mudou_para(instancia, 'status', Negociacao.STATUS_CANCELADA):
            self._avisar(instancia.vendedor, instancia, f'{comprador} cancelou a proposta para {material}.')
        elif self.mudou_para(instancia, 'status', Negociacao.STATUS_EXPIRADA):
            self._avisar(instancia.comprador, instancia,
                         f'Sua proposta para {material} expirou sem resposta. O anúncio voltou ao catálogo.')
            self._avisar(instancia.vendedor, instancia,
                         f'A proposta de {comprador} para {material} expirou porque não foi respondida no prazo.')
        elif self.mudou_para(instancia, 'status', Negociacao.STATUS_CONCLUIDA):
            for empresa in (instancia.comprador, instancia.vendedor):
                self._avisar(empresa, instancia, f'Negociação de {material} concluída. Entrega e recebimento confirmados.')
        elif self.mudou_para(instancia, 'status', Negociacao.STATUS_NAO_CONCLUIDA):
            for empresa in (instancia.comprador, instancia.vendedor):
                self._avisar(empresa, instancia, f'A negociação de {material} foi marcada como não concluída.')
        elif instancia.entregue_em and self.valor_anterior(instancia, 'entregue_em') is None:
            self._avisar(instancia.comprador, instancia,
                         f'{vendedor} confirmou a entrega de {material}. Confirme o recebimento para concluir.')
        elif instancia.recebido_em and self.valor_anterior(instancia, 'recebido_em') is None:
            self._avisar(instancia.vendedor, instancia,
                         f'{comprador} confirmou o recebimento de {material}. Confirme a entrega para concluir.')

    @staticmethod
    def _avisar(empresa, negociacao, mensagem):
        Notificacao.objects.create(destinatario=empresa, tipo=Notificacao.TIPO_NEGOCIACAO,
                                   mensagem=mensagem[:255], referencia=f'NEGOCIACAO-{negociacao.pk}')


class NotificarAlertaInteresse(Assinante):
    """Avisa quem cadastrou um alerta quando surge um anúncio compatível."""
    publicadora = Anuncio

    def atualizar(self, instancia, criado):
        if not criado or instancia.ie_status != Anuncio.STATUS_ATIVO:
            return

        alertas = AlertaInteresse.objects.filter(ativo=True).exclude(empresa_id=instancia.cd_pessoa_anunciante_id)
        destinatarios = {a.empresa_id: a for a in alertas if a.combina_com(instancia)}
        Notificacao.objects.bulk_create([
            Notificacao(destinatario_id=empresa_id, tipo=Notificacao.TIPO_ALERTA,
                        mensagem=f'Novo anúncio de {_material(instancia)}, compatível com o seu alerta "{alerta.termo}".',
                        referencia=f'ANUNCIO-{instancia.pk}')
            for empresa_id, alerta in destinatarios.items()
        ])


class AvisarSaldoBaixo(Assinante):
    """Avisa quando um débito deixa o saldo abaixo do custo de uma publicação."""
    publicadora = TransacaoCredito

    def atualizar(self, instancia, criado):
        if not criado or instancia.tipo not in TransacaoCredito.TIPOS_SAIDA:
            return

        custo = PublicarAnuncio.CUSTO
        saldo_antes = instancia.saldo_apos + instancia.quantidade
        if saldo_antes >= custo > instancia.saldo_apos:
            Notificacao.objects.create(
                destinatario_id=instancia.pessoa_juridica_id, tipo=Notificacao.TIPO_CREDITOS,
                mensagem=f'Seu saldo ({instancia.saldo_apos} créditos) não cobre uma nova publicação '
                         f'({custo} créditos).',
                referencia=f'TRANSACAO-{instancia.pk}',
            )


ASSINANTES = (
    NotificarCredenciamento(),
    NotificarPartesNegociacao(),
    NotificarAlertaInteresse(),
    AvisarSaldoBaixo(),
)
