from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from anuncio.catalogo import CatalogoAnuncios
from anuncio.models import Anuncio, Negociacao
from anuncio.ordenacao import estrategia_por_nome
from anuncio.publicacao.erros import PublicacaoInvalidaError
from anuncio.publicacao.facade import AnuncioFacade
from anuncio.serializers import AnuncioSerializer, NegociacaoSerializer
from creditos.carteira import SaldoInsuficienteError

# View que retorna somente os anúncios onde o usuário é o anunciante
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def meus_anuncios(request):
    Anuncio.objects.inativar_vencidos()
    Negociacao.objects.expirar_vencidas()

    anuncios = Anuncio.objects.filter(
        cd_pessoa_anunciante=request.user
    )

    serializer = AnuncioSerializer(anuncios, many=True)
    return Response(serializer.data)

# View que retorna somente os anúncios onde o usuário é o comprador e o status é 'F' (finalizado)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def minhas_compras(request):
    anuncios = Anuncio.objects.filter(
        cd_pessoa_compradora=request.user,
        ie_status='F'
    )

    serializer = AnuncioSerializer(anuncios, many=True)
    return Response(serializer.data)

# NOTA: o endpoint legado "minhas-propostas" (baseado em Anuncio.cd_pessoa_compradora)
# foi removido. As propostas são consultadas exclusivamente via /negociacoes/.

class AnuncioCreateListView(generics.ListCreateAPIView):
    """
    GET: catálogo. Parâmetros: status, ds_mat, hospital, tipo e
    ordenar=recomendados|recentes|menor_preco|validade|distancia.
    POST: publicação manual (5 créditos).
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = AnuncioSerializer
    FILTROS = ('status', 'ds_mat', 'hospital', 'tipo')

    def get_queryset(self):
        params = self.request.query_params
        situacao = params.get('status', Anuncio.STATUS_ATIVO)
        padrao = 'recomendados' if situacao == Anuncio.STATUS_ATIVO else 'recentes'

        catalogo = CatalogoAnuncios(estrategia_por_nome(params.get('ordenar') or padrao))
        return catalogo.listar(self.request.user, {campo: params.get(campo) for campo in self.FILTROS})

    def create(self, request, *args, **kwargs):
        try:
            anuncio = AnuncioFacade(request.user).publicar_manual(request.data)
        except SaldoInsuficienteError as e:
            return Response({"erro": str(e), "saldo_insuficiente": True}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except PublicacaoInvalidaError as e:
            erros = e.itens_invalidos[0].erros
            return Response({"erro": "; ".join(erros), "erros": erros}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(anuncio).data, status=status.HTTP_201_CREATED)


class IsAnuncianteOrReadOnly(BasePermission):
    """Somente o dono do anúncio pode editá-lo ou removê-lo."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.cd_pessoa_anunciante_id == request.user.pk


class AnuncioRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    """
    Edição dos dados do anúncio pelo anunciante.

    Os campos de negociação (ie_status N/F, val_proposta, val_aceito,
    cd_pessoa_compradora) NÃO são alterados aqui: pertencem ao fluxo de
    Negociacao (/negociacoes/), única fonte de verdade para propostas.
    """
    permission_classes = (IsAuthenticated, IsAnuncianteOrReadOnly)
    serializer_class = AnuncioSerializer
    lookup_field = 'nr_anuncio'

    def get_queryset(self):
        Negociacao.objects.expirar_vencidas()
        return Anuncio.objects.all()

    def perform_destroy(self, instance):
        if instance.ie_status in ('N', 'F'):
            raise ValidationError(
                "Não é possível remover um anúncio em negociação ou finalizado."
            )
        instance.delete()


