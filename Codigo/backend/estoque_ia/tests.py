"""
Testes da análise de estoque com IA.

A IA real nunca é chamada: os testes de API trocam google.genai.Client
por um dublê, e os de unidade injetam um provedor simulado.
"""
import io
import json
from datetime import date, timedelta
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from openpyxl import Workbook, load_workbook
from rest_framework.test import APIClient

from creditos import services
from creditos.models import TransacaoCredito
from estoque_ia import tipos
from estoque_ia.analise import MotorAnaliseEstoque
from estoque_ia.assistente import AnalistaEstoqueIA
from estoque_ia.leitor import LeitorPlanilhaEstoque, PlanilhaEstoqueInvalidaError
from estoque_ia.models import AnaliseEstoque
from estoque_ia.planilhas import gerar_exemplo, gerar_modelo
from gemini_api.provedores import IAIndisponivelError, ProvedorIA, RespostaInvalidaIAError
from anuncio.models import Anuncio
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica

CLIENTE_GENAI = 'google.genai.Client'
HOJE = date.today()
CABECALHO_ERP = ('CD_MATERIAL', 'DS_MATERIAL', 'DT_MOVIMENTO_ESTOQUE', 'OPERA_ESTO', 'QTD_MOVIMENTO')
CABECALHO_MODELO = ('Código do Material', 'Descrição do Material (*)', 'Data da Movimentação (*)',
                    'Tipo de Movimentação (*)', 'Quantidade (*)', 'Unidade de Medida', 'Lote', 'Data de Validade')
CABECALHO_SALDO = ('Código do Material', 'Descrição do Material (*)', 'Saldo Atual (*)', 'Unidade de Medida',
                   'Lote', 'Data de Validade', 'Valor Unitário (R$)')


def dia(n: int) -> date:
    """n dias atrás."""
    return HOJE - timedelta(days=n)


def xlsx(abas: dict[str, list[tuple]], nome='estoque.xlsx') -> io.BytesIO:
    livro = Workbook()
    livro.remove(livro.active)
    for titulo, linhas in abas.items():
        aba = livro.create_sheet(titulo)
        for linha in linhas:
            aba.append(list(linha))
    buffer = io.BytesIO()
    livro.save(buffer)
    buffer.seek(0)
    buffer.name = nome
    return buffer


def upload(buffer: io.BytesIO) -> SimpleUploadedFile:
    return SimpleUploadedFile(buffer.name, buffer.getvalue())


def ler(buffer) -> object:
    return LeitorPlanilhaEstoque(buffer, buffer.name).ler()


def analisar(buffer, **kwargs):
    return MotorAnaliseEstoque(**kwargs).analisar(ler(buffer))


def por_codigo(resultado) -> dict:
    return {i['codigo']: i for i in resultado.itens}


def movimentacoes_basicas(dias=90) -> list[tuple]:
    """Três perfis: consumo diário, comprado e parado, e quase parado."""
    linhas = [CABECALHO_MODELO]
    linhas.append(('1', 'Seringa 10ml', dia(dias), 'Entrada - Compra', 1000, 'Unidade', 'L1', None))
    for n in range(dias - 1, 0, -1):
        linhas.append(('1', 'Seringa 10ml', dia(n), 'Saída - Consumo / Dispensação', 10, 'Unidade', '', None))
    linhas.append(('2', 'Torneirinha 3 vias', dia(dias - 2), 'Entrada - Compra', 120, 'Unidade', 'L2', None))
    linhas.append(('3', 'Garamicina 80mg', dia(dias - 3), 'Entrada - Compra', 130, 'Ampola', 'L3', None))
    linhas.append(('3', 'Garamicina 80mg', dia(min(40, dias - 4)), 'Saída - Consumo / Dispensação', 4, 'Ampola', '', None))
    linhas.append(('1', 'Seringa 10ml', dia(5), 'Transferência interna (entre estoques)', 50, 'Unidade', '', None))
    return linhas


class ProvedorSimulado(ProvedorIA):
    def __init__(self, resposta=None, erro=None):
        self.resposta = resposta
        self.erro = erro
        self.prompts = []

    def gerar_texto(self, prompt):
        raise NotImplementedError

    def gerar_json(self, prompt):
        self.prompts.append(prompt)
        if self.erro:
            raise self.erro
        return self.resposta


# ── Tipos de movimentação ────────────────────────────────────────────

