"""Testes locais da validação de CNPJ e da verificação do credenciamento."""
from unittest.mock import patch

import requests
from django.test import TestCase
from rest_framework.test import APIClient

from pessoa_juridica.cnpj import validar_cnpj
from pessoa_juridica.models import PessoaJuridica, VerificacaoCNPJ
from pessoa_juridica.receita import (
    BrasilAPIAdapter, CNPJNaoEncontradoError, ConsultaCNPJ, ConsultaCNPJIndisponivelError, DadosReceita,
)
from pessoa_juridica.verificacao import VerificacaoCredenciamentoFacade

CNPJ_VALIDO = '11222333000181'


class ConsultaFalsa(ConsultaCNPJ):
    """Dublê de teste: devolve dados fixos ou um erro, sem internet."""

    def __init__(self, dados=None, erro=None):
        self.dados, self.erro, self.chamadas = dados, erro, 0

    def consultar(self, cnpj):
        self.chamadas += 1
        if self.erro:
            raise self.erro
        return self.dados


def dados_receita(**extra):
    base = dict(cnpj=CNPJ_VALIDO, razao_social='HOSPITAL HORIZONTE LTDA', situacao='ATIVA',
                cnae_codigo='8610101', cnae_descricao='Atividades de atendimento hospitalar',
                municipio='BELO HORIZONTE', uf='MG')
    base.update(extra)
    return DadosReceita(**base)


def empresa(cnpj=CNPJ_VALIDO, **extra):
    dados = dict(nm_pessoaj='Hospital Horizonte', razao_social='Hospital Horizonte Ltda.', email_pj='h@h.com',
                 senha_pj='x', resp_tec='R', nr_cnpj=cnpj, cidade='Belo Horizonte', estado='MG', status='PENDENTE')
    dados.update(extra)
    return PessoaJuridica.objects.create(**dados)


def situacoes(relatorio):
    return {item.chave: item.situacao for item in relatorio.itens}


class ValidarCnpjTests(TestCase):
    def test_digitos(self):
        self.assertTrue(validar_cnpj('00.000.000/0001-91'))
        self.assertTrue(validar_cnpj(CNPJ_VALIDO))
        self.assertFalse(validar_cnpj('11.222.333/0001-82'))
        self.assertFalse(validar_cnpj('11111111111111'))
        self.assertFalse(validar_cnpj('123'))


class VerificacaoTests(TestCase):
    def test_tudo_confere(self):
        relatorio = VerificacaoCredenciamentoFacade(ConsultaFalsa(dados_receita())).verificar(empresa())

        self.assertEqual(relatorio.resultado, 'ok')
        self.assertEqual(set(situacoes(relatorio)), {'digitos', 'situacao', 'razao_social', 'atividade', 'localizacao'})

    def test_alertas_e_erros(self):
        dados = dados_receita(situacao='BAIXADA', razao_social='OUTRA EMPRESA SA', cnae_codigo='6422100',
                              cnae_descricao='Bancos', municipio='SAO PAULO', uf='SP')
        relatorio = VerificacaoCredenciamentoFacade(ConsultaFalsa(dados)).verificar(empresa())

        self.assertEqual(situacoes(relatorio), {'digitos': 'ok', 'situacao': 'erro', 'razao_social': 'alerta',
                                                'atividade': 'alerta', 'localizacao': 'alerta'})
        self.assertEqual(relatorio.resultado, 'erro')

    def test_cnpj_com_digitos_errados_nem_consulta(self):
        consulta = ConsultaFalsa(dados_receita())
        relatorio = VerificacaoCredenciamentoFacade(consulta).verificar(empresa(cnpj='11222333000182'))

        self.assertEqual(situacoes(relatorio), {'digitos': 'erro'})
        self.assertEqual(consulta.chamadas, 0)

    def test_cnpj_inexistente_na_receita(self):
        relatorio = VerificacaoCredenciamentoFacade(ConsultaFalsa(erro=CNPJNaoEncontradoError())).verificar(empresa())
        self.assertEqual(situacoes(relatorio)['receita'], 'erro')

    def test_usa_o_resultado_guardado_e_atualiza_quando_pedido(self):
        e, consulta = empresa(), ConsultaFalsa(dados_receita())
        fachada = VerificacaoCredenciamentoFacade(consulta)

        fachada.verificar(e)
        fachada.verificar(e)
        self.assertEqual(consulta.chamadas, 1)
        fachada.verificar(e, atualizar=True)
        self.assertEqual(consulta.chamadas, 2)

    def test_servico_fora_do_ar_mostra_o_ultimo_resultado(self):
        e = empresa()
        VerificacaoCredenciamentoFacade(ConsultaFalsa(dados_receita())).verificar(e)

        relatorio = VerificacaoCredenciamentoFacade(ConsultaFalsa(erro=ConsultaCNPJIndisponivelError())).verificar(e, atualizar=True)

        self.assertIn('indisponível', relatorio.aviso)
        self.assertEqual(relatorio.resultado, 'ok')

    def test_servico_fora_do_ar_sem_resultado_guardado(self):
        relatorio = VerificacaoCredenciamentoFacade(ConsultaFalsa(erro=ConsultaCNPJIndisponivelError())).verificar(empresa())
        self.assertEqual(situacoes(relatorio)['receita'], 'alerta')
        self.assertFalse(VerificacaoCNPJ.objects.exists())