class NegociacaoViewSet(viewsets.ModelViewSet):
    """
    RF08/RF09/RF10: proposta, resposta do vendedor e conclusão do negócio.

    Percurso: Pendente (72 h para responder; sem resposta, expira)
    → Aceita (contatos liberados) ou Recusada (com motivo) ou Cancelada
    → Concluída (vendedor confirma a entrega e comprador o recebimento)
      ou Não concluída (o negócio não aconteceu).

    - O vendedor é sempre o anunciante (definido pelo servidor).
    - Aceitar/recusar: apenas o vendedor. Cancelar: apenas o comprador.
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = NegociacaoSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        Negociacao.objects.expirar_vencidas()
        user = self.request.user
        return (
            Negociacao.objects.filter(Q(comprador=user) | Q(vendedor=user))
            .select_related('anuncio__cd_mat', 'comprador', 'vendedor')
            .order_by('-data_proposta')
        )

    # ── Conclusão do negócio ──────────────────────────────────────────

    def _aceita_para(self, papel: str) -> Negociacao:
        negociacao = self.get_object()
        if negociacao.status != Negociacao.STATUS_ACEITA:
            raise ValidationError("Só é possível confirmar negociações aceitas e ainda não concluídas.")
        dono = negociacao.vendedor_id if papel == 'vendedor' else negociacao.comprador_id
        if papel != 'qualquer' and dono != self.request.user.pk:
            raise ValidationError(f"Somente o {papel} pode fazer esta confirmação.")
        return negociacao

    @staticmethod
    def _concluir_se_confirmada(negociacao: Negociacao) -> None:
        if negociacao.entregue_em and negociacao.recebido_em:
            negociacao.status = Negociacao.STATUS_CONCLUIDA

    @action(detail=True, methods=['post'], url_path='confirmar-entrega')
    def confirmar_entrega(self, request, pk=None):
        negociacao = self._aceita_para('vendedor')
        negociacao.entregue_em = negociacao.entregue_em or timezone.now()
        self._concluir_se_confirmada(negociacao)
        negociacao.save()
        return Response(self.get_serializer(negociacao).data)

    @action(detail=True, methods=['post'], url_path='confirmar-recebimento')
    def confirmar_recebimento(self, request, pk=None):
        negociacao = self._aceita_para('comprador')
        negociacao.recebido_em = negociacao.recebido_em or timezone.now()
        self._concluir_se_confirmada(negociacao)
        negociacao.save()
        return Response(self.get_serializer(negociacao).data)

    @action(detail=True, methods=['post'], url_path='nao-concluida')
    def nao_concluida(self, request, pk=None):
        negociacao = self._aceita_para('qualquer')
        with transaction.atomic():
            negociacao.status = Negociacao.STATUS_NAO_CONCLUIDA
            negociacao.save()
            # Venda do lote inteiro que não aconteceu: o anúncio volta como rascunho,
            # para o vendedor revisar e reativar. Na venda parcial, o vendedor ajusta o saldo.
            anuncio = negociacao.anuncio
            if anuncio.ie_status == Anuncio.STATUS_FINALIZADO and anuncio.cd_pessoa_compradora_id == negociacao.comprador_id:
                anuncio.ie_status = Anuncio.STATUS_INATIVO
                anuncio.val_aceito = None
                anuncio.cd_pessoa_compradora = None
                anuncio.save()
        return Response(self.get_serializer(negociacao).data)

    def perform_create(self, serializer):
        user = self.request.user
        with transaction.atomic():
            # Trava o anúncio: impede que dois compradores abram proposta ao mesmo tempo
            anuncio = Anuncio.objects.select_for_update().get(
                pk=serializer.validated_data['anuncio'].pk
            )
            if anuncio.ie_status != 'A':
                raise ValidationError("Este anúncio não está mais disponível para propostas.")

            qtd = serializer.validated_data.get('qtd_proposta') or anuncio.qtd_mat

            # Toda proposta, inclusive a compra do lote inteiro pelo valor anunciado,
            # fica pendente até o vendedor confirmar. O anúncio sai do catálogo.
            negociacao = serializer.save(
                comprador=user,
                vendedor=anuncio.cd_pessoa_anunciante,
                qtd_proposta=qtd,
                prazo_resposta=timezone.now() + Negociacao.PRAZO_RESPOSTA,
            )
            anuncio.ie_status = Anuncio.STATUS_NEGOCIACAO
            anuncio.cd_pessoa_compradora = user
            anuncio.val_proposta = negociacao.val_proposta
            anuncio.save()

    def perform_update(self, serializer):
        # Opções do saldo restante (venda parcial); não são campos da Negociacao
        saldo = {campo: serializer.validated_data.pop(campo)
                 for campo in NegociacaoSerializer.CAMPOS_SALDO if campo in serializer.validated_data}

        with transaction.atomic():
            atual = Negociacao.objects.select_for_update().get(pk=serializer.instance.pk)
            if atual.status != 'P':
                raise ValidationError("Esta proposta já foi respondida e não pode ser alterada.")

            anuncio = Anuncio.objects.select_for_update().get(pk=atual.anuncio_id)

            if serializer.validated_data.get('status') == 'A' and atual.qtd_proposta > anuncio.qtd_mat:
                raise ValidationError(
                    f"Quantidade da proposta ({atual.qtd_proposta}) maior que o disponível "
                    f"no anúncio ({anuncio.qtd_mat})."
                )

            negociacao = serializer.save()
            agora = timezone.now()

            if negociacao.status == 'A':
                negociacao.data_resposta = agora
                negociacao.save()

                restante = anuncio.qtd_mat - (negociacao.qtd_proposta or anuncio.qtd_mat)
                if restante > 0:
                    # RF15: venda parcial. O saldo fica com o valor proporcional (ou o
                    # informado pelo vendedor) e volta ao catálogo se ele escolher.
                    proporcional = (anuncio.val_base * restante / anuncio.qtd_mat).quantize(Decimal('0.01'))
                    anuncio.qtd_mat = restante
                    anuncio.val_base = saldo.get('novo_val_base') or max(proporcional, Decimal('0.01'))
                    if saldo.get('nova_descricao'):
                        anuncio.ds_obs = saldo['nova_descricao']
                    anuncio.ie_status = Anuncio.STATUS_ATIVO if saldo.get('reativar_saldo') else Anuncio.STATUS_SALDO
                    anuncio.val_proposta = None
                    anuncio.cd_pessoa_compradora = None
                    anuncio.save()
                else:
                    anuncio.ie_status = 'F'
                    anuncio.val_aceito = negociacao.val_proposta
                    anuncio.cd_pessoa_compradora = negociacao.comprador
                    anuncio.save()

                Negociacao.objects.filter(anuncio=anuncio, status='P').exclude(
                    id=negociacao.id
                ).update(status='C', data_resposta=agora)

            elif negociacao.status in ('R', 'C'):
                negociacao.data_resposta = agora
                negociacao.save()

                # Volta o anúncio pro catálogo
                anuncio.ie_status = 'A'
                anuncio.val_proposta = None
                anuncio.cd_pessoa_compradora = None
                anuncio.save()