"""Testes locais da publicação de anúncios (manual, planilha e lote)."""
import io
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from openpyxl import Workbook, load_workbook
from rest_framework.test import APIClient

from anuncio.models import Anuncio
from creditos import services
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica


def criar_empresa(n, saldo=0, **extra):
    empresa = PessoaJuridica.objects.create(
        nm_pessoaj=f'Hospital {n}', email_pj=f'h{n}@teste.com', senha_pj='x', resp_tec='Resp',
        nr_cnpj=f'{n:014d}', razao_social=f'Hospital {n} LTDA', status='ATIVA', **extra,
    )
    if saldo:
        services.adicionar_creditos(empresa, saldo, 'Saldo inicial do teste', tipo='C')
        empresa.refresh_from_db()
    return empresa


LINHA_VALIDA = ['Luva nitrílica', 'Material Hospitalar', 'Marca X', 'Caixa', '1234', '', '', '',
                'L1', '01/06/2025', '01/06/2027', 10, '15,90', 'Lacrado']


def planilha(*linhas, aba='Anúncios'):
    wb = Workbook()
    wb.active.title = 'Tutorial'
    ws = wb.create_sheet(aba)
    ws.append(['cabeçalho'] * 14)
    for linha in linhas:
        ws.append(linha)
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    buffer.name = 'anuncios.xlsx'
    return buffer


def item_lote(tuss='1234', qtd=10, **anuncio):
    dados = {'ds_lote': 'L1', 'dt_fabricacao': '2025-06-01', 'dt_validade': '2027-06-01',
             'qtd_mat': qtd, 'val_base': '15.90', 'ds_obs': 'Lacrado'}
    dados.update(anuncio)
    return {
        'insumo': {'ds_mat': 'Luva nitrílica', 'ds_tipo': 'Material Hospitalar', 'ds_marca': 'Marca X',
                   'unidade_med': 'Caixa', 'cd_tuss': tuss, 'cd_tiss': None, 'cd_simpro': None,
                   'cd_brasindice': None},
        'anuncio': dados,
    }


class Base(TestCase):
    def setUp(self):
        self.empresa = criar_empresa(1, saldo=50)
        self.material = MatMed.objects.create(ds_mat='Seringa', ds_tipo='Material Hospitalar',
                                              cd_tuss='999', ds_pessoaj=self.empresa)
        self.api = APIClient()
        self.api.force_authenticate(user=self.empresa)

    def saldo(self, empresa=None):
        empresa = empresa or self.empresa
        empresa.refresh_from_db()
        return empresa.saldo_creditos


