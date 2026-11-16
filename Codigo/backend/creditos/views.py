from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from creditos.acoes import tabela_de_custos
from creditos.carteira import LIMITE_EXTRATO_PADRAO, CarteiraCreditos, PagamentoRecusadoError
from creditos.models import PacoteCredito
from creditos.serializers import (
    ComprarCreditosSerializer,
    PacoteCreditoSerializer,
    TransacaoCreditoSerializer,
)


class PacotesCreditoListView(APIView):
    """GET: pacotes de créditos ativos (RN05)."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        pacotes = PacoteCredito.objects.filter(ativo=True)
        return Response(PacoteCreditoSerializer(pacotes, many=True).data)


class CustosCreditosView(APIView):
    """GET: custo, em créditos, de cada funcionalidade paga. Fonte única para o front."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(tabela_de_custos())


class SaldoCreditosView(APIView):
    """GET: saldo atual e totais acumulados da empresa logada (RF14 / RF16)."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(CarteiraCreditos(request.user).resumo())


class ExtratoCreditosView(APIView):
    """
    GET: histórico de movimentações (RF16).
    Parâmetros opcionais: ?tipo=C|D|E|B|X e ?limite=N (máx. 500).
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        try:
            limite = int(request.query_params.get('limite', LIMITE_EXTRATO_PADRAO))
        except ValueError:
            limite = LIMITE_EXTRATO_PADRAO

        transacoes = CarteiraCreditos(request.user).extrato(request.query_params.get('tipo'), limite)
        return Response(TransacaoCreditoSerializer(transacoes, many=True).data)


class ComprarCreditosView(APIView):
    """POST: compra de um pacote de créditos (RF13)."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ComprarCreditosSerializer(data=request.data)
        if not serializer.is_valid():
            primeiro_erro = next(iter(serializer.errors.values()))[0]
            return Response(
                {'erro': str(primeiro_erro), 'detalhes': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pacote = serializer.validated_data['pacote_id']
        try:
            transacao = CarteiraCreditos(request.user).comprar_pacote(
                pacote, serializer.validated_data['metodo_pagamento'],
            )
        except PagamentoRecusadoError as e:
            return Response({'erro': str(e)}, status=status.HTTP_402_PAYMENT_REQUIRED)

        return Response({
            'mensagem': f'{pacote.total_creditos} créditos adicionados com sucesso!',
            'saldo': transacao.saldo_apos,
            'transacao': TransacaoCreditoSerializer(transacao).data,
        }, status=status.HTTP_201_CREATED)
