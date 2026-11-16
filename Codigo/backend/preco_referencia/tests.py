"""Testes da sugestão de CATMAT e da consulta de preço de referência."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from creditos.carteira import CarteiraCreditos, SaldoInsuficienteError
from creditos.models import PacoteCredito, TransacaoCredito
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica
from preco_referencia.busca import normalizar, sugerir_catmat
from preco_referencia.compras_gov import FontePrecosIndisponivelError, PrecoPraticado, PrecosPublicos
from preco_referencia.consulta import ConsultaPrecoReferenciaFacade, InsumoSemCatmatError
from preco_referencia.models import ItemCatmat


class FonteFalsa(PrecosPublicos):
    """Dublê da API do Compras.gov.br: devolve preços fixos e conta as chamadas."""

    def __init__(self, precos=None, erro=None):
        self.precos = precos or []
        self.erro = erro
        self.chamadas = 0

    def consultar_precos(self, codigo_catmat, desde):
        self.chamadas += 1
        if self.erro:
            raise self.erro
        return self.precos


def preco(valor, unidade='UN', data='2026-10-01'):
    return PrecoPraticado(preco_unitario=Decimal(valor), unidade=unidade, data_compra=data,
                          orgao='HOSPITAL FEDERAL X', uf='RJ')


def item(codigo, descricao, classe=6515):
    return ItemCatmat.objects.create(codigo=codigo, descricao=descricao, descricao_busca=normalizar(descricao),
                                     codigo_classe=classe)


class NormalizacaoTests(TestCase):
    def test_separa_numero_da_unidade_e_remove_acentos(self):
        self.assertEqual(normalizar('Seringa 20ml'), ' SERINGA 20 ML ')
        self.assertEqual(normalizar('SERINGA, CAPACIDADE: 20 ML'), ' SERINGA CAPACIDADE 20 ML ')
        self.assertEqual(normalizar('Solução 0,9%'), ' SOLUCAO 0.9 ')


class SugestaoCatmatTests(TestCase):
    def setUp(self):
        item(1, 'SERINGA, MATERIAL: POLIPROPILENO, CAPACIDADE: 20 ML, BICO: LUER LOCK')
        item(2, 'SERINGA, MATERIAL: POLIPROPILENO, CAPACIDADE: 120 ML')
        item(3, 'AGULHA, APLICAÇÃO: P/ SERINGA, DIMENSÃO: 25 X 7')
        item(4, 'DIPIRONA SÓDICA, DOSAGEM: 500 MG/ML, FORMA: SOLUÇÃO INJETÁVEL', classe=6505)

    def test_acha_pelo_nome_e_pela_capacidade(self):
        self.assertEqual([i.codigo for i in sugerir_catmat('seringa 20ml')], [1])

    def test_numero_casa_inteiro(self):
        self.assertNotIn(2, [i.codigo for i in sugerir_catmat('seringa 20 ml')])

    def test_quem_comeca_com_o_termo_vem_primeiro(self):
        # Seringas primeiro (a mais curta antes); a agulha "p/ seringa" por último
        self.assertEqual([i.codigo for i in sugerir_catmat('seringa')], [2, 1, 3])

    def test_filtra_pela_categoria(self):
        self.assertEqual([i.codigo for i in sugerir_catmat('dipirona', 'Medicamento')], [4])
        self.assertEqual(sugerir_catmat('dipirona', 'Material Hospitalar'), [])

    def test_termo_curto_nao_busca(self):
        self.assertEqual(sugerir_catmat('se'), [])

    def test_rota_de_sugestoes(self):
        empresa = criar_empresa()
        api = APIClient()
        api.force_authenticate(user=empresa)
        resposta = api.get('/api/medconnect/catmat/sugestoes/', {'q': 'seringa 20ml'}).json()
        self.assertEqual(resposta[0]['codigo'], '1')


def criar_empresa(cnpj='33333333000133'):
    return PessoaJuridica.objects.create(
        nm_pessoaj='H', email_pj=f'{cnpj}@t.com', senha_pj='x', resp_tec='R',
        nr_cnpj=cnpj, razao_social='H LTDA', status='ATIVA',
    )


class ConsultaPrecoTests(TestCase):
    def setUp(self):
        self.empresa = criar_empresa()
        self.material = MatMed.objects.create(ds_mat='Seringa 20 ml', cd_tuss='123', cd_catmat='1',
                                              ds_pessoaj=self.empresa)
        self.carteira = CarteiraCreditos(self.empresa)
        self.carteira.comprar_pacote(PacoteCredito.objects.create(nome='P', quantidade_creditos=20, preco=1), 'PIX')

    def test_resumo_e_cobra_15_creditos(self):
        fonte = FonteFalsa([preco('1.00'), preco('2.00'), preco('3.00'), preco('9.00', unidade='CX')])

        resumo = ConsultaPrecoReferenciaFacade(fonte).consultar(self.empresa, self.material)

        self.assertTrue(resumo['encontrado'])
        self.assertEqual((resumo['unidade'], resumo['total_compras']), ('UN', 3))
        self.assertEqual((resumo['menor'], resumo['mediana'], resumo['maior']), ('1', '2', '3'))
        self.assertEqual(self.carteira.saldo(), 5)
        debito = TransacaoCredito.objects.get(pessoa_juridica=self.empresa, tipo='D')
        self.assertEqual((debito.quantidade, debito.funcionalidade), (15, 'PRECO_REFERENCIA'))

    def test_resultado_nao_expoe_fornecedor(self):
        resumo = ConsultaPrecoReferenciaFacade(FonteFalsa([preco('1.00')])).consultar(self.empresa, self.material)
        self.assertEqual(set(resumo['exemplos'][0]), {'orgao', 'uf', 'data', 'preco_unitario'})

    def test_sem_resultado_nao_cobra(self):
        resumo = ConsultaPrecoReferenciaFacade(FonteFalsa([])).consultar(self.empresa, self.material)
        self.assertFalse(resumo['encontrado'])
        self.assertEqual(self.carteira.saldo(), 20)

    def test_falha_da_api_nao_cobra(self):
        fonte = FonteFalsa(erro=FontePrecosIndisponivelError('fora do ar'))
        with self.assertRaises(FontePrecosIndisponivelError):
            ConsultaPrecoReferenciaFacade(fonte).consultar(self.empresa, self.material)
        self.assertEqual(self.carteira.saldo(), 20)

    def test_sem_saldo_nao_chama_a_api(self):
        pobre = criar_empresa('44444444000144')
        fonte = FonteFalsa([preco('1.00')])
        with self.assertRaises(SaldoInsuficienteError):
            ConsultaPrecoReferenciaFacade(fonte).consultar(pobre, self.material)
        self.assertEqual(fonte.chamadas, 0)

    def test_insumo_sem_catmat(self):
        self.material.cd_catmat = None
        with self.assertRaises(InsumoSemCatmatError):
            ConsultaPrecoReferenciaFacade(FonteFalsa()).consultar(self.empresa, self.material)

    def test_comprador_tambem_pode_consultar(self):
        comprador = criar_empresa('55555555000155')
        CarteiraCreditos(comprador).comprar_pacote(PacoteCredito.objects.create(nome='Q', quantidade_creditos=15, preco=1), 'PIX')
        ConsultaPrecoReferenciaFacade(FonteFalsa([preco('1.00')])).consultar(comprador, self.material)
        self.assertEqual(CarteiraCreditos(comprador).saldo(), 0)
