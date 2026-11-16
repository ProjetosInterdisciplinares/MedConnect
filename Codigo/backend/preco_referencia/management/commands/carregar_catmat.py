"""
Carrega (ou atualiza) a cópia local do catálogo CATMAT das classes de saúde.

    python manage.py carregar_catmat                       # classes padrão: 6505 6510 6515 6532
    python manage.py carregar_catmat --classes 6550 6530   # outras classes do grupo 65

A API do Compras.gov.br não busca por nome; ela lista os itens de uma
classe, página por página. O comando baixa essas páginas com uma pausa
entre elas e grava código + descrição. Pode ser repetido: itens já
existentes são atualizados.
"""
import time

from django.core.management.base import BaseCommand, CommandError

from preco_referencia.busca import CLASSES_PADRAO, normalizar
from preco_referencia.compras_gov import ComprasGovAdapter, FontePrecosError, FontePrecosIndisponivelError
from preco_referencia.models import ItemCatmat

TENTATIVAS = 3


class Command(BaseCommand):
    help = 'Carrega o catálogo CATMAT (classes de saúde) do Compras.gov.br para o banco local.'

    def add_arguments(self, parser):
        parser.add_argument('--classes', nargs='+', type=int, default=list(CLASSES_PADRAO))
        parser.add_argument('--pausa', type=float, default=1.0, help='Segundos entre páginas.')

    def handle(self, *args, classes, pausa, **opcoes):
        fonte = ComprasGovAdapter()
        for classe in classes:
            pagina, total_paginas = 1, 1
            while pagina <= total_paginas:
                resultado = self._pagina(fonte, classe, pagina)
                total_paginas = resultado.total_paginas
                self._gravar(resultado.itens)
                self.stdout.write(f'classe {classe}: página {pagina}/{total_paginas}')
                pagina += 1
                time.sleep(pausa)

        self.stdout.write(self.style.SUCCESS(f'Catálogo com {ItemCatmat.objects.count()} itens.'))

    def _pagina(self, fonte, classe: int, pagina: int):
        """A API pública às vezes falha no meio da carga: tenta a mesma página até 3 vezes."""
        for tentativa in range(1, TENTATIVAS + 1):
            try:
                return fonte.listar_catalogo(classe, pagina)
            except FontePrecosIndisponivelError as erro:
                if tentativa == TENTATIVAS:
                    raise CommandError(f'Classe {classe}, página {pagina}: {erro}') from erro
                self.stdout.write(self.style.WARNING(f'falha na página {pagina}; nova tentativa em 10 s'))
                time.sleep(10)
            except FontePrecosError as erro:
                raise CommandError(f'Classe {classe}, página {pagina}: {erro}') from erro

    @staticmethod
    def _gravar(itens) -> None:
        # Um código repetido na mesma página quebraria o upsert do PostgreSQL
        unicos = {i.codigo: i for i in itens}.values()
        ItemCatmat.objects.bulk_create(
            [
                ItemCatmat(
                    codigo=i.codigo,
                    descricao=i.descricao,
                    descricao_busca=normalizar(i.descricao),
                    codigo_classe=i.codigo_classe,
                )
                for i in unicos
            ],
            update_conflicts=True,
            unique_fields=['codigo'],
            update_fields=['descricao', 'descricao_busca', 'codigo_classe'],
        )