class ClassificacaoTiposTests(SimpleTestCase):

    def test_textos_de_erp(self):
        casos = {
            'Saída - Dispensação por Prescrição': tipos.SAIDA_CONSUMO,
            'Saída - Transferência entre Estoques': tipos.TRANSFERENCIA_INTERNA,
            'Entrada - Transferência entre Estoques': tipos.TRANSFERENCIA_INTERNA,
            'Saída - Consumo do Setor': tipos.SAIDA_CONSUMO,
            'Entrada - Compra (Nota Fiscal)': tipos.ENTRADA_COMPRA,
            'Saída - Consumo na Manipulação': tipos.SAIDA_CONSUMO,
            'Entrada - Transferência entre Unidades': tipos.ENTRADA_TRANSFERENCIA,
            'Entrada - Produção da Manipulação': tipos.ENTRADA_PRODUCAO,
            'Entrada - Ajuste de Inventário': tipos.ENTRADA_AJUSTE,
            'Saída - Perda por Vencimento': tipos.SAIDA_PERDA_VENCIMENTO,
            'Saída - Ajuste de Inventário': tipos.SAIDA_AJUSTE,
            'Saída - Perda por Quebra/Contaminação': tipos.SAIDA_PERDA_OUTRA,
            'Saída - Consumo de Consignado': tipos.SAIDA_CONSUMO,
            'SAIDA - DISPENSACAO': tipos.SAIDA_CONSUMO,
            'Compra': tipos.ENTRADA_COMPRA,
            'Empréstimo informal': tipos.DESCONHECIDO,
            '': tipos.DESCONHECIDO,
        }
        for texto, esperado in casos.items():
            with self.subTest(texto=texto):
                self.assertEqual(tipos.classificar(texto), esperado)

    def test_todos_os_tipos_da_planilha_modelo_sao_reconhecidos(self):
        for texto, categoria, _ in tipos.TIPOS_PADRAO:
            with self.subTest(texto=texto):
                self.assertEqual(tipos.classificar(texto), categoria)


# ── Leitura ──────────────────────────────────────────────────────────

class LeitorTests(SimpleTestCase):

    def test_le_exportacao_de_erp_com_datas_em_texto(self):
        arquivo = xlsx({
            'SQL': [('select * from movimento_estoque',)],
            'Exportar Planilha': [
                CABECALHO_ERP,
                (37, 'Agulha 40x12', dia(3).strftime('%d/%m/%y'), 'Saída - Dispensação por Prescrição', 4),
                (37, 'Agulha 40x12', dia(2).strftime('%d/%m/%y'), 'Entrada - Compra (Nota Fiscal)', 100),
            ],
        })
        leitura = ler(arquivo)
        self.assertEqual(leitura.aba_movimentacoes, 'Exportar Planilha')
        self.assertEqual(len(leitura.movimentacoes), 2)
        primeira = leitura.movimentacoes[0]
        self.assertEqual((primeira.codigo, primeira.data, primeira.categoria), ('37', dia(3), tipos.SAIDA_CONSUMO))
        self.assertFalse(leitura.tem_aba_saldo)

    def test_le_csv_com_ponto_e_virgula_e_decimal_brasileiro(self):
        conteudo = 'Descrição;Data;Tipo;Quantidade\n' \
                   f'Luva M;{dia(1):%d/%m/%Y};Saída - Consumo;1.250,5\n'
        arquivo = io.BytesIO(conteudo.encode('cp1252'))
        leitura = LeitorPlanilhaEstoque(arquivo, 'estoque.csv').ler()
        self.assertEqual(leitura.movimentacoes[0].quantidade, 1250.5)
        self.assertEqual(leitura.movimentacoes[0].descricao, 'Luva M')

    def test_le_a_aba_de_saldo(self):
        arquivo = xlsx({
            'Movimentações': movimentacoes_basicas(),
            'Saldo Atual': [CABECALHO_SALDO, ('2', 'Torneirinha 3 vias', 120, 'Unidade', 'L2', HOJE + timedelta(days=90), 1.4)],
        })
        leitura = ler(arquivo)
        self.assertTrue(leitura.tem_aba_saldo)
        self.assertEqual(leitura.saldos[0].saldo, 120)
        self.assertEqual(leitura.saldos[0].valor_unitario, 1.4)

    def test_colunas_obrigatorias_ausentes(self):
        arquivo = xlsx({'Dados': [('Descrição', 'Data', 'Quantidade'), ('Luva', dia(1), 3)]})
        with self.assertRaisesMessage(PlanilhaEstoqueInvalidaError, 'Tipo de Movimentação'):
            ler(arquivo)

    def test_arquivo_que_nao_e_planilha(self):
        arquivo = io.BytesIO(b'isto nao e um xlsx')
        with self.assertRaises(PlanilhaEstoqueInvalidaError):
            LeitorPlanilhaEstoque(arquivo, 'estoque.xlsx').ler()

    def test_formato_nao_aceito(self):
        with self.assertRaisesMessage(PlanilhaEstoqueInvalidaError, 'Formato não aceito'):
            LeitorPlanilhaEstoque(io.BytesIO(b'x'), 'estoque.pdf').ler()

    def test_linhas_com_problema_viram_alertas(self):
        arquivo = xlsx({'Movimentações': [
            CABECALHO_MODELO,
            ('1', 'Luva', dia(2), 'Saída - Consumo / Dispensação', 5),
            ('1', 'Luva', '31/02/2026', 'Saída - Consumo / Dispensação', 5),
            ('1', 'Luva', dia(2), 'Empréstimo informal', 5),
            ('1', 'Luva', dia(2), 'Saída - Consumo / Dispensação', 'dez'),
            ('1', 'Luva', HOJE + timedelta(days=3), 'Saída - Consumo / Dispensação', 5),
        ]})
        leitura = ler(arquivo)
        titulos = {a.titulo for a in leitura.alertas}
        self.assertEqual(len(leitura.movimentacoes), 1)
        self.assertIn('Linhas ignoradas', titulos)
        self.assertIn('Tipos de movimentação não reconhecidos', titulos)

    def test_sem_nenhuma_linha_valida(self):
        arquivo = xlsx({'Movimentações': [CABECALHO_MODELO, ('1', 'Luva', 'x', 'Saída - Consumo', 5)]})
        with self.assertRaisesMessage(PlanilhaEstoqueInvalidaError, 'Nenhuma movimentação válida'):
            ler(arquivo)


