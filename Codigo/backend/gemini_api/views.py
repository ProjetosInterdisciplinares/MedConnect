import os
from dotenv import load_dotenv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from google import genai

from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica   

load_dotenv()

class GerarDescricaoAnuncioView(APIView):
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
            client = genai.Client() 
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            
            return Response({"texto_sugerido": response.text}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"erro": f"Erro na API do Gemini: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )