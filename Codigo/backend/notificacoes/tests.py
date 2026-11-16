"""Testes locais do Observer: notificações geradas pelos assinantes."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from anuncio.models import Anuncio, Negociacao
from creditos import services
from mat_med.models import MatMed
from notificacoes.models import AlertaInteresse, Notificacao
from pessoa_juridica.models import PessoaJuridica


def empresa(n, status='ATIVA', admin=False):
    return PessoaJuridica.objects.create(
        nm_pessoaj=f'Hospital {n}', email_pj=f'{n}@t.com', senha_pj='x', resp_tec='R',
        nr_cnpj=f'{n:014d}', razao_social=f'Hospital {n}', status=status, is_admin=admin,
    )


def mensagens(destinatario):
    return list(Notificacao.objects.filter(destinatario=destinatario).values_list('mensagem', flat=True))


class CredenciamentoTests(TestCase):
    def test_admin_e_avisado_e_empresa_recebe_aprovacao(self):
        admin = empresa(1, admin=True)
        nova = empresa(2, status='PENDENTE')
        self.assertIn('Nova solicitação de credenciamento: Hospital 2.', mensagens(admin))

        with self.captureOnCommitCallbacks(execute=True):
            nova.status = 'ATIVA'
            nova.save()

        self.assertTrue(any('aprovado' in m for m in mensagens(nova)))
        nova.refresh_from_db()
        self.assertEqual(nova.saldo_creditos, services.CREDITOS_BOAS_VINDAS)

    def test_salvar_sem_mudar_status_nao_avisa(self):
        ativa = empresa(3)
        Notificacao.objects.all().delete()
        ativa.nm_pessoaj = 'Outro nome'
        ativa.save()
        self.assertEqual(mensagens(ativa), [])


class NegociacaoEAlertaTests(TestCase):
    def setUp(self):
        self.vendedor = empresa(10)
        self.comprador = empresa(11)
        self.material = MatMed.objects.create(ds_mat='Luva nitrílica', cd_tuss='1', ds_pessoaj=self.vendedor)
        Notificacao.objects.all().delete()

    def anunciar(self):
        return Anuncio.objects.create(cd_mat=self.material, qtd_mat=10, val_base=Decimal('100'),
                                      cd_pessoa_anunciante=self.vendedor)

    def test_proposta_avisa_vendedor_e_resposta_avisa_comprador(self):
        api = APIClient()
        api.force_authenticate(user=self.comprador)
        anuncio = self.anunciar()

        resp = api.post('/api/medconnect/negociacoes/', {'anuncio': anuncio.pk, 'val_proposta': '80'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertTrue(any(m.startswith('Nova proposta de Hospital 11 para Luva nitrílica. Responda até') for m in mensagens(self.vendedor)))

        api.force_authenticate(user=self.vendedor)
        api.patch(f"/api/medconnect/negociacoes/{resp.json()['id']}/", {'status': 'R'}, format='json')
        self.assertIn('Sua proposta para Luva nitrílica foi recusada.', mensagens(self.comprador))

    def test_alerta_de_interesse(self):
        AlertaInteresse.objects.create(empresa=self.comprador, termo='luva')
        AlertaInteresse.objects.create(empresa=self.vendedor, termo='luva')  # o próprio anunciante não é avisado

        anuncio = self.anunciar()

        self.assertEqual(len(mensagens(self.comprador)), 1)
        self.assertIn('alerta "luva"', mensagens(self.comprador)[0])
        self.assertEqual(Notificacao.objects.get(destinatario=self.comprador).referencia, f'ANUNCIO-{anuncio.pk}')
        self.assertEqual(mensagens(self.vendedor), [])

    def test_saldo_baixo(self):
        services.adicionar_creditos(self.vendedor, 7, 'Compra', tipo='C')
        services.debitar_creditos(self.vendedor, 5, 'Publicação')  # 7 → 2: abaixo de 5
        services.adicionar_creditos(self.vendedor, 1, 'Compra', tipo='C')
        services.debitar_creditos(self.vendedor, 1, 'IA')          # 3 → 2: já estava abaixo

        avisos = [m for m in mensagens(self.vendedor) if 'não cobre' in m]
        self.assertEqual(len(avisos), 1)


class RotasTests(TestCase):
    def setUp(self):
        self.empresa = empresa(20)
        Notificacao.objects.all().delete()  # descarta o aviso de aprovação do cadastro
        self.api = APIClient()
        self.api.force_authenticate(user=self.empresa)

    def test_listar_e_marcar_como_lida(self):
        n = Notificacao.objects.create(destinatario=self.empresa, tipo='ALERTA', mensagem='Oi')

        corpo = self.api.get('/api/medconnect/notificacoes/').json()
        self.assertEqual(corpo['nao_lidas'], 1)

        self.api.post(f'/api/medconnect/notificacoes/{n.pk}/lida/')
        self.assertEqual(self.api.get('/api/medconnect/notificacoes/').json()['nao_lidas'], 0)

    def test_alertas_da_empresa(self):
        criado = self.api.post('/api/medconnect/alertas/', {'termo': '  Seringa '}, format='json')
        repetido = self.api.post('/api/medconnect/alertas/', {'termo': 'seringa'}, format='json')

        self.assertEqual(criado.status_code, 201)
        self.assertEqual(criado.json()['termo'], 'Seringa')
        self.assertEqual(repetido.status_code, 400)
        self.assertEqual(len(self.api.get('/api/medconnect/alertas/').json()), 1)

        self.api.delete(f"/api/medconnect/alertas/{criado.json()['id']}/")
        self.assertFalse(AlertaInteresse.objects.exists())
