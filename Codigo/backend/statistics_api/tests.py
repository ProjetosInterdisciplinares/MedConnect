from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from anuncio.models import Anuncio, Negociacao
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica
from statistics_api.painel import PainelIndicadoresFacade


def empresa(n, status='ATIVA', interesses=None, admin=False):
    return PessoaJuridica.objects.create(
        nm_pessoaj=f'Empresa {n}', email_pj=f'e{n}@t.com', senha_pj='x', resp_tec='R',
        nr_cnpj=f'{n:014d}', razao_social=f'Empresa {n} LTDA', status=status,
        interesses_ia=interesses, is_admin=admin,
    )


class IndicadoresControleTests(TestCase):
    def setUp(self):
        self.vendedor = empresa(1, interesses='luva, seringa')
        self.comprador = empresa(2, interesses='Luva, cateter')
        empresa(3, status='PENDENTE')
        empresa(4, status='BLOQUEADA')
        empresa(5)  # ativa sem anúncio
        empresa(9, admin=True)  # admin não conta

        self.luva = MatMed.objects.create(ds_mat='Luva de procedimento', cd_tuss='1', ds_pessoaj=self.vendedor)
        self.seringa = MatMed.objects.create(ds_mat='Seringa 10ml', cd_tuss='2', ds_pessoaj=self.vendedor)

        def anuncio(mat, validade):
            return Anuncio.objects.create(cd_mat=mat, qtd_mat=10, val_base=Decimal('10'),
                                          cd_pessoa_anunciante=self.vendedor, dt_validade=validade)

        a1 = anuncio(self.luva, date.today() + timedelta(days=10))   # vence em 30d
        a2 = anuncio(self.seringa, date.today() + timedelta(days=90))
        anuncio(self.luva, date.today() + timedelta(days=200))

        def proposta(a, status, horas=None):
            n = Negociacao.objects.create(anuncio=a, comprador=self.comprador, vendedor=self.vendedor,
                                          val_proposta=Decimal('9'), status=status)
            if horas is not None:
                Negociacao.objects.filter(pk=n.pk).update(data_resposta=n.data_proposta + timedelta(hours=horas))

        proposta(a1, 'A', horas=2)
        proposta(a1, 'R', horas=4)
        proposta(a1, 'P')
        proposta(a2, 'C')

    def test_indicadores(self):
        c = PainelIndicadoresFacade().indicadores_controle()

        self.assertEqual(c['empresas_aprovadas'], 3)
        self.assertEqual(c['empresas_pendentes'], 1)
        self.assertEqual(c['empresas_bloqueadas'], 1)
        self.assertEqual(c['empresas_sem_anuncio'], 2)  # comprador e empresa 5

        self.assertEqual(c['propostas_total'], 4)
        self.assertEqual(c['propostas_pendentes'], 1)
        self.assertEqual(c['taxa_aceite'], 50.0)  # 1 aceita de 2 respondidas
        self.assertEqual(c['tempo_medio_resposta_horas'], 3.0)

        self.assertEqual(c['anuncios_vencendo_30d'], 1)
        self.assertEqual(c['top_materiais_propostas'][0], {'nome': 'Luva de procedimento', 'total': 3})
        self.assertEqual(c['top_materiais_anunciados'][0], {'nome': 'Luva de procedimento', 'total': 2})
        self.assertEqual(c['top_interesses'][0], {'nome': 'luva', 'total': 2})

    def test_sem_dados(self):
        Negociacao.objects.all().delete()
        c = PainelIndicadoresFacade().indicadores_controle()
        self.assertIsNone(c['taxa_aceite'])
        self.assertIsNone(c['tempo_medio_resposta_horas'])
        self.assertEqual(c['top_materiais_propostas'], [])
