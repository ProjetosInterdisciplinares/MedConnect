"""
Testes das rotas de IA.

A biblioteca google-genai é substituída por um dublê (patch em
google.genai.Client), então nenhum teste chama a API real.
"""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from anuncio.models import Anuncio
from creditos import services
from creditos.models import TransacaoCredito
from gemini_api.assistente import AssistenteIAFacade
from gemini_api.provedores import GeminiAdapter, IAIndisponivelError, ProvedorIA, RespostaInvalidaIAError
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica

CLIENTE_GENAI = 'google.genai.Client'


class ProvedorIASimulado(ProvedorIA):
    """Dublê de teste: responde sem rede e guarda os prompts recebidos."""

    def __init__(self, texto='', json_resposta=None, erro=None):
        self.texto = texto
        self.json_resposta = json_resposta or {}
        self.erro = erro
        self.prompts = []

    def gerar_texto(self, prompt):
        return self._responder(prompt, self.texto)

    def gerar_json(self, prompt):
        return self._responder(prompt, self.json_resposta)

    def _responder(self, prompt, resposta):
        self.prompts.append(prompt)
        if self.erro:
            raise self.erro
        return resposta


def criar_empresa(n, saldo=0, interesses=None):
    empresa = PessoaJuridica.objects.create(
        nm_pessoaj=f'Hospital {n}', email_pj=f'h{n}@teste.com', senha_pj='x', resp_tec='Resp',
        nr_cnpj=f'{n:014d}', razao_social=f'Hospital {n} LTDA', status='ATIVA',
        interesses_ia=interesses,
    )
    if saldo:
        services.adicionar_creditos(empresa, saldo, 'Saldo inicial do teste', tipo='C')
        empresa.refresh_from_db()
    return empresa


def simular_resposta(mock_cliente, texto):
    mock_cliente.return_value.models.generate_content.return_value.text = texto


def simular_erro(mock_cliente, mensagem):
    mock_cliente.return_value.models.generate_content.side_effect = Exception(mensagem)


class BaseIATests(TestCase):
    def setUp(self):
        self.empresa = criar_empresa(1, saldo=10)
        self.material = MatMed.objects.create(
            ds_mat='Luva de procedimento', ds_marca='Marca X', ds_tipo='Material Hospitalar',
            unidade_med='Caixa', cd_tuss='12345678', ds_pessoaj=self.empresa,
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.empresa)

    def saldo(self):
        self.empresa.refresh_from_db()
        return self.empresa.saldo_creditos


