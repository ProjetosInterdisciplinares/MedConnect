import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from creditos.carteira import SaldoInsuficienteError
from mat_med.models import MatMed
from preco_referencia.busca import sugerir_catmat
from preco_referencia.compras_gov import FontePrecosError, FontePrecosIndisponivelError
from preco_referencia.consulta import ConsultaPrecoReferenciaFacade, InsumoSemCatmatError

logger = logging.getLogger(__name__)


def erro(mensagem, codigo, **extra):
    return Response({'erro': mensagem, **extra}, status=codigo)


class SugestoesCatmatView(APIView):
    """
    GET ?q=seringa 20ml[&categoria=Medicamento|Material Hospitalar]
    Sugestões de código CATMAT para o nome digitado. Gratuita.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        itens = sugerir_catmat(request.query_params.get('q', ''), request.query_params.get('categoria'))
        return Response([{'codigo': str(i.codigo), 'descricao': i.descricao} for i in itens])


class ConsultaPrecoReferenciaView(APIView):
    """
    POST {"cd_mat": 12}
    Preços praticados em compras públicas para o insumo (15 créditos,
    cobrados só quando há resultado). Disponível ao anunciante e ao comprador.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        cd_mat = request.data.get('cd_mat')
        if not cd_mat:
            return erro('Informe o insumo a consultar.', status.HTTP_400_BAD_REQUEST)
        try:
            material = MatMed.objects.get(cd_mat=cd_mat)
        except (MatMed.DoesNotExist, ValueError, TypeError):
            return erro('Insumo não encontrado.', status.HTTP_404_NOT_FOUND)

        try:
            resumo = ConsultaPrecoReferenciaFacade().consultar(empresa=request.user, material=material)
        except InsumoSemCatmatError as e:
            return erro(str(e), status.HTTP_400_BAD_REQUEST, sem_catmat=True)
        except SaldoInsuficienteError as e:
            return erro(str(e), status.HTTP_402_PAYMENT_REQUIRED, saldo_insuficiente=True)
        except FontePrecosIndisponivelError:
            logger.warning('Compras.gov.br indisponível na consulta de preço', exc_info=True)
            return erro('O Compras.gov.br não respondeu agora. Nenhum crédito foi cobrado; '
                        'tente novamente em alguns minutos.', status.HTTP_503_SERVICE_UNAVAILABLE)
        except FontePrecosError:
            logger.exception('Falha na consulta de preço ao Compras.gov.br')
            return erro('Não foi possível consultar o preço de referência. Nenhum crédito foi cobrado.',
                        status.HTTP_502_BAD_GATEWAY)

        return Response(resumo, status=status.HTTP_200_OK)
