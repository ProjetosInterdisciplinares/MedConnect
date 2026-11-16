from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notificacoes.models import AlertaInteresse, Notificacao
from notificacoes.serializers import AlertaInteresseSerializer, NotificacaoSerializer

LIMITE_NOTIFICACOES = 50


class NotificacoesView(APIView):
    """GET: notificações da empresa logada. ?nao_lidas=1 traz só as não lidas."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        notificacoes = Notificacao.objects.filter(destinatario=request.user)
        if request.query_params.get('nao_lidas') in ('1', 'true'):
            notificacoes = notificacoes.filter(lida=False)
        return Response({
            'nao_lidas': Notificacao.objects.filter(destinatario=request.user, lida=False).count(),
            'notificacoes': NotificacaoSerializer(notificacoes[:LIMITE_NOTIFICACOES], many=True).data,
        })


class MarcarNotificacaoLidaView(APIView):
    """POST: marca uma notificação como lida."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        notificacao = get_object_or_404(Notificacao, pk=pk, destinatario=request.user)
        notificacao.lida = True
        notificacao.save(update_fields=['lida'])
        return Response(NotificacaoSerializer(notificacao).data)


class MarcarTodasLidasView(APIView):
    """POST: marca todas as notificações da empresa como lidas."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        total = Notificacao.objects.filter(destinatario=request.user, lida=False).update(lida=True)
        return Response({'marcadas': total}, status=status.HTTP_200_OK)


class AlertaInteresseViewSet(viewsets.ModelViewSet):
    """Alertas "me avise quando aparecer um anúncio de ..." da empresa logada."""
    permission_classes = (IsAuthenticated,)
    serializer_class = AlertaInteresseSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return AlertaInteresse.objects.filter(empresa=self.request.user)

    def perform_create(self, serializer):
        serializer.save(empresa=self.request.user)