# ── Motor estatístico ────────────────────────────────────────────────

class MotorAnaliseTests(SimpleTestCase):

    def test_perfis_e_sugestoes(self):
        itens = por_codigo(analisar(xlsx({'Movimentações': movimentacoes_basicas()})))

        seringa = itens['1']
        self.assertEqual(seringa['consumo'], 890)
        self.assertEqual(seringa['saldo'], 110)
        self.assertTrue(seringa['saldo_estimado'])
        self.assertFalse(seringa['anunciar'])
        self.assertEqual(seringa['transferencias_internas'], 1)

        torneira = itens['2']
        self.assertEqual(torneira['perfil'], 'sem_giro')
        self.assertTrue(torneira['anunciar'])
        self.assertEqual(torneira['qtd_sugerida'], 120)
        self.assertEqual(torneira['prioridade'], 'alta')

        garamicina = itens['3']
        self.assertEqual(garamicina['perfil'], 'giro_raro')
        self.assertTrue(garamicina['anunciar'])
        # reserva: o maior entre 180 dias de consumo com margem e 2x a maior saída (8)
        self.assertLess(garamicina['qtd_sugerida'], 126 - 8 + 1)

    def test_transferencia_interna_nao_conta_como_consumo(self):
        resultado = analisar(xlsx({'Movimentações': movimentacoes_basicas()}))
        self.assertEqual(resultado.indicadores['transferencias_internas'], 1)
        self.assertEqual(por_codigo(resultado)['1']['consumo'], 890)

    def test_fefo_estima_a_sobra_no_vencimento(self):
        linhas = [CABECALHO_MODELO]
        for n in range(60, 0, -1):  # 1 unidade por dia
            linhas.append(('9', 'Clorexidina 2%', dia(n), 'Saída - Consumo / Dispensação', 1, 'Frasco', '', None))
        saldo = [CABECALHO_SALDO,
                 ('9', 'Clorexidina 2%', 30, 'Frasco', 'A', HOJE + timedelta(days=20), 21),
                 ('9', 'Clorexidina 2%', 100, 'Frasco', 'B', HOJE + timedelta(days=60), 21)]
        item = por_codigo(analisar(xlsx({'Movimentações': linhas, 'Saldo Atual': saldo})))['9']

        # Consumo projetado = 1,2/dia. Lote A: usa 24 até vencer, sobram 6.
        # Lote B: até o dia 60 cabem 72, menos os 24 já usados = 48; sobram 52.
        self.assertEqual(item['qtd_risco_vencimento'], 58)
        self.assertEqual(item['perfil'], 'risco_vencimento')
        self.assertEqual(item['lote_sugerido'], 'A')
        self.assertEqual(item['qtd_sugerida'], 58)
        self.assertEqual(item['valor_excedente'], 58 * 21)
        self.assertFalse(item['saldo_estimado'])

    def test_lote_vencido_gera_alerta_critico_e_nao_e_anunciado(self):
        linhas = [CABECALHO_MODELO, ('5', 'Dipirona', dia(30), 'Entrada - Compra', 50, 'Ampola', 'V', None)]
        saldo = [CABECALHO_SALDO, ('5', 'Dipirona', 50, 'Ampola', 'V', dia(3), 1)]
        resultado = analisar(xlsx({'Movimentações': linhas, 'Saldo Atual': saldo}))
        item = por_codigo(resultado)['5']
        self.assertEqual(item['qtd_vencida'], 50)
        self.assertFalse(item['anunciar'])
        criticos = {a['titulo'] for a in resultado.alertas if a['nivel'] == 'critico'}
        self.assertIn('Lotes vencidos em estoque', criticos)

    def test_estoque_baixo_gera_alerta(self):
        linhas = [CABECALHO_MODELO]
        for n in range(60, 0, -1):
            linhas.append(('7', 'Equipo macrogotas', dia(n), 'Saída - Consumo / Dispensação', 10, 'Unidade', '', None))
        saldo = [CABECALHO_SALDO, ('7', 'Equipo macrogotas', 50, 'Unidade', '', None, None)]
        resultado = analisar(xlsx({'Movimentações': linhas, 'Saldo Atual': saldo}))
        item = por_codigo(resultado)['7']
        self.assertEqual((item['perfil'], item['cobertura_dias'], item['anunciar']), ('estoque_baixo', 5, False))
        self.assertIn('Itens com estoque baixo', {a['titulo'] for a in resultado.alertas})

    def test_item_fora_da_aba_de_saldo_fica_zerado(self):
        saldo = [CABECALHO_SALDO, ('2', 'Torneirinha 3 vias', 120, 'Unidade', '', None, None)]
        resultado = analisar(xlsx({'Movimentações': movimentacoes_basicas(), 'Saldo Atual': saldo}))
        self.assertEqual(por_codigo(resultado)['1']['saldo'], 0)
        self.assertIn('Itens fora da aba de saldo', {a['titulo'] for a in resultado.alertas})

    def test_periodo_curto_gera_alerta(self):
        critico = analisar(xlsx({'Movimentações': movimentacoes_basicas(dias=10)}))
        self.assertEqual(critico.alertas[0]['titulo'], 'Período de estoque muito curto')
        self.assertEqual(critico.alertas[0]['nivel'], 'critico')

        curto = analisar(xlsx({'Movimentações': movimentacoes_basicas(dias=40)}))
        self.assertIn('Período de estoque curto', {a['titulo'] for a in curto.alertas})

        longo = analisar(xlsx({'Movimentações': movimentacoes_basicas(dias=120)}))
        self.assertFalse({'Período de estoque curto', 'Período de estoque muito curto'} & {a['titulo'] for a in longo.alertas})

    def test_dados_desatualizados(self):
        linhas = [CABECALHO_MODELO,
                  ('1', 'Luva', dia(200), 'Entrada - Compra', 10, '', '', None),
                  ('1', 'Luva', dia(100), 'Saída - Consumo / Dispensação', 1, '', '', None)]
        resultado = analisar(xlsx({'Movimentações': linhas}))
        self.assertIn('Dados desatualizados', {a['titulo'] for a in resultado.alertas})

    def test_item_que_so_circula_entre_estoques_perde_prioridade(self):
        linhas = [CABECALHO_MODELO, ('8', 'Agulha de plexo', dia(80), 'Entrada - Compra', 300, '', '', None)]
        for n in range(70, 0, -7):
            linhas.append(('8', 'Agulha de plexo', dia(n), 'Saída - Transferência entre Estoques', 30, '', '', None))
        resultado = analisar(xlsx({'Movimentações': linhas}))
        item = por_codigo(resultado)['8']
        self.assertIn('circula_sem_consumo', item['sinais'])
        self.assertEqual(item['prioridade'], 'media')
        self.assertIn('Itens que circulam sem consumo registrado', {a['titulo'] for a in resultado.alertas})

    def test_horizonte_maior_sugere_menos(self):
        arquivo = xlsx({'Movimentações': movimentacoes_basicas()})
        curto = por_codigo(MotorAnaliseEstoque(90).analisar(ler(arquivo)))['3']['qtd_sugerida']
        arquivo.seek(0)
        longo = por_codigo(MotorAnaliseEstoque(365).analisar(ler(arquivo)))['3']['qtd_sugerida']
        self.assertGreater(curto, longo)


