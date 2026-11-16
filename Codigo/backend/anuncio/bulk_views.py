"""Importação em massa de anúncios por planilha Excel."""
import json

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from anuncio.publicacao.erros import EntradaVaziaError, PlanilhaInvalidaError, PublicacaoInvalidaError
from anuncio.publicacao.facade import AnuncioFacade
from creditos.carteira import SaldoInsuficienteError


def _erro(mensagem, status_http=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({'erro': mensagem, **extra}, status=status_http)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_template(request):
    """Planilha-modelo (.xlsx) com as abas 'Tutorial' e 'Anúncios'."""
    modelo = AnuncioFacade.baixar_modelo_planilha()
    response = HttpResponse(modelo.conteudo, content_type=modelo.content_type)
    response['Content-Disposition'] = f'attachment; filename="{modelo.nome_arquivo}"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def validate_bulk_upload(request):
    """Lê a planilha e devolve a prévia dos anúncios com os erros de cada linha. Não grava nada."""
    arquivo = request.FILES.get('file')
    if not arquivo:
        return _erro('Nenhum arquivo enviado.')

    try:
        resultado = AnuncioFacade(request.user).pre_visualizar_planilha(arquivo)
    except (PlanilhaInvalidaError, EntradaVaziaError) as e:
        return _erro(str(e))

    linhas = [_linha_da_previa(item) for item in resultado.itens]
    validas = [linha for linha in linhas if linha['valido']]
    return Response({
        'total': len(linhas),
        'total_validos': len(validas),
        'total_invalidos': len(linhas) - len(validas),
        'total_novos_insumos': sum(1 for linha in validas if not linha['insumo_existente']),
        'anuncios': linhas,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_bulk_ads(request):
    """Publica, em uma única transação, os anúncios confirmados na prévia."""
    try:
        itens = json.loads(request.body)
    except json.JSONDecodeError:
        return _erro('Dados inválidos.')

    try:
        anuncios = AnuncioFacade(request.user).publicar_lote(itens)
    except EntradaVaziaError as e:
        return _erro(str(e))
    except SaldoInsuficienteError as e:
        return _erro(str(e), status.HTTP_402_PAYMENT_REQUIRED, codigo='SALDO_INSUFICIENTE', custo_total=e.custo)
    except PublicacaoInvalidaError as e:
        detalhes = [{'index': item.indice, 'erro': '; '.join(item.erros)} for item in e.itens_invalidos]
        return _erro(str(e), detalhes=detalhes)

    return Response({
        'mensagem': f'{len(anuncios)} anúncio(s) publicado(s) com sucesso!',
        'total_criados': len(anuncios),
        'anuncios': [{
            'nr_anuncio': a.nr_anuncio,
            'ds_mat': a.cd_mat.ds_mat,
            'ds_lote': a.ds_lote,
            'qtd_mat': a.qtd_mat,
            'val_base': str(a.val_base),
        } for a in anuncios],
    }, status=status.HTTP_201_CREATED)


def _linha_da_previa(item) -> dict:
    return {
        'linha': item.dados.linha,
        'index': item.indice,
        'publicar': item.valido,
        'valido': item.valido,
        'erros': item.erros,
        'insumo_existente': item.insumo_cadastrado is not None,
        'insumo_cd_mat': item.insumo_cadastrado.cd_mat if item.insumo_cadastrado else None,
        'insumo': item.dados.insumo.como_dict(),
        'anuncio': item.valores,
    }