class GerarDescricaoTests(BaseIATests):
    URL = '/api/medconnect/gerar-anuncio/'

    def payload(self, **extra):
        dados = {'cd_mat': self.material.cd_mat, 'cd_pessoa_anunciante': self.empresa.pk, 'qtd_mat': 10}
        dados.update(extra)
        return dados

    @patch(CLIENTE_GENAI)
    def test_gera_texto_e_cobra_um_credito(self, cliente):
        simular_resposta(cliente, 'Luvas lacradas disponíveis para repasse.')

        resp = self.api.post(self.URL, self.payload(), format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['texto_sugerido'], 'Luvas lacradas disponíveis para repasse.')
        self.assertEqual(self.saldo(), 9)
        transacao = TransacaoCredito.objects.get(pessoa_juridica=self.empresa, tipo='D')
        self.assertEqual(transacao.funcionalidade, 'IA_DESCRICAO')
        self.assertEqual(transacao.referencia, f'MAT-{self.material.cd_mat}')

    @patch(CLIENTE_GENAI)
    def test_prompt_leva_os_dados_do_material(self, cliente):
        simular_resposta(cliente, 'ok')

        self.api.post(self.URL, self.payload(ds_lote='L123', dt_validade='2027-01-01'), format='json')

        prompt = cliente.return_value.models.generate_content.call_args.kwargs['contents']
        for trecho in ('Luva de procedimento', 'Material Hospitalar', 'Caixa'):
            self.assertIn(trecho, prompt)
        for ausente in ('L123', '2027-01-01', 'Marca X'):
            self.assertNotIn(ausente, prompt)

    @patch(CLIENTE_GENAI)
    def test_sem_saldo_retorna_402_e_nao_chama_a_ia(self, cliente):
        sem_saldo = criar_empresa(2)
        self.api.force_authenticate(user=sem_saldo)

        resp = self.api.post(self.URL, self.payload(cd_pessoa_anunciante=sem_saldo.pk), format='json')

        self.assertEqual(resp.status_code, 402)
        self.assertTrue(resp.json()['saldo_insuficiente'])
        cliente.return_value.models.generate_content.assert_not_called()

    @patch(CLIENTE_GENAI)
    def test_ia_indisponivel_nao_cobra(self, cliente):
        simular_erro(cliente, '503 UNAVAILABLE: high demand')

        with self.assertLogs('gemini_api.views', level='WARNING'):
            resp = self.api.post(self.URL, self.payload(), format='json')

        self.assertEqual(resp.status_code, 500)
        self.assertIn('alta demanda', resp.json()['erro'])
        self.assertEqual(self.saldo(), 10)

    @patch(CLIENTE_GENAI)
    def test_erro_generico_da_ia_nao_cobra(self, cliente):
        simular_erro(cliente, 'quota exceeded')

        with self.assertLogs('gemini_api.views', level='ERROR'):
            resp = self.api.post(self.URL, self.payload(), format='json')

        self.assertEqual(resp.status_code, 500)
        self.assertIn('erro interno', resp.json()['erro'])
        self.assertEqual(self.saldo(), 10)

    def test_parametros_obrigatorios(self):
        resp = self.api.post(self.URL, {'qtd_mat': 10}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_material_inexistente(self):
        resp = self.api.post(self.URL, self.payload(cd_mat=999999), format='json')
        self.assertEqual(resp.status_code, 404)


class BuscaSemanticaTests(BaseIATests):
    URL = '/api/medconnect/busca-semantica/'

    def setUp(self):
        super().setUp()
        self.vendedor = criar_empresa(3)
        material = MatMed.objects.create(ds_mat='Seringa 10ml', cd_tuss='87654321', ds_pessoaj=self.vendedor)

        def anuncio(dono, validade=date.today() + timedelta(days=60)):
            return Anuncio.objects.create(cd_mat=material, qtd_mat=5, val_base=Decimal('20'),
                                          cd_pessoa_anunciante=dono, dt_validade=validade)

        self.a1 = anuncio(self.vendedor)
        self.a2 = anuncio(self.vendedor)
        self.proprio = anuncio(self.empresa)
        self.vencido = anuncio(self.vendedor, validade=date.today() - timedelta(days=1))

    @patch(CLIENTE_GENAI)
    def test_retorna_na_ordem_da_ia_sem_os_proprios_anuncios(self, cliente):
        simular_resposta(cliente, f'{{"resultados": [{self.a2.pk}, {self.proprio.pk}, {self.a1.pk}, 999]}}')

        resp = self.api.post(self.URL, {'termo': 'seringa'}, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual([a['nr_anuncio'] for a in resp.json()], [self.a2.pk, self.a1.pk])
        self.vencido.refresh_from_db()
        self.assertEqual(self.vencido.ie_status, 'I')

    @patch(CLIENTE_GENAI)
    def test_resposta_invalida_da_ia(self, cliente):
        simular_resposta(cliente, 'isto não é json')

        with self.assertLogs('gemini_api.views', level='WARNING'):
            resp = self.api.post(self.URL, {'termo': 'seringa'}, format='json')

        self.assertEqual(resp.status_code, 500)
        self.assertIn('resposta inválida', resp.json()['erro'])

    @patch(CLIENTE_GENAI)
    def test_sem_anuncios_nao_chama_a_ia(self, cliente):
        Anuncio.objects.exclude(cd_pessoa_anunciante=self.empresa).delete()

        resp = self.api.post(self.URL, {'termo': 'seringa'}, format='json')

        self.assertEqual(resp.json(), [])
        cliente.return_value.models.generate_content.assert_not_called()

    def test_termo_obrigatorio(self):
        resp = self.api.post(self.URL, {'termo': '  '}, format='json')
        self.assertEqual(resp.status_code, 400)


class AtualizarInteressesTests(BaseIATests):
    URL = '/api/medconnect/atualizar-interesses/'

    @patch(CLIENTE_GENAI)
    def test_salva_as_tags_limpas(self, cliente):
        simular_resposta(cliente, '"luva, seringa"\n')

        resp = self.api.post(self.URL, {'termo': 'luva'}, format='json')

        self.assertEqual(resp.status_code, 200)
        self.empresa.refresh_from_db()
        self.assertEqual(self.empresa.interesses_ia, 'luva, seringa')

    @patch(CLIENTE_GENAI)
    def test_limita_a_200_caracteres(self, cliente):
        simular_resposta(cliente, 'a' * 300)

        self.api.post(self.URL, {'termo': 'luva'}, format='json')

        self.empresa.refresh_from_db()
        self.assertEqual(len(self.empresa.interesses_ia), 200)

    def test_termo_obrigatorio(self):
        resp = self.api.post(self.URL, {'termo': ''}, format='json')
        self.assertEqual(resp.status_code, 400)


class AssistenteIAFacadeTests(BaseIATests):
    """A fachada recebe o provedor por injeção: aqui, o ProvedorIASimulado (sem rede)."""

    def test_descricao_com_provedor_simulado(self):
        provedor = ProvedorIASimulado(texto='Descrição simulada')

        texto = AssistenteIAFacade(provedor).gerar_descricao(self.empresa, self.material)

        self.assertEqual(texto, 'Descrição simulada')
        self.assertIn('Luva de procedimento', provedor.prompts[0])
        self.assertEqual(self.saldo(), 9)

    def test_falha_do_provedor_nao_cobra(self):
        provedor = ProvedorIASimulado(erro=IAIndisponivelError('fora do ar'))

        with self.assertRaises(IAIndisponivelError):
            AssistenteIAFacade(provedor).gerar_descricao(self.empresa, self.material)

        self.assertEqual(self.saldo(), 10)

    def test_resposta_sem_lista_de_resultados(self):
        vendedor = criar_empresa(4)
        Anuncio.objects.create(cd_mat=self.material, qtd_mat=1, val_base=Decimal('1'), cd_pessoa_anunciante=vendedor)

        resultado = AssistenteIAFacade(ProvedorIASimulado(json_resposta={})).buscar_semanticamente('x', self.empresa)

        self.assertEqual(resultado, [])


class GeminiAdapterTests(TestCase):
    """O adaptador traduz os erros da biblioteca para os erros do MedConnect."""

    @patch(CLIENTE_GENAI)
    def test_traduz_503_para_indisponivel(self, cliente):
        simular_erro(cliente, '503 Service Unavailable')
        with self.assertRaises(IAIndisponivelError):
            GeminiAdapter(api_key='teste').gerar_texto('oi')

    @patch(CLIENTE_GENAI)
    def test_traduz_json_quebrado(self, cliente):
        simular_resposta(cliente, '{quebrado')
        with self.assertRaises(RespostaInvalidaIAError):
            GeminiAdapter(api_key='teste').gerar_json('oi')

    @patch(CLIENTE_GENAI)
    def test_repassa_modelo_e_prompt(self, cliente):
        simular_resposta(cliente, 'ok')

        self.assertEqual(GeminiAdapter(api_key='teste', modelos=('modelo-x',)).gerar_texto('oi'), 'ok')

        self.assertEqual(cliente.call_args.kwargs['api_key'], 'teste')
        cliente.return_value.models.generate_content.assert_called_once_with(model='modelo-x', contents='oi')

    @patch(CLIENTE_GENAI)
    def test_usa_o_modelo_reserva_quando_o_principal_esta_sobrecarregado(self, cliente):
        resposta = cliente.return_value.models.generate_content
        sucesso = type('Resposta', (), {'text': 'texto do reserva'})()
        resposta.side_effect = [Exception('503 UNAVAILABLE: high demand'), sucesso]

        texto = GeminiAdapter(api_key='teste', modelos=('principal', 'reserva')).gerar_texto('oi')

        self.assertEqual(texto, 'texto do reserva')
        self.assertEqual([c.kwargs['model'] for c in resposta.call_args_list], ['principal', 'reserva'])

    @patch(CLIENTE_GENAI)
    def test_modelo_travado_nao_prende_a_requisicao(self, cliente):
        import threading
        liberar = threading.Event()
        cliente.return_value.models.generate_content.side_effect = lambda **_: liberar.wait(5)
        adaptador = GeminiAdapter(api_key='teste', modelos=('travado',))
        adaptador.TEMPO_POR_TENTATIVA_S = 0.2

        with self.assertRaises(IAIndisponivelError):
            adaptador.gerar_texto('oi')
        liberar.set()


class GeminiAdapterSemChaveTests(TestCase):
    """Sem GEMINI_API_KEY, o adaptador lança o erro do MedConnect (e não um ValueError solto)."""

    @patch(CLIENTE_GENAI, side_effect=ValueError('No API key was provided.'))
    def test_cliente_sem_chave_vira_erro_do_provedor(self, _):
        from gemini_api.provedores import IANaoConfiguradaError
        with patch.dict('os.environ', {'GEMINI_API_KEY': '', 'GOOGLE_API_KEY': ''}):
            with self.assertRaises(IANaoConfiguradaError):
                GeminiAdapter().gerar_texto('oi')


class GerarDescricaoSemInsumoCadastradoTests(BaseIATests):
    """Cadastro em massa e análise de estoque: o insumo ainda não existe no banco."""

    @patch(CLIENTE_GENAI)
    def test_gera_com_os_dados_digitados(self, cliente):
        simular_resposta(cliente, 'Texto gerado.')
        resp = self.api.post('/api/medconnect/gerar-anuncio/', {
            'insumo': {'ds_mat': 'Torneirinha 3 vias', 'ds_tipo': 'Material Hospitalar', 'unidade_med': 'Unidade'},
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('Torneirinha 3 vias', cliente.return_value.models.generate_content.call_args.kwargs['contents'])
        self.assertEqual(TransacaoCredito.objects.get(pessoa_juridica=self.empresa, tipo='D').referencia, 'MAT-NOVO')

    @patch(CLIENTE_GENAI, side_effect=ValueError('No API key was provided.'))
    def test_sem_chave_responde_503_e_nao_cobra(self, _):
        with patch.dict('os.environ', {'GEMINI_API_KEY': '', 'GOOGLE_API_KEY': ''}),                 self.assertLogs('gemini_api.views', level='ERROR'):
            resp = self.api.post('/api/medconnect/gerar-anuncio/', {'cd_mat': self.material.cd_mat}, format='json')
        self.assertEqual(resp.status_code, 503)
        self.assertIn('não está configurada', resp.json()['erro'])
        self.assertEqual(self.saldo(), 10)