# ── IA ───────────────────────────────────────────────────────────────

class AnalistaEstoqueIATests(SimpleTestCase):

    def setUp(self):
        self.resultado = analisar(xlsx({'Movimentações': movimentacoes_basicas()}))
        candidatos = AnalistaEstoqueIA.candidatos(self.resultado)
        self.ids = {item['codigo']: f'i{n}' for n, item in enumerate(candidatos, start=1)}

    def test_aplica_a_resposta_e_respeita_os_limites(self):
        provedor = ProvedorSimulado({
            'resumo': 'Estoque com itens parados.',
            'recomendacoes': ['Rever o ponto de pedido da torneirinha.', 42],
            'itens': [
                {'id': self.ids['2'], 'anunciar': True, 'quantidade': 9999, 'prioridade': 'média',
                 'justificativa': 'Sem uso em 90 dias.'},
                {'id': self.ids['3'], 'anunciar': False, 'quantidade': 10, 'justificativa': 'Antibiótico de reserva.'},
                {'id': 'i999', 'anunciar': True, 'quantidade': 1},
            ],
        })
        resumo, recomendacoes = AnalistaEstoqueIA(provedor).enriquecer(self.resultado)
        itens = por_codigo(self.resultado)

        self.assertEqual(resumo, 'Estoque com itens parados.')
        self.assertEqual(recomendacoes, ['Rever o ponto de pedido da torneirinha.'])
        self.assertEqual(itens['2']['qtd_sugerida'], 120)  # cortado no saldo
        self.assertEqual(itens['2']['prioridade'], 'media')
        self.assertEqual(itens['2']['fonte_justificativa'], 'ia')
        self.assertFalse(itens['3']['anunciar'])
        self.assertEqual(itens['3']['qtd_sugerida'], 0)
        self.assertEqual(self.resultado.indicadores['total_sugeridos'], 1)
        self.assertIn('Torneirinha 3 vias', provedor.prompts[0])

    def test_resposta_sem_itens_e_invalida(self):
        with self.assertRaises(RespostaInvalidaIAError):
            AnalistaEstoqueIA(ProvedorSimulado({'resumo': 'x'})).enriquecer(self.resultado)


