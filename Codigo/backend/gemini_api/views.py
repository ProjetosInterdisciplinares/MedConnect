import os
import json
from dotenv import load_dotenv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from google import genai
from django.db import transaction

from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica
from anuncio.models import Anuncio
from anuncio.serializers import AnuncioSerializer
from creditos.services import consumir_funcionalidade, SaldoInsuficienteError

load_dotenv()


class GerarDescricaoAnuncioView(APIView):
    permission_classes = (IsAuthenticated,)
    
    def post(self, request):
        dados = request.data
        
        cd_mat_id = dados.get('cd_mat')
        cd_pessoa_anunciante  = dados.get('cd_pessoa_anunciante')
        qtd_solicitada = dados.get('qtd_mat')
        
        # Opcionais (vieram da tela de anuncio)
        ds_lote = dados.get('ds_lote', 'N/A')
        dt_validade = dados.get('dt_validade', 'N/A')

        if not all([cd_mat_id, cd_pessoa_anunciante, qtd_solicitada]):
            return Response(
                {"erro": "Faltam parâmetros obrigatórios (cd_mat, cd_pessoa_anunciante, qtd_mat)."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            material = MatMed.objects.get(cd_mat=cd_mat_id)
            hospital_anunciante = PessoaJuridica.objects.get(cd_pessoaj=cd_pessoa_anunciante)
            
            marca_nome = material.ds_marca if material.ds_marca else 'Não informada'
            tipo_nome = material.ds_tipo if material.ds_tipo else 'Não informada'
            unidade = material.unidade_med if material.unidade_med else 'unidade(s)'
            
        except (MatMed.DoesNotExist, PessoaJuridica.DoesNotExist) as e:
            return Response(
                {"erro": f"Registro não encontrado no banco de dados: {str(e)}"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Prompt 
        prompt = f"""
        Atue como um assistente de logística hospitalar para uma plataforma B2B de combate ao desperdício.
        Gere uma descrição profissional, clara e técnica para um anúncio de repasse/venda do seguinte item:

        Dados Técnicos:
        - Categoria: {tipo_nome}
        - Nome do Item: {material.ds_mat if material.ds_mat else material.cd_tuss}
        - Marca: {marca_nome}
        - Número do Lote: {ds_lote}
        - Data de Validade: {dt_validade}
        
        Logística:
        - Quantidade Disponível: {qtd_solicitada} {unidade}
        - Hospital Ofertante: {hospital_anunciante.nm_pessoaj}

        Diretrizes da resposta:
        - Tom estritamente formal e profissional (adequado para o setor da saúde).
        - Enfatize que o item está disponível e em perfeitas condições para repasse, com o objetivo de otimizar o estoque e evitar o desperdício hospitalar generalizado.
        - Não restrinja o motivo apenas a "sobra de procedimento". Deixe o texto aberto para qualquer motivo de redistribuição de estoque.
        - Retorne APENAS o texto corrido do anúncio, sem saudações ou comentários.
        """

        try:
            with transaction.atomic():
                # 1. Tenta consumir créditos antes de bater na IA
                consumir_funcionalidade(
                    pessoa_juridica=request.user,
                    funcionalidade='IA_DESCRICAO',
                    descricao=f'Geração de descrição com IA para {material.ds_mat if material.ds_mat else material.cd_tuss}',
                    referencia=f'MAT-{material.cd_mat}'
                )

                api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
                client = genai.Client(api_key=api_key) 
                interaction = client.interactions.create(
                    model='gemini-3.8-flash',
                    input=prompt,
                )
                
                return Response({"texto_sugerido": interaction.output_text}, status=status.HTTP_200_OK)

        except SaldoInsuficienteError as e:
            return Response(
                {"erro": str(e), "saldo_insuficiente": True},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        except Exception as e:
            error_str = str(e).lower()
            if "503" in error_str or "unavailable" in error_str or "high demand" in error_str:
                msg = "O serviço de inteligência artificial está com alta demanda no momento. Por favor, tente novamente em alguns instantes."
            else:
                msg = "Ocorreu um erro interno ao se comunicar com a inteligência artificial. Tente novamente mais tarde."
            
            # Aqui, idealmente, você logaria o erro real (e) no Sentry ou logger
            return Response(
                {"erro": msg}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BuscaSemanticaView(APIView):
    """
    Busca semântica no catálogo de anúncios usando o Gemini.
    Recebe um termo de busca em linguagem natural e retorna os anúncios
    mais relevantes, ranqueados por relevância semântica.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        termo = request.data.get('termo', '').strip()

        if not termo:
            return Response(
                {"erro": "O campo 'termo' é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        hoje = timezone.now().date()
        
        # RN02: Lazy cron job para inativar anúncios expirados
        Anuncio.objects.filter(ie_status='A', dt_validade__lt=hoje).update(ie_status='I')

        # Carrega anúncios ativos, excluindo os do próprio usuário
        anuncios = Anuncio.objects.filter(
            ie_status='A'
        ).exclude(
            cd_pessoa_anunciante=request.user
        ).select_related('cd_mat', 'cd_pessoa_anunciante')

        if not anuncios.exists():
            return Response([], status=status.HTTP_200_OK)

        # Monta catálogo resumido para o prompt (sem imagens para economizar tokens)
        catalogo = []
        for a in anuncios:
            catalogo.append({
                "id": a.nr_anuncio,
                "nome": a.cd_mat.ds_mat or a.cd_mat.cd_tuss,
                "marca": a.cd_mat.ds_marca or "N/A",
                "categoria": a.cd_mat.ds_tipo or "N/A",
                "unidade": a.cd_mat.unidade_med or "unidade",
                "quantidade": a.qtd_mat,
                "valor": str(a.val_base),
                "lote": a.ds_lote or "",
                "validade": str(a.dt_validade) if a.dt_validade else "",
                "descricao": (a.ds_obs[:200] if a.ds_obs else ""),
                "anunciante": a.cd_pessoa_anunciante.razao_social or a.cd_pessoa_anunciante.nm_pessoaj,
            })

        catalogo_json = json.dumps(catalogo, ensure_ascii=False)

        prompt = f"""Você é o motor de busca inteligente do MedConnect, uma plataforma B2B de materiais e medicamentos hospitalares.

O usuário está buscando: "{termo}"

Catálogo de anúncios ativos:
{catalogo_json}

Sua tarefa:
1. Analise a intenção de busca do usuário
2. Considere sinônimos médicos e hospitalares (ex: "soro" = "solução fisiológica", "EPI" = "luva, máscara, avental")
3. Interprete linguagem natural e coloquial
4. Considere nomes comerciais e genéricos de medicamentos
5. Retorne os IDs dos anúncios mais relevantes, ordenados do mais ao menos relevante

Retorne APENAS um JSON válido no formato:
{{"resultados": [id1, id2, id3, ...]}}

Regras:
- Retorne no máximo 20 resultados
- Se nenhum anúncio for relevante, retorne {{"resultados": []}}
- NÃO inclua explicações, apenas o JSON"""

        try:
            api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
            client = genai.Client(api_key=api_key)
            interaction = client.interactions.create(
                model='gemini-3.8-flash',
                input=prompt,
                response_format={"type": "json"}
            )

            resultado = json.loads(interaction.output_text)
            ids_ordenados = resultado.get('resultados', [])

            if not ids_ordenados:
                return Response([], status=status.HTTP_200_OK)

            # Mapeia os anúncios e mantém a ordem de relevância do Gemini
            anuncios_map = {a.nr_anuncio: a for a in anuncios}
            anuncios_ordenados = [
                anuncios_map[aid] for aid in ids_ordenados if aid in anuncios_map
            ]

            serializer = AnuncioSerializer(anuncios_ordenados, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except json.JSONDecodeError:
            return Response(
                {"erro": "A IA retornou uma resposta inválida. Tente novamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            error_str = str(e).lower()
            if "503" in error_str or "unavailable" in error_str:
                msg = "A busca inteligente está temporariamente indisponível devido à alta demanda."
            else:
                msg = "Ocorreu um erro ao realizar a busca semântica."
                
            return Response(
                {"erro": msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AtualizarInteressesView(APIView):
    """
    Atualiza as tags de interesse do usuário no background, com base no
    histórico anterior e no novo termo pesquisado.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        termo = request.data.get('termo', '').strip()
        if not termo:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        usuario = request.user
        interesses_atuais = usuario.interesses_ia or ""

        prompt = f"""
        Você é um assistente de IA que extrai interesses de busca.
        O usuário (hospital/empresa) está navegando em uma plataforma B2B de saúde.
        
        Tags de interesse atuais: "{interesses_atuais}"
        Nova pesquisa do usuário: "{termo}"
        
        Baseado nisso, atualize as tags de interesse do usuário dando prioridade aos itens mais recentes pesquisados.
        Retorne APENAS uma lista de até 6 palavras-chave simples, separadas por vírgula.
        Não inclua aspas, parênteses, explicações ou texto extra.
        Exemplo de resposta: luva, seringa, anestésico, cateter, gaze, bisturi
        """

        try:
            api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
            client = genai.Client(api_key=api_key)
            interaction = client.interactions.create(
                model='gemini-3.8-flash',
                input=prompt,
            )

            novas_tags = interaction.output_text.strip().replace('"', '').replace('\n', '')
            
            # Limita tamanho para segurança
            if len(novas_tags) > 200:
                novas_tags = novas_tags[:200]
                
            usuario.interesses_ia = novas_tags
            usuario.save(update_fields=['interesses_ia'])

            return Response({"sucesso": True, "novos_interesses": novas_tags}, status=status.HTTP_200_OK)

        except Exception as e:
            # Em caso de falha silenciosa no background, não afeta o usuário
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)