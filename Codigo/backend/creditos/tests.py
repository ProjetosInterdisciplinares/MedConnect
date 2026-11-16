from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from creditos import services
from creditos.models import TransacaoCredito
from pessoa_juridica.models import PessoaJuridica


def criar_empresa(cnpj='00.000.000/0001-00', status='PENDENTE'):
    return PessoaJuridica.objects.create(
        nm_pessoaj='Hospital Teste', email_pj=f'{cnpj}@teste.com', senha_pj='x',
        resp_tec='Resp', nr_cnpj=cnpj, razao_social='Hospital Teste LTDA', status=status,
    )


class BoasVindasTests(TestCase):
    def aprovar(self, empresa):
        with self.captureOnCommitCallbacks(execute=True):
            empresa.status = 'ATIVA'
            empresa.save()
        empresa.refresh_from_db()

    def test_concede_na_aprovacao(self):
        empresa = criar_empresa()
        self.assertEqual(empresa.saldo_creditos, 0)

        self.aprovar(empresa)

        self.assertEqual(empresa.saldo_creditos, services.CREDITOS_BOAS_VINDAS)
        bonus = TransacaoCredito.objects.get(pessoa_juridica=empresa, tipo='B')
        self.assertEqual(bonus.referencia, services.REFERENCIA_BOAS_VINDAS)
        self.assertIsNotNone(bonus.expira_em)

    def test_nao_concede_duas_vezes(self):
        empresa = criar_empresa()
        self.aprovar(empresa)
        with self.captureOnCommitCallbacks(execute=True):
            empresa.status = 'BLOQUEADA'
            empresa.save()
        self.aprovar(empresa)

        self.assertEqual(empresa.saldo_creditos, services.CREDITOS_BOAS_VINDAS)
        self.assertEqual(TransacaoCredito.objects.filter(pessoa_juridica=empresa, tipo='B').count(), 1)

    def test_pendente_nao_recebe(self):
        empresa = criar_empresa()
        with self.captureOnCommitCallbacks(execute=True):
            empresa.nm_pessoaj = 'Outro nome'
            empresa.save()
        empresa.refresh_from_db()
        self.assertEqual(empresa.saldo_creditos, 0)


class ExpiracaoTests(TestCase):
    def setUp(self):
        self.empresa = criar_empresa(status='PENDENTE')
        self.bonus = services.conceder_boas_vindas(self.empresa)

    def vencer(self):
        TransacaoCredito.objects.filter(pk=self.bonus.pk).update(
            expira_em=timezone.now() - timedelta(minutes=1)
        )

    def test_expira_somente_o_que_sobrou(self):
        services.debitar_creditos(self.empresa, 5, 'Publicação')  # usa 5 dos 50
        services.adicionar_creditos(self.empresa, 50, 'Compra', tipo='C')  # comprados não expiram
        self.vencer()

        services.atualizar_validades(self.empresa)
        self.empresa.refresh_from_db()

        self.assertEqual(self.empresa.saldo_creditos, 50)
        expiracao = TransacaoCredito.objects.get(pessoa_juridica=self.empresa, tipo='X')
        self.assertEqual(expiracao.quantidade, 45)
        self.assertFalse(expiracao.is_entrada)

    def test_expiracao_e_idempotente(self):
        self.vencer()
        services.atualizar_validades(self.empresa)
        services.atualizar_validades(self.empresa)
        self.empresa.refresh_from_db()

        self.assertEqual(self.empresa.saldo_creditos, 0)
        self.assertEqual(TransacaoCredito.objects.filter(pessoa_juridica=self.empresa, tipo='X').count(), 1)

    def test_nao_expira_antes_do_prazo(self):
        services.atualizar_validades(self.empresa)
        self.empresa.refresh_from_db()
        self.assertEqual(self.empresa.saldo_creditos, services.CREDITOS_BOAS_VINDAS)

    def test_debito_aplica_expiracao_antes(self):
        self.vencer()
        with self.assertRaises(services.SaldoInsuficienteError):
            services.debitar_creditos(self.empresa, 5, 'Publicação')