# ── API ──────────────────────────────────────────────────────────────

def criar_empresa(n, saldo=0):
    empresa = PessoaJuridica.objects.create(
        nm_pessoaj=f'Hospital {n}', email_pj=f'h{n}@teste.com', senha_pj='x', resp_tec='Resp',
        nr_cnpj=f'{n:014d}', razao_social=f'Hospital {n} LTDA', status='ATIVA',
    )
    if saldo:
        services.adicionar_creditos(empresa, saldo, 'Saldo inicial do teste', tipo='C')
        empresa.refresh_from_db()
    return empresa


def resposta_ia(mock_cliente, conteudo: dict):
    mock_cliente.return_value.models.generate_content.return_value.text = json.dumps(conteudo)


class AnaliseEstoqueAPITests(TestCase):
    URL = '/api/medconnect/estoque-ia/'

    def setUp(self):
        self.empresa = criar_empresa(1, saldo=10)
        self.api = APIClient()
        self.api.force_authenticate(user=self.empresa)

    def enviar(self, arquivo=None, **dados):
        arquivo = arquivo or xlsx({'Movimentações': movimentacoes_basicas()})
        return self.api.post(f'{self.URL}analisar/', {'file': upload(arquivo), **dados}, format='multipart')

    def saldo(self):
        self.empresa.refresh_from_db()
        return self.empresa.saldo_creditos

    @patch(CLIENTE_GENAI)
    def test_analisa_cobra_e_salva_no_historico(self, cliente):
        resposta_ia(cliente, {'resumo': 'Resumo da IA', 'recomendacoes': [],
                              'itens': [{'id': 'i1', 'anunciar': True, 'quantidade': 100, 'prioridade': 'alta',
                                         'justificativa': 'Parado.'}]})
        MatMed.objects.create(ds_mat='Torneirinha 3 Vias (pacote c/ 10)', cd_tuss='87654321', ds_pessoaj=self.empresa)
        MatMed.objects.create(ds_mat='Outro nome', cd_tuss='3', ds_pessoaj=self.empresa)

        resp = self.enviar()

        self.assertEqual(resp.status_code, 201)
        corpo = resp.json()
        self.assertTrue(corpo['ia_utilizada'])
        self.assertEqual(corpo['creditos_cobrados'], 3)
        self.assertEqual(corpo['resumo_ia'], 'Resumo da IA')
        torneira = next(i for i in corpo['itens'] if i['codigo'] == '2')
        self.assertIsNotNone(torneira['cd_mat'])  # pelo nome, ignorando o que está entre parênteses
        garamicina = next(i for i in corpo['itens'] if i['codigo'] == '3')
        self.assertEqual(garamicina['cd_mat'], MatMed.objects.get(cd_tuss='3').cd_mat)  # pelo código
        self.assertEqual(self.saldo(), 7)
        self.assertEqual(TransacaoCredito.objects.get(pessoa_juridica=self.empresa, tipo='D').funcionalidade,
                         'IA_ANALISE_ESTOQUE')
        self.assertEqual(AnaliseEstoque.objects.filter(empresa=self.empresa).count(), 1)

    @patch(CLIENTE_GENAI)
    def test_ia_indisponivel_salva_analise_estatistica_sem_cobrar(self, cliente):
        cliente.return_value.models.generate_content.side_effect = Exception('503 UNAVAILABLE')

        with self.assertLogs('estoque_ia.servico', level='WARNING'):
            resp = self.enviar()

        self.assertEqual(resp.status_code, 201)
        self.assertFalse(resp.json()['ia_utilizada'])
        self.assertEqual(resp.json()['alertas'][0]['titulo'], 'Análise feita sem a IA')
        self.assertEqual(self.saldo(), 10)

    @patch(CLIENTE_GENAI)
    def test_sem_saldo_retorna_402_sem_ler_nem_chamar_a_ia(self, cliente):
        self.api.force_authenticate(user=criar_empresa(2))
        resp = self.enviar()
        self.assertEqual(resp.status_code, 402)
        self.assertTrue(resp.json()['saldo_insuficiente'])
        cliente.return_value.models.generate_content.assert_not_called()

    def test_planilha_invalida_retorna_400(self):
        resp = self.enviar(xlsx({'Dados': [('A', 'B'), (1, 2)]}))
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Descrição do Material', resp.json()['erro'])
        self.assertEqual(self.saldo(), 10)

    def test_sem_arquivo(self):
        resp = self.api.post(f'{self.URL}analisar/', {}, format='multipart')
        self.assertEqual(resp.status_code, 400)

    @patch(CLIENTE_GENAI)
    def test_historico_compara_com_a_analise_anterior(self, cliente):
        resposta_ia(cliente, {'resumo': '', 'itens': []})
        primeira = self.enviar().json()
        segunda = self.enviar(xlsx({'Movimentações': movimentacoes_basicas(dias=100)})).json()

        self.assertEqual(segunda['analise_anterior_id'], primeira['id'])
        torneira = next(i for i in segunda['itens'] if i['codigo'] == '2')
        self.assertEqual(torneira['anterior']['saldo'], 120)
        self.assertIn('Sobras recorrentes', {a['titulo'] for a in segunda['alertas']})

        lista = self.api.get(f'{self.URL}analises/').json()
        self.assertEqual([a['id'] for a in lista], [segunda['id'], primeira['id']])
        self.assertNotIn('itens', lista[0])

    @patch(CLIENTE_GENAI)
    def test_detalhe_relatorio_e_exclusao_so_da_propria_empresa(self, cliente):
        resposta_ia(cliente, {'resumo': '', 'itens': []})
        analise_id = self.enviar().json()['id']

        detalhe = self.api.get(f'{self.URL}analises/{analise_id}/')
        self.assertEqual(detalhe.status_code, 200)
        self.assertEqual(len(detalhe.json()['itens']), 3)

        relatorio = self.api.get(f'{self.URL}analises/{analise_id}/relatorio/')
        self.assertEqual(relatorio.status_code, 200)
        livro = load_workbook(io.BytesIO(relatorio.content))
        self.assertEqual(livro.sheetnames, ['Resumo', 'Sugestões para anunciar', 'Estoque analisado'])

        outra = APIClient()
        outra.force_authenticate(user=criar_empresa(3))
        self.assertEqual(outra.get(f'{self.URL}analises/{analise_id}/').status_code, 404)
        self.assertEqual(outra.delete(f'{self.URL}analises/{analise_id}/').status_code, 404)

        self.assertEqual(self.api.delete(f'{self.URL}analises/{analise_id}/').status_code, 204)
        self.assertFalse(AnaliseEstoque.objects.filter(pk=analise_id).exists())

    @patch(CLIENTE_GENAI)
    def test_historico_fica_limitado(self, cliente):
        resposta_ia(cliente, {'resumo': '', 'itens': []})
        services.adicionar_creditos(self.empresa, 200, 'Mais saldo', tipo='C')
        with patch.object(AnaliseEstoque, 'LIMITE_POR_EMPRESA', 2):
            ids = [self.enviar(xlsx({'Movimentações': movimentacoes_basicas(dias=d)})).json()['id'] for d in (90, 95, 100)]
        restantes = list(AnaliseEstoque.objects.filter(empresa=self.empresa).values_list('pk', flat=True))
        self.assertEqual(restantes, [ids[2], ids[1]])

    @patch(CLIENTE_GENAI)
    def test_mesma_planilha_substitui_a_analise_anterior_e_mantem_publicados(self, cliente):
        resposta_ia(cliente, {'resumo': '', 'itens': []})
        conteudo = xlsx({'Movimentações': movimentacoes_basicas()}).getvalue()

        def enviar_mesma():
            arquivo = io.BytesIO(conteudo)
            arquivo.name = 'estoque.xlsx'
            return self.enviar(arquivo).json()

        primeira = enviar_mesma()
        antiga = AnaliseEstoque.objects.get(pk=primeira['id'])
        for item in antiga.itens:
            if item['codigo'] == '2':
                item['publicado'] = {'nr_anuncio': 99, 'qtd_mat': 120, 'cd_mat': None, 'data': '2026-11-23'}
        antiga.save()

        segunda = enviar_mesma()

        self.assertEqual(list(AnaliseEstoque.objects.filter(empresa=self.empresa).values_list('pk', flat=True)),
                         [segunda['id']])
        torneira = next(i for i in segunda['itens'] if i['codigo'] == '2')
        self.assertEqual(torneira['publicado']['nr_anuncio'], 99)
        self.assertIn('Planilha já analisada', {a['titulo'] for a in segunda['alertas']})
        self.assertIsNone(segunda['analise_anterior_id'])

    @patch(CLIENTE_GENAI)
    def test_mesma_planilha_com_outro_horizonte_fica_nas_duas(self, cliente):
        resposta_ia(cliente, {'resumo': '', 'itens': []})
        conteudo = xlsx({'Movimentações': movimentacoes_basicas()}).getvalue()
        for horizonte in (90, 365):
            arquivo = io.BytesIO(conteudo)
            arquivo.name = 'estoque.xlsx'
            self.enviar(arquivo, horizonte_dias=horizonte)
        self.assertEqual(AnaliseEstoque.objects.filter(empresa=self.empresa).count(), 2)

    def test_downloads_de_modelo_e_exemplos(self):
        modelo = self.api.get(f'{self.URL}modelo/')
        self.assertEqual(modelo.status_code, 200)
        livro = load_workbook(io.BytesIO(modelo.content))
        self.assertEqual(livro.sheetnames, ['Tutorial', 'Movimentações', 'Saldo Atual', 'Tipos de Movimentação'])

        for tipo in ('completo', 'erp', 'alertas'):
            with self.subTest(tipo=tipo):
                self.assertEqual(self.api.get(f'{self.URL}exemplo/{tipo}/').status_code, 200)
        self.assertEqual(self.api.get(f'{self.URL}exemplo/outro/').status_code, 404)

    def test_exige_login(self):
        self.assertEqual(APIClient().get(f'{self.URL}analises/').status_code, 401)