class BrasilAPIAdapterTests(TestCase):
    def resposta(self, status, corpo=None):
        r = requests.Response()
        r.status_code = status
        r._content = (__import__('json').dumps(corpo or {})).encode()
        return r

    @patch('pessoa_juridica.receita.requests.get')
    def test_traduz_a_resposta(self, get):
        get.return_value = self.resposta(200, {
            'razao_social': 'HOSPITAL X', 'descricao_situacao_cadastral': 'ATIVA', 'cnae_fiscal': 8610101,
            'cnae_fiscal_descricao': 'Hospital', 'municipio': 'BH', 'uf': 'MG',
            'cnaes_secundarios': [{'codigo': 4645101, 'descricao': 'Materiais'}],
        })
        dados = BrasilAPIAdapter().consultar('11.222.333/0001-81')

        self.assertEqual((dados.cnpj, dados.situacao, dados.cnae_codigo), (CNPJ_VALIDO, 'ATIVA', '8610101'))
        self.assertEqual(dados.cnaes_secundarios[0]['codigo'], '4645101')

    @patch('pessoa_juridica.receita.requests.get')
    def test_traduz_os_erros(self, get):
        get.return_value = self.resposta(404)
        with self.assertRaises(CNPJNaoEncontradoError):
            BrasilAPIAdapter().consultar(CNPJ_VALIDO)

        get.return_value = self.resposta(429)
        with self.assertRaises(ConsultaCNPJIndisponivelError):
            BrasilAPIAdapter().consultar(CNPJ_VALIDO)

        get.side_effect = requests.Timeout()
        with self.assertRaises(ConsultaCNPJIndisponivelError):
            BrasilAPIAdapter().consultar(CNPJ_VALIDO)


class RotaVerificacaoTests(TestCase):
    def setUp(self):
        self.admin = empresa(cnpj='00000000000191', is_admin=True, status='ATIVA')
        self.solicitante = empresa()

    @patch('pessoa_juridica.verificacao.BrasilAPIAdapter.consultar', return_value=dados_receita())
    def test_admin_ve_o_relatorio(self, _):
        api = APIClient()
        api.force_authenticate(user=self.admin)

        resp = api.get(f'/api/medconnect/admin/pessoas/{self.solicitante.pk}/verificacao/')

        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()['resultado'], 'ok')
        self.assertEqual(resp.json()['cnpj'], '11.222.333/0001-81')

    def test_empresa_comum_nao_acessa(self):
        api = APIClient()
        api.force_authenticate(user=self.solicitante)
        self.assertEqual(api.get(f'/api/medconnect/admin/pessoas/{self.admin.pk}/verificacao/').status_code, 403)


class CadastroComCnpjInvalidoTests(TestCase):
    def test_recusa_cnpj_com_digitos_errados(self):
        resp = APIClient().post('/authentication/register', {
            'nm_pessoaj': 'H', 'razao_social': 'H LTDA', 'nr_cnpj': '11.222.333/0001-82', 'email_pj': 'h@h.com',
            'resp_tec': 'R', 'senha_pj': 'senhaForte123', 'cep': '01000-000', 'logradouro': 'Rua',
            'numero': '1', 'bairro': 'B', 'cidade': 'C', 'estado': 'SP', 'telefone': '11999999999',
        }, format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertIn('CNPJ inválido', resp.json()['error'])
