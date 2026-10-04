from django.db.models import Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from creditos.models import PacoteCredito, TransacaoCredito
from creditos.serializers import (
    PacoteCreditoSerializer,
    TransacaoCreditoSerializer,
    ComprarCreditosSerializer,
)
from creditos.services import processar_compra_pacote


class PacotesCreditoListView(APIView):
    """GET — Lista os pacotes de créditos ativos (RN05)."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        pacotes = PacoteCredito.objects.filter(ativo=True)
        return Response(PacoteCreditoSerializer(pacotes, many=True).data)


class SaldoCreditosView(APIView):
    """GET — Saldo atual e totais acumulados da empresa logada (RF14 / RF16)."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        empresa = request.user
        transacoes = TransacaoCredito.objects.filter(
            pessoa_juridica=empresa,
            status=TransacaoCredito.STATUS_APROVADA,
        )
        total_adquirido = transacoes.exclude(
            tipo=TransacaoCredito.TIPO_CONSUMO
        ).aggregate(t=Sum('quantidade'))['t'] or 0
        total_consumido = transacoes.filter(
            tipo=TransacaoCredito.TIPO_CONSUMO
        ).aggregate(t=Sum('quantidade'))['t'] or 0

        return Response({
            'saldo': empresa.saldo_creditos,
            'total_adquirido': total_adquirido,
            'total_consumido': total_consumido,
        })


class ExtratoCreditosView(APIView):
    """
    GET — Histórico de movimentações (RF16).
    Query params opcionais:
      ?tipo=C|D|E|B   filtra pelo tipo
      ?limite=N       limita a quantidade de registros (máx. 500)
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        qs = TransacaoCredito.objects.filter(
            pessoa_juridica=request.user
        ).select_related('pacote')

        tipo = request.query_params.get('tipo')
        if tipo in dict(TransacaoCredito.TIPO_CHOICES):
            qs = qs.filter(tipo=tipo)

        try:
            limite = min(int(request.query_params.get('limite', 200)), 500)
        except ValueError:
            limite = 200

        return Response(TransacaoCreditoSerializer(qs[:limite], many=True).data)


class ComprarCreditosView(APIView):
    """POST — Compra um pacote de créditos (RF13). Pagamento simulado."""
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
        metodo = serializer.validated_data['metodo_pagamento']

        transacao = processar_compra_pacote(request.user, pacote, metodo)

        return Response({
            'mensagem': f'{pacote.total_creditos} créditos adicionados com sucesso!',
            'saldo': transacao.saldo_apos,
            'transacao': TransacaoCreditoSerializer(transacao).data,
        }, status=status.HTTP_201_CREATED)