class PlanilhasTests(SimpleTestCase):

    def test_modelo_vazio_nao_tem_movimentacoes(self):
        arquivo = io.BytesIO(gerar_modelo().conteudo)
        with self.assertRaisesMessage(PlanilhaEstoqueInvalidaError, 'Nenhuma movimentação válida'):
            LeitorPlanilhaEstoque(arquivo, 'modelo.xlsx').ler()

    def test_exemplos_geram_os_alertas_e_perfis_esperados(self):
        def resultado(tipo):
            planilha = gerar_exemplo(tipo)
            return MotorAnaliseEstoque().analisar(LeitorPlanilhaEstoque(io.BytesIO(planilha.conteudo), planilha.nome_arquivo).ler())

        completo = resultado('completo')
        self.assertTrue(completo.indicadores['saldo_informado'])
        self.assertGreater(completo.indicadores['total_sugeridos'], 5)
        self.assertIn('Lotes vencidos em estoque', {a['titulo'] for a in completo.alertas})

        erp = resultado('erp')
        self.assertFalse(erp.indicadores['saldo_informado'])
        self.assertGreater(erp.indicadores['perfis']['sem_giro'], 0)

        alertas = {a['titulo'] for a in resultado('alertas').alertas}
        for titulo in ('Período de estoque muito curto', 'Linhas ignoradas', 'Tipos de movimentação não reconhecidos'):
            self.assertIn(titulo, alertas)


