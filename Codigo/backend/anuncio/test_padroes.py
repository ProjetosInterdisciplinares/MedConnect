"""Testes locais das partes novas: estratégias de ordenação e regras do builder."""
from datetime import date, timedelta
from decimal import Decimal

from anuncio.models import Anuncio
from anuncio.publicacao.builder import AnuncioBuilder
from anuncio.publicacao.erros import AnuncioInvalidoError
from anuncio.test_publicacao import Base, criar_empresa
from mat_med.models import MatMed


class OrdenacaoTests(Base):
    URL = '/api/medconnect/anuncio/'

    def setUp(self):
        super().setUp()
        self.empresa.latitude, self.empresa.longitude = Decimal('-23.55'), Decimal('-46.63')  # São Paulo
        self.empresa.save()
        perto = criar_empresa(5, latitude=Decimal('-23.56'), longitude=Decimal('-46.65'))
        longe = criar_empresa(6, latitude=Decimal('-22.90'), longitude=Decimal('-43.17'))  # Rio
        mat_perto = MatMed.objects.create(ds_mat='Gaze', ds_tipo='Material Hospitalar', cd_tuss='3', ds_pessoaj=perto)
        mat_longe = MatMed.objects.create(ds_mat='Dipirona', ds_tipo='Medicamento', cd_tuss='4', ds_pessoaj=longe)
        hoje = date.today()
        self.barato_longe = Anuncio.objects.create(cd_mat=mat_longe, qtd_mat=1, val_base=Decimal('5'),
                                                   cd_pessoa_anunciante=longe, dt_validade=hoje + timedelta(days=10))
        self.caro_perto = Anuncio.objects.create(cd_mat=mat_perto, qtd_mat=1, val_base=Decimal('50'),
                                                 cd_pessoa_anunciante=perto, dt_validade=hoje + timedelta(days=300))

    def ids(self, **params):
        return [a['nr_anuncio'] for a in self.api.get(self.URL, params).json()]

    def test_menor_preco(self):
        self.assertEqual(self.ids(ordenar='menor_preco'), [self.barato_longe.pk, self.caro_perto.pk])

    def test_validade_proxima(self):
        self.assertEqual(self.ids(ordenar='validade'), [self.barato_longe.pk, self.caro_perto.pk])

    def test_distancia(self):
        resp = self.api.get(self.URL, {'ordenar': 'distancia'}).json()
        self.assertEqual([a['nr_anuncio'] for a in resp], [self.caro_perto.pk, self.barato_longe.pk])
        self.assertLess(resp[0]['distancia_km'], 5)
        self.assertGreater(resp[1]['distancia_km'], 300)

    def test_filtro_por_tipo(self):
        self.assertEqual(self.ids(tipo='medicamento'), [self.barato_longe.pk])


