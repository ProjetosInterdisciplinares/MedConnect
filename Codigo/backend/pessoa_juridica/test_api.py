"""Testes locais das rotas de empresa e de insumo (permissões)."""
from django.test import TestCase
from rest_framework.test import APIClient

from anuncio.models import Anuncio
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica

ENDERECO = {'cep': '01000-000', 'logradouro': 'Rua A', 'numero': '1', 'bairro': 'Centro',
            'cidade': 'São Paulo', 'estado': 'SP', 'telefone': '11999999999'}


def empresa(n, admin=False, status='ATIVA'):
    return PessoaJuridica.objects.create(
        nm_pessoaj=f'Hospital {n}', email_pj=f'{n}@t.com', senha_pj='x', resp_tec='R',
        nr_cnpj=f'{n:014d}', razao_social=f'Hospital {n}', status=status, is_admin=admin, **ENDERECO,
    )


class Base(TestCase):
    def setUp(self):
        self.empresa = empresa(1)
        self.outra = empresa(2)
        self.admin = empresa(3, admin=True)
        self.api = APIClient()
        self.api.force_authenticate(user=self.empresa)


class PerfilTests(Base):
    def test_ver_o_proprio_perfil(self):
        resp = self.api.get('/api/medconnect/pessoa_juridica/me/')
        self.assertEqual(resp.json()['cd_pessoaj'], self.empresa.pk)
        self.assertNotIn('senha_pj', resp.json())

    def test_editar_o_proprio_perfil(self):
        resp = self.api.patch(f'/api/medconnect/pessoa_juridica/{self.empresa.pk}', {'telefone': '1133334444'}, format='json')

        self.assertEqual(resp.status_code, 200, resp.content)
        self.empresa.refresh_from_db()
        self.assertEqual(self.empresa.telefone, '1133334444')

    def test_nao_se_promove_a_admin_nem_altera_saldo_ou_status(self):
        self.api.patch(f'/api/medconnect/pessoa_juridica/{self.empresa.pk}',
                       {'is_admin': True, 'saldo_creditos': 999, 'status': 'ATIVA', 'nr_cnpj': '1'}, format='json')

        self.empresa.refresh_from_db()
        self.assertFalse(self.empresa.is_admin)
        self.assertEqual(self.empresa.saldo_creditos, 0)
        self.assertEqual(self.empresa.nr_cnpj, f'{1:014d}')

    def test_nao_edita_outra_empresa(self):
        resp = self.api.patch(f'/api/medconnect/pessoa_juridica/{self.outra.pk}', {'telefone': '0'}, format='json')

        self.assertEqual(resp.status_code, 403)
        self.outra.refresh_from_db()
        self.assertEqual(self.outra.telefone, ENDERECO['telefone'])

    def test_nao_lista_nem_apaga_empresas(self):
        self.assertEqual(self.api.get('/api/medconnect/pessoa_juridica/').status_code, 403)
        self.assertEqual(self.api.delete(f'/api/medconnect/pessoa_juridica/{self.outra.pk}').status_code, 403)
        self.assertTrue(PessoaJuridica.objects.filter(pk=self.outra.pk).exists())


class AdminTests(Base):
    def test_admin_lista_e_aprova(self):
        pendente = empresa(4, status='PENDENTE')
        self.api.force_authenticate(user=self.admin)

        lista = self.api.get('/api/medconnect/admin/pessoas/')
        resp = self.api.patch(f'/api/medconnect/admin/pessoas/{pendente.pk}', {'status': 'ATIVA'}, format='json')

        self.assertEqual(lista.status_code, 200)
        self.assertEqual(resp.status_code, 200, resp.content)
        pendente.refresh_from_db()
        self.assertEqual(pendente.status, 'ATIVA')

    def test_admin_nao_altera_saldo(self):
        self.api.force_authenticate(user=self.admin)
        self.api.patch(f'/api/medconnect/admin/pessoas/{self.outra.pk}', {'saldo_creditos': 500}, format='json')
        self.outra.refresh_from_db()
        self.assertEqual(self.outra.saldo_creditos, 0)

    def test_empresa_comum_nao_acessa_rotas_de_admin(self):
        self.assertEqual(self.api.get('/api/medconnect/admin/pessoas/').status_code, 403)
        resp = self.api.patch(f'/api/medconnect/admin/pessoas/{self.outra.pk}', {'status': 'BLOQUEADA'}, format='json')
        self.assertEqual(resp.status_code, 403)