class PublicarSugestoesAPITests(TestCase):
    """Configurar e publicar as sugestões direto da análise (cadastra o insumo que faltar)."""

    @patch(CLIENTE_GENAI)
    def setUp(self, cliente):
        resposta_ia(cliente, {'resumo': '', 'itens': []})
        self.empresa = criar_empresa(1, saldo=50)
        self.api = APIClient()
        self.api.force_authenticate(user=self.empresa)
        self.cadastrado = MatMed.objects.create(
            ds_mat='Torneirinha 3 vias', ds_tipo='Material Hospitalar', ds_marca='BD', unidade_med='Unidade',
            cd_tuss='11112222', ds_pessoaj=self.empresa,
        )
        arquivo = xlsx({'Movimentações': movimentacoes_basicas()})
        resp = self.api.post('/api/medconnect/estoque-ia/analisar/', {'file': upload(arquivo)}, format='multipart')
        self.analise = resp.json()
        self.url = f"/api/medconnect/estoque-ia/analises/{self.analise['id']}/publicar/"

    def item(self, codigo):
        return next(i for i in self.analise['itens'] if i['codigo'] == codigo)

    @staticmethod
    def anuncio(**extra):
        dados = {'ds_lote': 'L1', 'dt_fabricacao': dia(100).isoformat(),
                 'dt_validade': (HOJE + timedelta(days=200)).isoformat(), 'qtd_mat': 50, 'val_base': '70,00',
                 'ds_obs': 'Excedente lacrado.', 'val_minimo': None, 'ie_aceita_parcial': True}
        dados.update(extra)
        return dados

    def saldo(self):
        self.empresa.refresh_from_db()
        return self.empresa.saldo_creditos

    def test_detalhe_traz_os_dados_do_insumo_cadastrado(self):
        torneira = self.item('2')
        self.assertEqual(torneira['insumo']['cd_tuss'], '11112222')
        self.assertIsNone(self.item('3')['insumo'])

    def test_publica_com_insumo_cadastrado_e_com_insumo_novo(self):
        saldo_antes = self.saldo()
        resp = self.api.post(self.url, [
            {'chave': '2', 'insumo': {'cd_mat': self.cadastrado.cd_mat}, 'anuncio': self.anuncio()},
            {'chave': '3', 'insumo': {'ds_mat': 'Garamicina 80mg', 'ds_tipo': 'Medicamento', 'ds_marca': 'MSD',
                                      'unidade_med': 'ampola', 'cd_tuss': '90001234'},
             'anuncio': self.anuncio(qtd_mat=80, ie_aceita_parcial=False)},
        ], format='json')

        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['total_criados'], 2)
        self.assertEqual(self.saldo(), saldo_antes - 10)  # 5 créditos por anúncio
        novo = MatMed.objects.get(cd_tuss='90001234')
        self.assertEqual((novo.ds_pessoaj, novo.unidade_med), (self.empresa, 'Ampola'))
        self.assertEqual(Anuncio.objects.filter(cd_pessoa_anunciante=self.empresa).count(), 2)

        itens = {i['codigo']: i for i in resp.json()['analise']['itens']}
        self.assertEqual(itens['2']['publicado']['qtd_mat'], 50)
        self.assertEqual(itens['3']['publicado']['cd_mat'], novo.cd_mat)
        self.assertEqual(itens['3']['insumo']['cd_mat'], novo.cd_mat)  # agora ligado ao insumo criado

    def test_linha_invalida_nao_publica_nada_nem_cobra(self):
        saldo_antes = self.saldo()
        resp = self.api.post(self.url, [
            {'chave': '2', 'insumo': {'cd_mat': self.cadastrado.cd_mat}, 'anuncio': self.anuncio()},
            {'chave': '3', 'insumo': {'ds_mat': 'Garamicina'}, 'anuncio': self.anuncio(dt_validade=dia(1).isoformat())},
        ], format='json')

        self.assertEqual(resp.status_code, 400)
        detalhe = resp.json()['detalhes'][0]
        self.assertEqual(detalhe['index'], 1)
        self.assertTrue(any('TUSS' in e for e in detalhe['erros']))
        self.assertTrue(any('vencido' in e for e in detalhe['erros']))
        self.assertEqual(self.saldo(), saldo_antes)
        self.assertFalse(Anuncio.objects.filter(cd_pessoa_anunciante=self.empresa).exists())

    def test_nao_deixa_trocar_o_insumo_vinculado(self):
        outro = MatMed.objects.create(ds_mat='Outro insumo', ds_tipo='Medicamento', ds_marca='X', unidade_med='Ampola',
                                      cd_tuss='55556666', ds_pessoaj=self.empresa)
        resp = self.api.post(self.url, [
            {'chave': '2', 'insumo': {'cd_mat': outro.cd_mat}, 'anuncio': self.anuncio()},              # vinculado: trocou
            {'chave': '3', 'insumo': {'cd_mat': self.cadastrado.cd_mat}, 'anuncio': self.anuncio()},    # sem vínculo: escolheu um
        ], format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual([d['index'] for d in resp.json()['detalhes']], [0, 1])
        self.assertIn('não pode ser trocado', resp.json()['detalhes'][0]['erros'][0])
        self.assertFalse(Anuncio.objects.exists())

    def test_insumo_novo_com_tuss_existente_reaproveita_o_cadastrado(self):
        resp = self.api.post(self.url, [{'chave': '3', 'insumo': {'ds_mat': 'Garamicina', 'cd_tuss': '11112222'},
                                         'anuncio': self.anuncio()}], format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(Anuncio.objects.get().cd_mat, self.cadastrado)
        self.assertEqual(MatMed.objects.filter(ds_pessoaj=self.empresa).count(), 1)

    def test_nao_aceita_insumo_de_outra_instituicao(self):
        outro = MatMed.objects.create(ds_mat='Alheio', ds_tipo='Medicamento', ds_marca='X', unidade_med='Ampola',
                                      cd_tuss='33334444', ds_pessoaj=criar_empresa(9))
        resp = self.api.post(self.url, [{'chave': '2', 'insumo': {'cd_mat': outro.cd_mat}, 'anuncio': self.anuncio()}],
                             format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Anuncio.objects.exists())

    def test_sem_saldo(self):
        sem_saldo = criar_empresa(5)
        AnaliseEstoque.objects.filter(pk=self.analise['id']).update(empresa=sem_saldo)
        MatMed.objects.filter(pk=self.cadastrado.pk).update(ds_pessoaj=sem_saldo)
        self.api.force_authenticate(user=sem_saldo)
        resp = self.api.post(self.url, [{'chave': '2', 'insumo': {'cd_mat': self.cadastrado.cd_mat},
                                         'anuncio': self.anuncio()}], format='json')
        self.assertEqual(resp.status_code, 402)

    def test_analise_de_outra_instituicao(self):
        outra = APIClient()
        outra.force_authenticate(user=criar_empresa(7, saldo=50))
        resp = outra.post(self.url, [{'chave': '2', 'insumo': {}, 'anuncio': self.anuncio()}], format='json')
        self.assertEqual(resp.status_code, 404)