class AnuncianteDefinidoPeloServidorTests(Base):
    def test_ignora_anunciante_enviado_pelo_front(self):
        outra = criar_empresa(7)
        resp = self.api.post('/api/medconnect/anuncio/', {
            'cd_mat': self.material.pk, 'qtd_mat': 1, 'val_base': '1.00', 'cd_pessoa_anunciante': outra.pk,
        }, format='json')

        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(Anuncio.objects.get(pk=resp.json()['nr_anuncio']).cd_pessoa_anunciante, self.empresa)

    def test_quantidade_negativa_retorna_400(self):
        resp = self.api.post('/api/medconnect/anuncio/', {
            'cd_mat': self.material.pk, 'qtd_mat': -3, 'val_base': '1.00',
        }, format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertIn('Quantidade deve ser um número positivo', resp.json()['erros'])
        self.assertEqual(self.saldo(), 50)


class NegociacaoTests(Base):
    """Toda proposta passa pelo vendedor; a venda parcial ajusta o saldo restante."""

    def setUp(self):
        super().setUp()
        self.comprador = criar_empresa(8)
        self.anuncio = Anuncio.objects.create(cd_mat=self.material, qtd_mat=12, val_base=Decimal('40.00'),
                                              cd_pessoa_anunciante=self.empresa, ds_obs='12 frascos lacrados')
        self.api_comprador = type(self.api)()
        self.api_comprador.force_authenticate(user=self.comprador)

    def propor(self, qtd, valor):
        resp = self.api_comprador.post('/api/medconnect/negociacoes/',
                                       {'anuncio': self.anuncio.pk, 'qtd_proposta': qtd, 'val_proposta': valor},
                                       format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        return resp.json()['id']

    def aceitar(self, negociacao_id, **saldo):
        resp = self.api.patch(f'/api/medconnect/negociacoes/{negociacao_id}/', {'status': 'A', **saldo}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.anuncio.refresh_from_db()

    def test_lote_inteiro_pelo_valor_anunciado_espera_o_vendedor(self):
        negociacao_id = self.propor(12, '40.00')

        self.anuncio.refresh_from_db()
        self.assertEqual(self.anuncio.ie_status, Anuncio.STATUS_NEGOCIACAO)
        self.assertEqual(self.api_comprador.get('/api/medconnect/negociacoes/').json()[0]['status'], 'P')

        self.aceitar(negociacao_id)
        self.assertEqual(self.anuncio.ie_status, Anuncio.STATUS_FINALIZADO)

    def test_venda_parcial_sem_reativar_vai_para_saldo_com_valor_proporcional(self):
        self.aceitar(self.propor(9, '30.00'))

        self.assertEqual(self.anuncio.ie_status, Anuncio.STATUS_SALDO)
        self.assertEqual(self.anuncio.qtd_mat, 3)
        self.assertEqual(self.anuncio.val_base, Decimal('10.00'))  # 40 × 3/12

    def test_venda_parcial_reativando_o_saldo_com_novos_dados(self):
        self.aceitar(self.propor(9, '30.00'), reativar_saldo=True, novo_val_base='12.00',
                     nova_descricao='3 frascos lacrados')

        self.assertEqual(self.anuncio.ie_status, Anuncio.STATUS_ATIVO)
        self.assertEqual((self.anuncio.qtd_mat, self.anuncio.val_base), (3, Decimal('12.00')))
        self.assertEqual(self.anuncio.ds_obs, '3 frascos lacrados')

    def negociacao(self, api=None):
        return (api or self.api_comprador).get('/api/medconnect/negociacoes/').json()[0]

    def test_contatos_so_aparecem_depois_do_aceite(self):
        self.empresa.telefone = '(11) 3333-4444'
        self.empresa.save()
        negociacao_id = self.propor(12, '35.00')

        self.assertIsNone(self.negociacao()['vendedor_telefone'])
        anuncio = self.api_comprador.get(f'/api/medconnect/anuncio/{self.anuncio.pk}/').json()
        self.assertNotIn('anunciante_telefone', anuncio)

        self.aceitar(negociacao_id)
        self.assertEqual(self.negociacao()['vendedor_telefone'], '(11) 3333-4444')

    def test_proposta_sem_resposta_expira_e_anuncio_volta(self):
        from datetime import timedelta
        from django.utils import timezone
        from anuncio.models import Negociacao

        negociacao_id = self.propor(12, '35.00')
        Negociacao.objects.filter(pk=negociacao_id).update(prazo_resposta=timezone.now() - timedelta(minutes=1))

        self.assertEqual(self.negociacao()['status'], 'E')
        self.anuncio.refresh_from_db()
        self.assertEqual(self.anuncio.ie_status, Anuncio.STATUS_ATIVO)

    def test_recusa_com_motivo(self):
        negociacao_id = self.propor(12, '10.00')
        resp = self.api.patch(f'/api/medconnect/negociacoes/{negociacao_id}/',
                              {'status': 'R', 'motivo_recusa': 'VALOR', 'detalhe_recusa': 'Aceito a partir de R$ 35'},
                              format='json')

        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(self.negociacao()['motivo_recusa_display'], 'Valor abaixo do esperado')

    def test_conclusao_exige_as_duas_confirmacoes(self):
        negociacao_id = self.propor(12, '35.00')
        self.aceitar(negociacao_id)
        url = f'/api/medconnect/negociacoes/{negociacao_id}'

        self.assertEqual(self.api_comprador.post(f'{url}/confirmar-entrega/').status_code, 400)  # não é o vendedor
        self.api.post(f'{url}/confirmar-entrega/')
        self.assertEqual(self.negociacao()['status'], 'A')
        self.api_comprador.post(f'{url}/confirmar-recebimento/')
        self.assertEqual(self.negociacao()['status'], 'F')

    def test_lote_inteiro_nao_concluido_volta_como_rascunho(self):
        negociacao_id = self.propor(12, '35.00')
        self.aceitar(negociacao_id)

        self.api_comprador.post(f'/api/medconnect/negociacoes/{negociacao_id}/nao-concluida/')

        self.assertEqual(self.negociacao()['status'], 'N')
        self.anuncio.refresh_from_db()
        self.assertEqual(self.anuncio.ie_status, Anuncio.STATUS_INATIVO)

    def test_opcoes_de_saldo_nao_valem_ao_recusar(self):
        negociacao_id = self.propor(9, '30.00')
        resp = self.api.patch(f'/api/medconnect/negociacoes/{negociacao_id}/',
                              {'status': 'R', 'reativar_saldo': True}, format='json')
        self.assertEqual(resp.status_code, 400)


class AnuncioBuilderTests(Base):
    def test_construir_exige_as_etapas_obrigatorias(self):
        with self.assertRaises(AnuncioInvalidoError) as erro:
            AnuncioBuilder(self.empresa).com_lote('L1', None, None).construir()
        self.assertIn('Insumo é obrigatório', erro.exception.erros)

    def test_monta_anuncio_sem_gravar(self):
        anuncio = (AnuncioBuilder(self.empresa)
                   .com_insumo(self.material)
                   .com_lote('L1', '01/02/2026', '2027-02-01')
                   .com_valores('3.0', '9,90')
                   .construir())

        self.assertIsNone(anuncio.pk)
        self.assertEqual((anuncio.qtd_mat, anuncio.val_base), (3, Decimal('9.90')))
        self.assertEqual(anuncio.dt_fabricacao, date(2026, 2, 1))
        self.assertEqual(anuncio.ie_status, Anuncio.STATUS_ATIVO)