class InsumoTests(Base):
    def test_cria_insumo_sempre_em_nome_da_empresa_logada(self):
        resp = self.api.post('/api/medconnect/mat_med/', {
            'ds_mat': 'Gaze', 'cd_tuss': '123', 'ds_pessoaj': self.outra.pk,
        }, format='json')

        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(MatMed.objects.get(pk=resp.json()['cd_mat']).ds_pessoaj, self.empresa)

    def test_nao_edita_nem_apaga_insumo_de_outra_empresa(self):
        insumo = MatMed.objects.create(ds_mat='Soro', cd_tuss='9', ds_pessoaj=self.outra)

        editar = self.api.patch(f'/api/medconnect/mat_med/{insumo.pk}', {'ds_mat': 'X'}, format='json')
        apagar = self.api.delete(f'/api/medconnect/mat_med/{insumo.pk}')

        self.assertEqual((editar.status_code, apagar.status_code), (403, 403))
        self.assertTrue(MatMed.objects.filter(pk=insumo.pk, ds_mat='Soro').exists())

    def test_insumo_com_anuncio_nao_pode_ser_apagado(self):
        insumo = MatMed.objects.create(ds_mat='Soro', cd_tuss='9', ds_pessoaj=self.empresa)
        Anuncio.objects.create(cd_mat=insumo, qtd_mat=1, val_base=1, cd_pessoa_anunciante=self.empresa)

        resp = self.api.delete(f'/api/medconnect/mat_med/{insumo.pk}')

        self.assertEqual(resp.status_code, 400)
        self.assertTrue(MatMed.objects.filter(pk=insumo.pk).exists())


class CadastroTests(TestCase):
    URL = '/authentication/register'

    def dados(self, **extra):
        dados = {
            **ENDERECO,
            'nm_pessoaj': 'Hospital Novo', 'razao_social': 'Hospital Novo LTDA', 'nr_cnpj': '11.222.333/0001-81',
            'email_pj': 'novo@hospital.com', 'resp_tec': 'Dra. Ana', 'senha_pj': 'senhaForte123',
            'telefone': '(31) 3333-4444', 'latitude': -19.9166813123, 'longitude': -43.9344931,
        }
        dados.pop('telefone') if extra.get('sem_telefone') else None
        dados.update({k: v for k, v in extra.items() if k != 'sem_telefone'})
        return dados

    def test_grava_telefone_e_endereco(self):
        resp = APIClient().post(self.URL, self.dados(), format='json')

        self.assertEqual(resp.status_code, 201, resp.content)
        empresa = PessoaJuridica.objects.get(nr_cnpj='11222333000181')
        self.assertEqual(empresa.telefone, '(31) 3333-4444')
        self.assertEqual((empresa.cidade, empresa.estado, empresa.cep), ('São Paulo', 'SP', '01000-000'))
        self.assertEqual(empresa.status, 'PENDENTE')
        self.assertNotEqual(empresa.senha_pj, 'senhaForte123')  # gravada com hash
        self.assertEqual(resp.json()['status'], 'PENDENTE')

    def test_nao_aceita_virar_admin_no_cadastro(self):
        APIClient().post(self.URL, self.dados(is_admin=True, status='ATIVA', saldo_creditos=999), format='json')
        empresa = PessoaJuridica.objects.get(nr_cnpj='11222333000181')
        self.assertEqual((empresa.is_admin, empresa.status, empresa.saldo_creditos), (False, 'PENDENTE', 0))

    def test_cnpj_repetido(self):
        APIClient().post(self.URL, self.dados(), format='json')
        resp = APIClient().post(self.URL, self.dados(email_pj='outro@h.com'), format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'CNPJ já cadastrado')

    def test_telefone_obrigatorio(self):
        resp = APIClient().post(self.URL, self.dados(sem_telefone=True), format='json')
        self.assertEqual(resp.status_code, 400)


class AutenticacaoTests(TestCase):
    def test_empresa_bloqueada_perde_acesso_mesmo_com_token(self):
        from authentication.views import login  # noqa: F401  (garante que as rotas carregam)
        from rest_framework_simplejwt.tokens import RefreshToken

        bloqueada = empresa(5, status='BLOQUEADA')
        token = RefreshToken()
        token['id'] = bloqueada.pk
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

        self.assertEqual(api.get('/api/medconnect/pessoa_juridica/me/').status_code, 401)

    def test_empresa_ativa_acessa_com_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        ativa = empresa(6)
        token = RefreshToken()
        token['id'] = ativa.pk
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

        self.assertEqual(api.get('/api/medconnect/pessoa_juridica/me/').status_code, 200)
