import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from anuncio.serializers import AnuncioSerializer
from creditos.carteira import SaldoInsuficienteError
from gemini_api.assistente import AssistenteIAFacade
from gemini_api.provedores import ErroProvedorIA, IAIndisponivelError, RespostaInvalidaIAError
from mat_med.models import MatMed

logger = logging.getLogger(__name__)


def erro(mensagem, codigo=status.HTTP_500_INTERNAL_SERVER_ERROR, **extra):
    return Response({'erro': mensagem, **extra}, status=codigo)


class GerarDescricaoAnuncioView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        cd_mat = request.data.get('cd_mat')
        if not cd_mat:
            return erro('Escolha o insumo antes de gerar a descrição.', status.HTTP_400_BAD_REQUEST)

        try:
            material = MatMed.objects.get(cd_mat=cd_mat)
        except MatMed.DoesNotExist:
            return erro('Insumo não encontrado.', status.HTTP_404_NOT_FOUND)

        try:
            texto = AssistenteIAFacade().gerar_descricao(empresa=request.user, material=material)
        except SaldoInsuficienteError as e:
            return erro(str(e), status.HTTP_402_PAYMENT_REQUIRED, saldo_insuficiente=True)
        except IAIndisponivelError:
            logger.warning('IA indisponível ao gerar descrição', exc_info=True)
            return erro('O serviço de inteligência artificial está com alta demanda no momento. '
                        'Por favor, tente novamente em alguns instantes.')
        except ErroProvedorIA:
            logger.exception('Falha da IA ao gerar descrição')
            return erro('Ocorreu um erro interno ao se comunicar com a inteligência artificial. '
                        'Tente novamente mais tarde.')

        return Response({'texto_sugerido': texto}, status=status.HTTP_200_OK)


class BuscaSemanticaView(APIView):
    """Busca no catálogo em linguagem natural, com os anúncios ordenados por relevância."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        termo = request.data.get('termo', '').strip()
        if not termo:
            return erro("O campo 'termo' é obrigatório.", status.HTTP_400_BAD_REQUEST)

        try:
            anuncios = AssistenteIAFacade().buscar_semanticamente(termo, request.user)
        except RespostaInvalidaIAError:
            logger.warning('IA retornou JSON inválido na busca semântica', exc_info=True)
            return erro('A IA retornou uma resposta inválida. Tente novamente.')
        except IAIndisponivelError:
            logger.warning('IA indisponível na busca semântica', exc_info=True)
            return erro('A busca inteligente está temporariamente indisponível devido à alta demanda.')
        except ErroProvedorIA:
            logger.exception('Falha da IA na busca semântica')
            return erro('Ocorreu um erro ao realizar a busca semântica.')

        return Response(AnuncioSerializer(anuncios, many=True).data, status=status.HTTP_200_OK)


class AtualizarInteressesView(APIView):
    """Atualiza as tags de interesse da empresa a partir da pesquisa feita (chamada em segundo plano)."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        termo = request.data.get('termo', '').strip()
        if not termo:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            tags = AssistenteIAFacade().atualizar_interesses(request.user, termo)
        except ErroProvedorIA:
            logger.warning('Falha da IA ao atualizar interesses', exc_info=True)
            return erro('Não foi possível atualizar os interesses agora.')

        return Response({'sucesso': True, 'novos_interesses': tags}, status=status.HTTP_200_OK)
