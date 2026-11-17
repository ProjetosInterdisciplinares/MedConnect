"""Testes das melhorias: unidade de medida em lista, sem Tabela TISS, validade,
valor mínimo aceito e flag de compra parcial."""
import io
from datetime import date, timedelta
from decimal import Decimal

from openpyxl import Workbook

from anuncio.models import Anuncio
from anuncio.planilha_modelo import COLUNAS_PLANILHA
from anuncio.publicacao.builder import AnuncioBuilder
from anuncio.test_publicacao import Base, criar_empresa


def builder_de_insumo(**campos):
    dados = dict(ds_mat='Luva', ds_tipo='Material Hospitalar', ds_marca='X', unidade_med='Caixa', cd_tuss='123')
    dados.update(campos)
    builder = AnuncioBuilder(None)
    builder.com_novo_insumo(**dados)
    return builder


class UnidadeDeMedidaTests(Base):
    def test_aceita_unidade_da_lista_com_grafia_oficial(self):
        builder = builder_de_insumo(unidade_med='  caixa ')
        self.assertEqual(builder.erros, [])
        self.assertEqual(builder._insumo.unidade_med, 'Caixa')

    def test_recusa_unidade_com_quantidade(self):
        builder = builder_de_insumo(unidade_med='Caixa c/ 100')
        self.assertTrue(any("Unidade de Medida 'Caixa c/ 100' inválida" in e for e in builder.erros))

    def test_cadastro_de_insumo_pela_api_valida_a_unidade(self):
        url = '/api/medconnect/mat_med/'
        base = {'ds_mat': 'Soro', 'ds_tipo': 'Medicamento', 'ds_marca': 'Y', 'cd_tuss': '777'}
        self.assertEqual(self.api.post(url, {**base, 'unidade_med': 'Frasco c/ 10'}, format='json').status_code, 400)
        resp = self.api.post(url, {**base, 'unidade_med': 'frasco'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['unidade_med'], 'Frasco')
        self.assertNotIn('cd_tiss', resp.json())


class ValidadeTests(Base):
    URL = '/api/medconnect/anuncio/'

    def publicar(self, **extra):
        dados = {'cd_mat': self.material.pk, 'qtd_mat': 5, 'val_base': '100.00', 'ds_lote': 'L1',
                 'dt_validade': (date.today() + timedelta(days=30)).isoformat(), 'ds_obs': 'Ok'}
        dados.update(extra)
        return self.api.post(self.URL, dados, format='json')

    def test_recusa_produto_vencido(self):
        resp = self.publicar(dt_validade=(date.today() - timedelta(days=1)).isoformat())
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Produto vencido', resp.content.decode())

    def test_aceita_validade_hoje(self):
        self.assertEqual(self.publicar(dt_validade=date.today().isoformat()).status_code, 201)

    def test_recusa_validade_antes_da_fabricacao(self):
        resp = self.publicar(dt_fabricacao=(date.today() + timedelta(days=60)).isoformat())
        self.assertEqual(resp.status_code, 400)


class CondicoesDeVendaTests(Base):
    URL = '/api/medconnect/anuncio/'

    def setUp(self):
        super().setUp()
        self.comprador = criar_empresa(9)
        self.api_comprador = type(self.api)()
        self.api_comprador.force_authenticate(user=self.comprador)

    def criar(self, **extra):
        dados = dict(cd_mat=self.material, qtd_mat=10, val_base=Decimal('100.00'),
                     cd_pessoa_anunciante=self.empresa, ds_obs='Ok')
        dados.update(extra)
        return Anuncio.objects.create(**dados)

    def propor(self, anuncio, qtd, valor):
        return self.api_comprador.post('/api/medconnect/negociacoes/',
                                       {'anuncio': anuncio.pk, 'qtd_proposta': qtd, 'val_proposta': valor},
                                       format='json')

    def test_publicacao_grava_minimo_e_flag(self):
        resp = self.api.post(self.URL, {'cd_mat': self.material.pk, 'qtd_mat': 5, 'val_base': '100.00',
                                        'ds_obs': 'Ok', 'val_minimo': '80.00', 'ie_aceita_parcial': False},
                             format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        anuncio = Anuncio.objects.latest('nr_anuncio')
        self.assertEqual(anuncio.val_minimo, Decimal('80.00'))
        self.assertFalse(anuncio.ie_aceita_parcial)

    def test_minimo_maior_que_base_e_recusado(self):
        resp = self.api.post(self.URL, {'cd_mat': self.material.pk, 'qtd_mat': 5, 'val_base': '100.00',
                                        'ds_obs': 'Ok', 'val_minimo': '150.00'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_minimo_so_aparece_para_o_anunciante(self):
        anuncio = self.criar(val_minimo=Decimal('80.00'))
        url = f'/api/medconnect/anuncio/{anuncio.pk}/'
        self.assertEqual(self.api.get(url).json()['val_minimo'], '80.00')
        self.assertNotIn('val_minimo', self.api_comprador.get(url).json())

    def test_proposta_abaixo_do_minimo_e_recusada(self):
        anuncio = self.criar(val_minimo=Decimal('80.00'))
        resp = self.propor(anuncio, 10, '79.99')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('mínimo aceito pelo vendedor', resp.content.decode())
        self.assertEqual(self.propor(anuncio, 10, '80.00').status_code, 201)

    def test_minimo_proporcional_na_compra_parcial(self):
        anuncio = self.criar(val_minimo=Decimal('80.00'))  # 8,00 por unidade
        self.assertEqual(self.propor(anuncio, 5, '39.99').status_code, 400)
        self.assertEqual(self.propor(anuncio, 5, '40.00').status_code, 201)

    def test_sem_compra_parcial_exige_lote_inteiro(self):
        anuncio = self.criar(ie_aceita_parcial=False)
        resp = self.propor(anuncio, 4, '50.00')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('não aceita compra parcial', resp.content.decode())
        self.assertEqual(self.propor(anuncio, 10, '90.00').status_code, 201)


class PlanilhaCondicoesTests(Base):
    URL = '/api/medconnect/anuncio/bulk/validate/'

    def enviar(self, cabecalho, linha):
        wb = Workbook()
        wb.active.title = 'Tutorial'
        ws = wb.create_sheet('Anúncios')
        ws.append(cabecalho)
        ws.append(linha)
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        buffer.name = 'anuncios.xlsx'
        resp = self.api.post(self.URL, {'file': buffer}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.content)
        return resp.json()['anuncios'][0]

    def test_le_condicoes_de_venda_da_planilha_nova(self):
        cabecalho = [c.titulo for c in COLUNAS_PLANILHA]
        linha = ['Luva', 'Material Hospitalar', 'X', 'Caixa', '1234', '', '', 'L1', '01/06/2025',
                 '01/06/2027', 10, '100,00', 'Ok', '80,00', 'Não']
        item = self.enviar(cabecalho, linha)
        self.assertTrue(item['valido'], item['erros'])
        self.assertEqual(item['anuncio']['val_minimo'], '80.00')
        self.assertFalse(item['anuncio']['ie_aceita_parcial'])

    def test_planilha_antiga_com_tabela_tiss_continua_funcionando(self):
        cabecalho = ['Nome do Insumo (*)', 'Categoria do Insumo (*)', 'Marca do Insumo (*)',
                     'Unidade de Medida (*)', 'Código TUSS (*)', 'Tabela TISS', 'Código SIMPRO',
                     'Código Brasíndice', 'Lote (*)', 'Data de Fabricação (*)', 'Data de Validade (*)',
                     'Quantidade (*)', 'Valor Base R$ (*)', 'Observações (*)']
        linha = ['Luva', 'Material Hospitalar', 'X', 'Caixa', '1234', '19', 'S1', '', 'L1', '01/06/2025',
                 '01/06/2027', 10, '100,00', 'Ok']
        item = self.enviar(cabecalho, linha)
        self.assertTrue(item['valido'], item['erros'])
        self.assertEqual(item['insumo']['cd_simpro'], 'S1')
        self.assertEqual(item['anuncio']['ds_lote'], 'L1')
        self.assertTrue(item['anuncio']['ie_aceita_parcial'])
