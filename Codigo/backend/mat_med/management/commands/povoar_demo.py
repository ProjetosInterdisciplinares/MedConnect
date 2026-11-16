"""
Povoa o banco com dados de DEMONSTRAÇÃO (instituições fictícias, insumos,
anúncios com imagem e algumas negociações) para visualizar o catálogo.

    python manage.py povoar_demo            # cria (ou recria) os dados
    python manage.py povoar_demo --limpar   # remove apenas os dados de demonstração

Todos os registros ficam ligados a instituições com e-mail @demo.medconnect.local,
o que permite removê-los sem tocar nos dados reais. Só roda com DEBUG=True.
"""
import base64
import random
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from anuncio.models import Anuncio, Negociacao
from creditos.models import TransacaoCredito
from mat_med.models import MatMed
from mat_med.seed_demo.dados import (
    DOMINIO_DEMO, INSTITUICOES, OBSERVACOES, PRODUTOS, SENHA_DEMO, MAT,
)
from pessoa_juridica.models import PessoaJuridica

PASTA_IMAGENS = Path(__file__).resolve().parents[2] / "seed_demo" / "imagens"
OBS_VALIDADE_PROXIMA = "Validade próxima ao limite de uso interno; preço reduzido para giro rápido."


def cnpj_valido(base12: str) -> str:
    """Completa 12 dígitos com os dois dígitos verificadores do CNPJ."""
    def dv(nums, pesos):
        r = sum(int(n) * p for n, p in zip(nums, pesos)) % 11
        return "0" if r < 2 else str(11 - r)
    d1 = dv(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    d2 = dv(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return base12 + d1 + d2


def imagem_base64(slug: str) -> str | None:
    arq = PASTA_IMAGENS / f"{slug}.jpg"
    if not arq.exists():
        return None
    return "data:image/jpeg;base64," + base64.b64encode(arq.read_bytes()).decode("ascii")


class Command(BaseCommand):
    help = "Povoa o banco com instituições, insumos e anúncios de demonstração."

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true", help="Remove apenas os dados de demonstração.")
        parser.add_argument("--anuncios-por-produto", type=int, default=3)
        parser.add_argument("--semente", type=int, default=42, help="Semente aleatória (resultado reproduzível).")

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("Comando de demonstração: rode apenas com DEBUG=True (ambiente local).")

        with transaction.atomic():
            removidos = self._limpar()
        if opts["limpar"]:
            self.stdout.write(self.style.SUCCESS(f"Dados de demonstração removidos ({removidos} instituições)."))
            return

        rng = random.Random(opts["semente"])
        self._cache = {}
        with transaction.atomic():
            empresas = self._criar_instituicoes()
            anuncios = self._criar_anuncios(rng, empresas, opts["anuncios_por_produto"])
            negociacoes = self._criar_negociacoes(rng, empresas, anuncios)

        self.stdout.write(self.style.SUCCESS(
            f"Pronto: {len(empresas)} instituições, {len(self._cache)} insumos, "
            f"{len(anuncios)} anúncios e {negociacoes} negociações."
        ))
        self.stdout.write(f"Login (CNPJ + senha {SENHA_DEMO}):")
        for e in empresas:
            c = e.nr_cnpj
            self.stdout.write(f"  {c[:2]}.{c[2:5]}.{c[5:8]}/{c[8:12]}-{c[12:]}  {e.nm_pessoaj} – {e.cidade}/{e.estado}")

    # ─── Limpeza ──────────────────────────────────────────────────────
    def _limpar(self) -> int:
        demo = PessoaJuridica.objects.filter(email_pj__endswith="@" + DOMINIO_DEMO)
        if not demo.exists():
            return 0
        Negociacao.objects.filter(Q(comprador__in=demo) | Q(vendedor__in=demo)).delete()
        Anuncio.objects.filter(cd_pessoa_compradora__in=demo).update(cd_pessoa_compradora=None)
        Anuncio.objects.filter(cd_pessoa_anunciante__in=demo).delete()
        MatMed.objects.filter(ds_pessoaj__in=demo).delete()
        TransacaoCredito.objects.filter(pessoa_juridica__in=demo).delete()
        total = demo.count()
        demo.delete()
        return total

    # ─── Instituições ─────────────────────────────────────────────────
    def _criar_instituicoes(self):
        senha = make_password(SENHA_DEMO)
        empresas = []
        for i, d in enumerate(INSTITUICOES, start=1):
            slug = d["nome"].lower().replace("hospital demo ", "hospital-").replace("clínica demo ", "clinica-")
            slug = slug.replace(" ", "-").replace("ã", "a").replace("í", "i").replace("é", "e")
            # status ATIVA na criação: o sinal de créditos concede as boas-vindas
            empresas.append(PessoaJuridica.objects.create(
                nm_pessoaj=d["nome"],
                razao_social=d["razao"],
                email_pj=f"{slug}@{DOMINIO_DEMO}",
                senha_pj=senha,
                resp_tec=d["resp"],
                nr_cnpj=cnpj_valido(f"9900000{i}0001"),  # fictício, com dígitos verificadores válidos
                status="ATIVA",
                cep=d["cep"], logradouro=d["logradouro"], numero=d["numero"], bairro=d["bairro"],
                cidade=d["cidade"], estado=d["uf"],
                latitude=Decimal(str(d["lat"])), longitude=Decimal(str(d["lng"])),
                telefone=d["tel"],
            ))
        return empresas

    # ─── Insumos (cada instituição cadastra os que anuncia) ───────────
    def _material(self, idx, empresa):
        chave = (idx, empresa.pk)
        if chave not in self._cache:
            p = PRODUTOS[idx]
            self._cache[chave] = MatMed.objects.create(
                ds_mat=p["nome"], ds_marca=p["marca"], ds_tipo=p["tipo"], unidade_med=p["unidade"],
                ds_pessoaj=empresa,
                cd_tiss="19" if p["tipo"] == MAT else "20",
                # Código ILUSTRATIVO (não é da tabela oficial da ANS)
                cd_tuss=f"{'7' if p['tipo'] == MAT else '9'}{9000000 + idx:07d}",
            )
        return self._cache[chave]

    # ─── Anúncios ─────────────────────────────────────────────────────
    def _criar_anuncios(self, rng, empresas, por_produto):
        hoje = date.today()
        imagens = {}
        anuncios = []
        pares = [
            (idx, vendedor)
            for idx in range(len(PRODUTOS))
            for vendedor in rng.sample(empresas, k=min(por_produto, len(empresas)))
        ]
        rng.shuffle(pares)  # catálogo "Recentes" sem o mesmo produto em sequência
        for idx, vendedor in pares:
            p = PRODUTOS[idx]
            if p["img"] not in imagens:
                imagens[p["img"]] = imagem_base64(p["img"])
            proxima = rng.random() < 0.12  # parte vence em até 30 dias
            validade = hoje + timedelta(days=rng.randint(12, 30) if proxima else rng.randint(75, 540))
            fabricacao = validade - timedelta(days=30 * p["validade"])
            preco_min, preco_max = p["preco"]
            quantidade = rng.choice([5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80])
            unitario = round(rng.uniform(preco_min, preco_max) * (0.75 if proxima else 1), 2)
            # val_base = valor do LOTE inteiro (é o que a compra imediata envia como total)
            valor = Decimal(str(unitario)) * quantidade
            anuncios.append(Anuncio.objects.create(
                ds_lote=f"{p['lote']}{fabricacao:%y%m}{rng.randint(100, 999)}",
                dt_fabricacao=fabricacao,
                dt_validade=validade,
                cd_mat=self._material(idx, vendedor),
                qtd_mat=quantidade,
                val_base=valor,
                cd_pessoa_anunciante=vendedor,
                ds_obs=OBS_VALIDADE_PROXIMA if proxima else rng.choice(OBSERVACOES[:-1]),
                imagem_anuncio=imagens[p["img"]],
                ie_status="A",
            ))

        # Datas de publicação espalhadas nos últimos 5 meses (gráfico de evolução)
        for a in anuncios:
            Anuncio.objects.filter(pk=a.pk).update(data_anuncio=hoje - timedelta(days=rng.randint(0, 150)))
            a.refresh_from_db(fields=["data_anuncio"])
        return anuncios

    # ─── Negociações (algumas aceitas, recusadas e pendentes) ─────────
    def _criar_negociacoes(self, rng, empresas, anuncios):
        agora = timezone.now()
        total = 0
        for anuncio in rng.sample(anuncios, k=min(18, len(anuncios))):
            comprador = rng.choice([e for e in empresas if e.pk != anuncio.cd_pessoa_anunciante_id])
            desfecho = rng.choices(["A", "R", "P"], weights=[5, 3, 4])[0]
            valor = (anuncio.val_base * Decimal(str(rng.uniform(0.82, 0.97)))).quantize(Decimal("0.01"))
            qtd = anuncio.qtd_mat if desfecho == "A" else max(1, anuncio.qtd_mat // rng.choice([1, 2]))
            enviada = agora - timedelta(days=rng.randint(1, max(2, (date.today() - anuncio.data_anuncio).days or 2)),
                                        hours=rng.randint(0, 20))
            neg = Negociacao.objects.create(
                anuncio=anuncio, comprador=comprador, vendedor=anuncio.cd_pessoa_anunciante,
                val_proposta=valor, qtd_proposta=qtd, status=desfecho,
                ds_obs="Proposta para reposição de estoque do almoxarifado.",
            )
            campos = {"data_proposta": enviada}
            if desfecho in ("A", "R"):
                campos["data_resposta"] = enviada + timedelta(hours=rng.randint(2, 60))
            Negociacao.objects.filter(pk=neg.pk).update(**campos)

            if desfecho == "A":
                Anuncio.objects.filter(pk=anuncio.pk).update(
                    ie_status="F", val_proposta=valor, val_aceito=valor, cd_pessoa_compradora=comprador,
                )
            elif desfecho == "P":
                Anuncio.objects.filter(pk=anuncio.pk).update(ie_status="N", val_proposta=valor)
            total += 1
        return total
