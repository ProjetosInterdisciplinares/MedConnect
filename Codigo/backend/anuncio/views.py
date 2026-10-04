from rest_framework.decorators import api_view, permission_classes
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, Case, When, Value, BooleanField
from django.utils import timezone
from anuncio.models import Anuncio, Negociacao
from anuncio.serializers import AnuncioSerializer, NegociacaoSerializer

# View que retorna somente os anúncios onde o usuário é o anunciante
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def meus_anuncios(request):
    # RN02: Lazy cron job
    hoje = timezone.now().date()
    Anuncio.objects.filter(ie_status='A', dt_validade__lt=hoje).update(ie_status='I')

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
    permission_classes = (IsAuthenticated,)
    serializer_class = AnuncioSerializer

    def get_queryset(self):
        # RN02: Lazy cron job para inativar anúncios expirados
        hoje = timezone.now().date()
        Anuncio.objects.filter(ie_status='A', dt_validade__lt=hoje).update(ie_status='I')

        status = self.request.query_params.get('status', 'A')
        queryset = Anuncio.objects.filter(ie_status=status)

        ds_mat = self.request.query_params.get('ds_mat')
        if ds_mat:
            queryset = queryset.filter(
                cd_mat__ds_mat__icontains=ds_mat
            )

        hospital = self.request.query_params.get('hospital')
        if hospital:
            queryset = queryset.filter(
                cd_pessoa_anunciante__nm_pessoaj__icontains=hospital
            )

        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(
                cd_mat__ds_tipo__ds_tipo__icontains=tipo
            )

        # Ordenação inteligente baseada nos interesses da IA
        user = self.request.user
        if hasattr(user, 'interesses_ia') and user.interesses_ia and status == 'A':
            # Separa as tags geradas pela IA (ex: "luva, seringa")
            tags = [t.strip() for t in user.interesses_ia.split(',') if t.strip()]
            
            if tags:
                # Cria uma condição Q para verificar se o nome do material ou tipo contém alguma das tags
                q_objects = Q()
                for tag in tags:
                    q_objects |= Q(cd_mat__ds_mat__icontains=tag) | Q(cd_mat__ds_tipo__icontains=tag)
                
                # Anota os anúncios que dão match com os interesses
                queryset = queryset.annotate(
                    is_recommended=Case(
                        When(q_objects, then=Value(True)),
                        default=Value(False),
                        output_field=BooleanField(),
                    )
                ).order_by('-is_recommended', '-nr_anuncio')
            else:
                # Fallback ordenação normal se não tiver tags válidas
                queryset = queryset.order_by('-nr_anuncio')
        else:
            # Fallback ordenação normal
            queryset = queryset.order_by('-nr_anuncio')

        return queryset

    def create(self, request, *args, **kwargs):
        from creditos.services import consumir_funcionalidade, SaldoInsuficienteError
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            consumir_funcionalidade(
                pessoa_juridica=request.user,
                funcionalidade='PUBLICAR_ANUNCIO',
                descricao='Publicação de novo anúncio no catálogo'
            )
            
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except SaldoInsuficienteError as e:
            return Response(
                {"erro": str(e), "saldo_insuficiente": True},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )


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
    queryset = Anuncio.objects.all()
    serializer_class = AnuncioSerializer
    lookup_field = 'nr_anuncio'

    def perform_destroy(self, instance):
        if instance.ie_status in ('N', 'F'):
            raise ValidationError(
                "Não é possível remover um anúncio em negociação ou finalizado."
            )
        instance.delete()


class NegociacaoViewSet(viewsets.ModelViewSet):
    """
    RF08/RF09/RF10: abertura de negociação, envio de proposta, aceite/recusa.

    - O vendedor é sempre o anunciante (definido pelo servidor).
    - Proposta só pode ser aberta em anúncio 'A' (ativo, não expirado).
    - Aprovar/recusar: apenas o vendedor. Cancelar: apenas o comprador.
    - Só é possível responder propostas com status Pendente.
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = NegociacaoSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        return Negociacao.objects.filter(Q(comprador=user) | Q(vendedor=user)).order_by('-data_proposta')

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

            negociacao = serializer.save(
                comprador=user,
                vendedor=anuncio.cd_pessoa_anunciante,
                qtd_proposta=qtd,
            )

            # Compra direta: quantidade total pelo valor base → aprova na hora.
            # Compra parcial (RF15) sempre passa pela aprovação do vendedor.
            compra_total = qtd == anuncio.qtd_mat
            if compra_total and negociacao.val_proposta == anuncio.val_base:
                negociacao.status = 'A'
                negociacao.data_resposta = timezone.now()
                negociacao.save()

                anuncio.ie_status = 'F'
                anuncio.val_aceito = negociacao.val_proposta
                anuncio.cd_pessoa_compradora = user
                anuncio.save()
            else:
                # Proposta com valor diferente: anúncio sai do catálogo
                anuncio.ie_status = 'N'
                anuncio.cd_pessoa_compradora = user
                anuncio.val_proposta = negociacao.val_proposta
                anuncio.save()

    def perform_update(self, serializer):
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
                    # RF15: venda parcial — abate o estoque e o restante vai para Saldo de Venda
                    anuncio.qtd_mat = restante
                    anuncio.ie_status = 'S'
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