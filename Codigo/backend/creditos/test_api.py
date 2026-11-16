"""Testes locais das rotas de créditos."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from creditos import services
from creditos.models import PacoteCredito, TransacaoCredito
from pessoa_juridica.models import PessoaJuridica


class CreditosApiTests(TestCase):
    def setUp(self):
        self.empresa = PessoaJuridica.objects.create(
            nm_pessoaj='Hospital', email_pj='h@t.com', senha_pj='x', resp_tec='R',
            nr_cnpj='11111111000111', razao_social='Hospital LTDA', status='ATIVA',
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.empresa)
        self.pacote = PacoteCredito.objects.create(nome='Teste', quantidade_creditos=50, bonus_creditos=5,
                                                   preco=Decimal('25.00'))

    def test_compra_credita_o_pacote(self):
        resp = self.api.post('/api/medconnect/creditos/comprar/',
                             {'pacote_id': self.pacote.pk, 'metodo_pagamento': 'PIX'}, format='json')

        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['saldo'], 55)
        compra = TransacaoCredito.objects.get(pessoa_juridica=self.empresa, tipo='C')
        self.assertEqual(compra.valor_pago, Decimal('25.00'))
        self.assertEqual(compra.metodo_pagamento, 'PIX')
        self.assertTrue(compra.codigo_pagamento)

    def test_compra_com_pacote_invalido(self):
        resp = self.api.post('/api/medconnect/creditos/comprar/',
                             {'pacote_id': 999, 'metodo_pagamento': 'PIX'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_saldo_e_extrato(self):
        services.adicionar_creditos(self.empresa, 20, 'Compra', tipo='C')
        services.debitar_creditos(self.empresa, 5, 'Publicação', funcionalidade='PUBLICAR_ANUNCIO')

        saldo = self.api.get('/api/medconnect/creditos/saldo/').json()
        extrato = self.api.get('/api/medconnect/creditos/extrato/', {'tipo': 'D'}).json()

        self.assertEqual(saldo, {'saldo': 15, 'total_adquirido': 20, 'total_consumido': 5})
        self.assertEqual([t['quantidade'] for t in extrato], [5])
