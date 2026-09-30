from rest_framework.decorators import api_view, permission_classes
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
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

# View que retorna somente os anúncios onde o usuário é o anunciante e o status é 'N' (em andamento)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def minhas_propostas(request):
    anuncios = Anuncio.objects.filter(
        cd_pessoa_compradora=request.user
    ).order_by('-data_anuncio')

    serializer = AnuncioSerializer(anuncios, many=True)
    return Response(serializer.data)

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


class AnuncioRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    queryset = Anuncio.objects.all()
    serializer_class = AnuncioSerializer
    lookup_field = 'nr_anuncio'

    def perform_update(self, serializer):
        status_anterior = self.get_object().ie_status

        anuncio = serializer.save()

        # A → F: proposta igual ao valor base, finaliza automaticamente
        if (
            status_anterior == 'A'
            and anuncio.val_proposta
            and anuncio.val_proposta == anuncio.val_base
        ):
            anuncio.ie_status = 'F'
            anuncio.val_aceito = anuncio.val_base
            anuncio.save()

        # A → N: proposta diferente do valor base, fica em andamento
        elif (
            status_anterior == 'A'
            and anuncio.val_proposta
            and anuncio.val_proposta != anuncio.val_base
        ):
            anuncio.ie_status = 'N'
            anuncio.save()

        # N → F: anunciante aceitou proposta diferente
        # Frontend manda: ie_status = 'F' + cd_pessoa_compradora
        elif (
            status_anterior == 'N'
            and anuncio.ie_status == 'F'
        ):
            anuncio.val_aceito = anuncio.val_proposta
            anuncio.save()

        # N → A: anunciante recusou, limpa tudo e volta ativo
        # Frontend manda: ie_status = 'A'
        elif (
            status_anterior == 'N'
            and anuncio.ie_status == 'A'
        ):
            anuncio.val_proposta = None
            anuncio.val_aceito = None
            anuncio.cd_pessoa_compradora = None
            anuncio.save()

class NegociacaoViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = NegociacaoSerializer

    def get_queryset(self):
        user = self.request.user
        return Negociacao.objects.filter(Q(comprador=user) | Q(vendedor=user)).order_by('-data_proposta')

    def perform_create(self, serializer):
        negociacao = serializer.save(comprador=self.request.user)
        
        anuncio = negociacao.anuncio
        
        # Compra direta (valor igual ao base): aprova na hora
        if negociacao.val_proposta == anuncio.val_base:
            negociacao.status = 'A'
            negociacao.data_resposta = timezone.now()
            negociacao.save()
            
            anuncio.ie_status = 'F'
            anuncio.val_aceito = negociacao.val_proposta
            anuncio.cd_pessoa_compradora = self.request.user
            anuncio.save()
        else:
            # Proposta com valor diferente: anúncio sai do catálogo
            anuncio.ie_status = 'N'
            anuncio.cd_pessoa_compradora = self.request.user
            anuncio.val_proposta = negociacao.val_proposta
            anuncio.save()

    def perform_update(self, serializer):
        negociacao = serializer.save()
        if negociacao.status == 'A':
            negociacao.data_resposta = timezone.now()
            negociacao.save()
            
            anuncio = negociacao.anuncio
            anuncio.ie_status = 'F'
            anuncio.val_aceito = negociacao.val_proposta
            anuncio.cd_pessoa_compradora = negociacao.comprador
            anuncio.save()

            Negociacao.objects.filter(anuncio=anuncio, status='P').exclude(id=negociacao.id).update(status='C', data_resposta=timezone.now())
            
        elif negociacao.status == 'R' or negociacao.status == 'C':
            negociacao.data_resposta = timezone.now()
            negociacao.save()
            
            # Volta o anúncio pro catálogo
            anuncio = negociacao.anuncio
            anuncio.ie_status = 'A'
            anuncio.val_proposta = None
            anuncio.cd_pessoa_compradora = None
            anuncio.save()