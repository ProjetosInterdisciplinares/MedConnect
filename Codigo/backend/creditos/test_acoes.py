"""Testes locais do Decorator de ações pagas e da carteira."""
from django.test import TestCase
from rest_framework.test import APIClient

from creditos.acoes import GerarDescricaoIA, PublicacaoEmLote, PublicarAnuncio
from creditos.carteira import CarteiraCreditos, PagamentoRecusadoError
from creditos.models import PacoteCredito, TransacaoCredito
from creditos.pagamento import GatewayPagamento, ResultadoPagamento
from pessoa_juridica.models import PessoaJuridica


class GatewayQueRecusa(GatewayPagamento):
    def cobrar(self, pacote, metodo):
        return ResultadoPagamento(aprovado=False, codigo='', mensagem='Cartão recusado')


class AcoesPagasTests(TestCase):
    def test_custos(self):
        self.assertEqual(PublicarAnuncio().custo(), 5)
        self.assertEqual(GerarDescricaoIA().custo(), 1)
        self.assertEqual(PublicacaoEmLote(PublicarAnuncio(), 4).custo(), 20)

    def test_decorador_mantem_o_codigo_da_acao(self):
        lote = PublicacaoEmLote(PublicarAnuncio(), 3)
        self.assertEqual(lote.codigo, 'PUBLICAR_ANUNCIO')
        self.assertIn('3 anúncios', lote.descricao())


class CarteiraTests(TestCase):
    def setUp(self):
        self.empresa = PessoaJuridica.objects.create(
            nm_pessoaj='H', email_pj='h@t.com', senha_pj='x', resp_tec='R',
            nr_cnpj='22222222000122', razao_social='H LTDA', status='ATIVA',
        )

    def test_rota_de_custos(self):
        api = APIClient()
        api.force_authenticate(user=self.empresa)

        custos = {c['codigo']: c['custo'] for c in api.get('/api/medconnect/creditos/custos/').json()}

        self.assertEqual(custos, {'PUBLICAR_ANUNCIO': 5, 'IA_DESCRICAO': 1, 'PRECO_REFERENCIA': 15})

    def test_debito_registra_a_funcionalidade(self):
        carteira = CarteiraCreditos(self.empresa)
        carteira.comprar_pacote(PacoteCredito.objects.create(nome='P', quantidade_creditos=10, preco=1), 'PIX')

        carteira.debitar(PublicacaoEmLote(PublicarAnuncio(), 2))

        self.assertEqual(carteira.saldo(), 0)
        debito = TransacaoCredito.objects.get(pessoa_juridica=self.empresa, tipo='D')
        self.assertEqual((debito.quantidade, debito.funcionalidade), (10, 'PUBLICAR_ANUNCIO'))

    def test_pagamento_recusado_nao_credita(self):
        pacote = PacoteCredito.objects.create(nome='P', quantidade_creditos=10, preco=1)

        with self.assertRaises(PagamentoRecusadoError):
            CarteiraCreditos(self.empresa, gateway=GatewayQueRecusa()).comprar_pacote(pacote, 'CARTAO')

        self.assertEqual(CarteiraCreditos(self.empresa).saldo(), 0)