class PublicacaoManualTests(Base):
    URL = '/api/medconnect/anuncio/'

    def payload(self, **extra):
        dados = {'cd_mat': self.material.pk, 'qtd_mat': 5, 'val_base': '12.50',
                 'cd_pessoa_anunciante': self.empresa.pk, 'ds_lote': 'L9',
                 'dt_validade': '2027-01-01', 'ds_obs': 'Ok'}
        dados.update(extra)
        return dados

    def test_publica_e_cobra_cinco_creditos(self):
        resp = self.api.post(self.URL, self.payload(), format='json')

        self.assertEqual(resp.status_code, 201, resp.content)
        anuncio = Anuncio.objects.get(pk=resp.json()['nr_anuncio'])
        self.assertEqual(anuncio.ie_status, 'A')
        self.assertEqual(anuncio.cd_pessoa_anunciante, self.empresa)
        self.assertEqual(anuncio.qtd_mat, 5)
        self.assertEqual(self.saldo(), 45)

    def test_sem_saldo_retorna_402_e_nao_publica(self):
        pobre = criar_empresa(2)
        self.api.force_authenticate(user=pobre)
        material = MatMed.objects.create(ds_mat='Gaze', cd_tuss='55', ds_pessoaj=pobre)

        resp = self.api.post(self.URL, self.payload(cd_mat=material.pk, cd_pessoa_anunciante=pobre.pk), format='json')

        self.assertEqual(resp.status_code, 402)
        self.assertTrue(resp.json()['saldo_insuficiente'])
        self.assertFalse(Anuncio.objects.filter(cd_pessoa_anunciante=pobre).exists())

    def test_dados_invalidos_retornam_400_sem_cobrar(self):
        resp = self.api.post(self.URL, self.payload(cd_mat=None), format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(self.saldo(), 50)


class PlanilhaModeloTests(Base):
    def test_baixa_modelo_com_as_duas_abas(self):
        resp = self.api.get('/api/medconnect/anuncio/bulk/template/')

        self.assertEqual(resp.status_code, 200)
        self.assertIn('template_anuncios_massa.xlsx', resp['Content-Disposition'])
        wb = load_workbook(io.BytesIO(resp.content))
        self.assertEqual(wb.sheetnames, ['Tutorial', 'Anúncios'])
        cabecalhos = [c.value for c in wb['Anúncios'][1]]
        self.assertEqual(len(cabecalhos), 14)
        self.assertEqual(cabecalhos[0], 'Nome do Insumo (*)')
        self.assertEqual(cabecalhos[13], 'Observações (*)')
        self.assertEqual(wb['Anúncios'].freeze_panes, 'A2')


class PreviaPlanilhaTests(Base):
    URL = '/api/medconnect/anuncio/bulk/validate/'

    def enviar(self, arquivo):
        return self.api.post(self.URL, {'file': arquivo}, format='multipart')

    def test_previa_com_linha_valida_e_invalida(self):
        invalida = ['', 'Brinquedo', '', '', '123456789', '', '', '', '', '', '', -1, 'abc', '']
        existente = list(LINHA_VALIDA)
        existente[4] = '999'  # TUSS do insumo já cadastrado

        resp = self.enviar(planilha(LINHA_VALIDA, invalida, [None] * 14, existente))

        self.assertEqual(resp.status_code, 200, resp.content)
        corpo = resp.json()
        self.assertEqual((corpo['total'], corpo['total_validos'], corpo['total_invalidos']), (3, 2, 1))
        self.assertEqual(corpo['total_novos_insumos'], 1)

        ok, ruim, ja_existe = corpo['anuncios']
        self.assertEqual(ok['linha'], 2)
        self.assertTrue(ok['valido'])
        self.assertEqual(ok['anuncio']['dt_validade'], '2027-06-01')
        self.assertEqual(ok['anuncio']['qtd_mat'], 10)
        self.assertEqual(ok['anuncio']['val_base'], '15.90')
        self.assertFalse(ok['insumo_existente'])

        self.assertFalse(ruim['valido'])
        for trecho in ("Categoria 'Brinquedo' inválida", 'excede 8 caracteres', 'Lote é obrigatório',
                       'Quantidade deve ser um número positivo', 'Valor Base é obrigatório'):
            self.assertTrue(any(trecho in e for e in ruim['erros']), (trecho, ruim['erros']))

        self.assertEqual(ja_existe['linha'], 5)
        self.assertTrue(ja_existe['insumo_existente'])
        self.assertEqual(ja_existe['insumo_cd_mat'], self.material.pk)
        self.assertEqual(self.saldo(), 50)

    def test_planilha_vazia(self):
        resp = self.enviar(planilha())
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Nenhuma linha', resp.json()['erro'])

    def test_arquivo_invalido(self):
        arquivo = io.BytesIO(b'nao sou excel')
        arquivo.name = 'x.xlsx'
        resp = self.enviar(arquivo)
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Arquivo inválido', resp.json()['erro'])

    def test_sem_arquivo(self):
        resp = self.api.post(self.URL, {}, format='multipart')
        self.assertEqual(resp.status_code, 400)


class PublicacaoLoteTests(Base):
    URL = '/api/medconnect/anuncio/bulk/publish/'

    def publicar(self, itens):
        return self.api.post(self.URL, itens, format='json')

    def test_publica_lote_e_reaproveita_insumos(self):
        resp = self.publicar([item_lote('1234'), item_lote('1234'), item_lote('999')])

        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['total_criados'], 3)
        self.assertEqual(self.saldo(), 35)
        self.assertEqual(MatMed.objects.filter(ds_pessoaj=self.empresa, cd_tuss='1234').count(), 1)
        self.assertEqual(MatMed.objects.filter(ds_pessoaj=self.empresa, cd_tuss='999').count(), 1)
        anuncio = Anuncio.objects.get(pk=resp.json()['anuncios'][0]['nr_anuncio'])
        self.assertEqual((anuncio.ie_status, anuncio.cd_pessoa_anunciante), ('A', self.empresa))
        self.assertEqual(anuncio.dt_validade, date(2027, 6, 1))

    def test_sem_saldo(self):
        resp = self.publicar([item_lote()] * 11)  # 55 créditos > 50

        self.assertEqual(resp.status_code, 402)
        self.assertEqual(resp.json()['codigo'], 'SALDO_INSUFICIENTE')
        self.assertEqual(resp.json()['custo_total'], 55)
        self.assertFalse(Anuncio.objects.filter(cd_pessoa_anunciante=self.empresa).exists())

    def test_item_invalido_desfaz_tudo(self):
        resp = self.publicar([item_lote(), item_lote(qtd=None)])

        self.assertEqual(resp.status_code, 400)
        self.assertIn('detalhes', resp.json())
        self.assertFalse(Anuncio.objects.filter(cd_pessoa_anunciante=self.empresa).exists())
        self.assertEqual(self.saldo(), 50)

    def test_lista_vazia(self):
        resp = self.publicar([])
        self.assertEqual(resp.status_code, 400)


class CatalogoTests(Base):
    URL = '/api/medconnect/anuncio/'

    def setUp(self):
        super().setUp()
        self.vendedor = criar_empresa(3)
        luva = MatMed.objects.create(ds_mat='Luva estéril', ds_tipo='Material Hospitalar', cd_tuss='1', ds_pessoaj=self.vendedor)
        soro = MatMed.objects.create(ds_mat='Soro fisiológico', ds_tipo='Medicamento', cd_tuss='2', ds_pessoaj=self.vendedor)
        futuro = date.today() + timedelta(days=90)

        def anuncio(mat, valor, validade=futuro):
            return Anuncio.objects.create(cd_mat=mat, qtd_mat=1, val_base=Decimal(valor),
                                          cd_pessoa_anunciante=self.vendedor, dt_validade=validade)

        self.luva = anuncio(luva, '30')
        self.soro = anuncio(soro, '10')
        self.vencido = anuncio(soro, '5', validade=date.today() - timedelta(days=1))

    def ids(self, resp):
        return [a['nr_anuncio'] for a in resp.json()]

    def test_padrao_mais_recentes_e_inativa_vencidos(self):
        resp = self.api.get(self.URL)

        self.assertEqual(self.ids(resp), [self.soro.pk, self.luva.pk])
        self.vencido.refresh_from_db()
        self.assertEqual(self.vencido.ie_status, 'I')

    def test_recomendados_primeiro(self):
        self.empresa.interesses_ia = 'luva'
        self.empresa.save()

        resp = self.api.get(self.URL)

        self.assertEqual(self.ids(resp), [self.luva.pk, self.soro.pk])
        self.assertTrue(resp.json()[0]['is_recommended'])

    def test_filtro_por_nome(self):
        resp = self.api.get(self.URL, {'ds_mat': 'soro'})
        self.assertEqual(self.ids(resp), [self.soro.pk])
