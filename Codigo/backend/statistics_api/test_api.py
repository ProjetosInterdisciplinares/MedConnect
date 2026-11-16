"""Testes locais da rota do painel administrativo."""
from django.test import TestCase
from rest_framework.test import APIClient

from pessoa_juridica.models import PessoaJuridica

CHAVES = {
    'controle', 'total_matmeds', 'total_pessoas_juridicas', 'total_negociacoes', 'anuncios_ativos',
    'anuncios_negociacao', 'anuncios_finalizados', 'anuncios_inativos', 'volume_financeiro',
    'receita_creditos', 'creditos_consumidos', 'total_propostas', 'historico', 'historico_rendas',
}


class PainelApiTests(TestCase):
    def empresa(self, n, admin):
        return PessoaJuridica.objects.create(
            nm_pessoaj=f'E{n}', email_pj=f'{n}@t.com', senha_pj='x', resp_tec='R',
            nr_cnpj=f'{n:014d}', razao_social=f'E{n}', status='ATIVA', is_admin=admin,
        )

    def test_admin_recebe_todos_os_indicadores(self):
        api = APIClient()
        api.force_authenticate(user=self.empresa(1, admin=True))

        resp = api.get('/statistics/')

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(set(resp.json()), CHAVES)
        self.assertEqual(len(resp.json()['historico']), 6)
        self.assertEqual(set(resp.json()['historico_rendas']), {'diario', 'semanal', 'mensal', 'anual'})

    def test_nao_admin_recebe_403(self):
        api = APIClient()
        api.force_authenticate(user=self.empresa(2, admin=False))
        self.assertEqual(api.get('/statistics/').status_code, 403)
