"""Rotas da análise de estoque com IA."""
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import json

from anuncio.publicacao.erros import EntradaVaziaError, PublicacaoInvalidaError
from creditos.carteira import SaldoInsuficienteError
from estoque_ia.analise import HORIZONTE_PADRAO_DIAS
from estoque_ia.leitor import PlanilhaEstoqueInvalidaError
from estoque_ia.models import AnaliseEstoque
from estoque_ia.planilhas import gerar_exemplo, gerar_modelo, gerar_relatorio
from estoque_ia.servico import AnaliseEstoqueFacade

EXEMPLOS = ('completo', 'erp', 'alertas')


def _erro(mensagem, status_http=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({'erro': mensagem, **extra}, status=status_http)


def _arquivo(planilha) -> HttpResponse:
    resposta = HttpResponse(planilha.conteudo, content_type=planilha.content_type)
    resposta['Content-Disposition'] = f'attachment; filename="{planilha.nome_arquivo}"'
    resposta['Access-Control-Expose-Headers'] = 'Content-Disposition'
    return resposta


def _resumo(analise: AnaliseEstoque) -> dict:
    return {
        'id': analise.pk,
        'criado_em': analise.criado_em.isoformat(),
        'nome_arquivo': analise.nome_arquivo,
        'periodo_inicio': analise.periodo_inicio.isoformat(),
        'periodo_fim': analise.periodo_fim.isoformat(),
        'dias_periodo': analise.dias_periodo,
        'horizonte_dias': analise.horizonte_dias,
        'total_movimentacoes': analise.total_movimentacoes,
        'total_materiais': analise.total_materiais,
        'total_sugeridos': analise.total_sugeridos,
        'ia_utilizada': analise.ia_utilizada,
        'creditos_cobrados': analise.creditos_cobrados,
        'valor_total_sugerido': (analise.indicadores or {}).get('valor_total_sugerido'),
        'alertas_criticos': sum(1 for a in (analise.alertas or []) if a.get('nivel') == 'critico'),
    }


def _detalhe(analise: AnaliseEstoque, facade: AnaliseEstoqueFacade) -> dict:
    localizar = facade.localizador_de_insumos()
    itens = []
    for item in analise.itens or []:
        insumo = localizar(item)
        itens.append({**item, 'cd_mat': insumo['cd_mat'] if insumo else None, 'insumo': insumo,
                      'publicado': item.get('publicado')})
    return {
        **_resumo(analise),
        'analise_anterior_id': analise.analise_anterior_id,
        'resumo_ia': analise.resumo_ia,
        'recomendacoes': analise.recomendacoes,
        'indicadores': analise.indicadores,
        'alertas': analise.alertas,
        'itens': itens,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def baixar_modelo(request):
    """Planilha-modelo (.xlsx): Tutorial, Movimentações, Saldo Atual e Tipos de Movimentação."""
    return _arquivo(gerar_modelo())


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def baixar_exemplo(request, tipo):
    if tipo not in EXEMPLOS:
        return _erro('Exemplo não encontrado.', status.HTTP_404_NOT_FOUND)
    return _arquivo(gerar_exemplo(tipo))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def analisar(request):
    """Recebe a planilha, analisa com IA e salva no histórico."""
    arquivo = request.FILES.get('file')
    if not arquivo:
        return _erro('Nenhum arquivo enviado.')
    try:
        horizonte = int(request.data.get('horizonte_dias') or HORIZONTE_PADRAO_DIAS)
    except (TypeError, ValueError):
        horizonte = HORIZONTE_PADRAO_DIAS

    facade = AnaliseEstoqueFacade(request.user)
    try:
        analise = facade.analisar(arquivo, arquivo.name, horizonte)
    except SaldoInsuficienteError as e:
        return _erro(str(e), status.HTTP_402_PAYMENT_REQUIRED, saldo_insuficiente=True)
    except PlanilhaEstoqueInvalidaError as e:
        return _erro(str(e))
    return Response(_detalhe(analise, facade), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar(request):
    analises = AnaliseEstoqueFacade(request.user).historico().defer('itens')
    return Response([_resumo(a) for a in analises])


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def detalhe(request, pk):
    facade = AnaliseEstoqueFacade(request.user)
    try:
        if request.method == 'DELETE':
            facade.excluir(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(_detalhe(facade.obter(pk), facade))
    except AnaliseEstoque.DoesNotExist:
        return _erro('Análise não encontrada.', status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publicar(request, pk):
    """Publica os anúncios configurados a partir das sugestões (cadastra os insumos que faltarem)."""
    try:
        itens = json.loads(request.body)
    except json.JSONDecodeError:
        return _erro('Dados inválidos.')

    facade = AnaliseEstoqueFacade(request.user)
    try:
        anuncios = facade.publicar_sugestoes(pk, itens)
    except AnaliseEstoque.DoesNotExist:
        return _erro('Análise não encontrada.', status.HTTP_404_NOT_FOUND)
    except EntradaVaziaError as e:
        return _erro(str(e))
    except SaldoInsuficienteError as e:
        return _erro(str(e), status.HTTP_402_PAYMENT_REQUIRED, saldo_insuficiente=True, custo_total=e.custo)
    except PublicacaoInvalidaError as e:
        detalhes = [{'index': item.indice, 'erros': item.erros} for item in e.itens_invalidos]
        return _erro(str(e), detalhes=detalhes)

    return Response({
        'mensagem': f'{len(anuncios)} anúncio(s) publicado(s) com sucesso!',
        'total_criados': len(anuncios),
        'analise': _detalhe(facade.obter(pk), facade),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def relatorio(request, pk):
    try:
        analise = AnaliseEstoqueFacade(request.user).obter(pk)
    except AnaliseEstoque.DoesNotExist:
        return _erro('Análise não encontrada.', status.HTTP_404_NOT_FOUND)
    return _arquivo(gerar_relatorio(analise))
