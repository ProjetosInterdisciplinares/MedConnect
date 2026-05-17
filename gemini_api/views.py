import os
from dotenv import load_dotenv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from google import genai

from lote.models import Lote
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica   

load_dotenv()

class GerarDescricaoNegociacaoView(APIView):
    def post(self, request):
        dados = request.data
        
        nr_lote_id = dados.get('nr_lote')
        cd_mat_id = dados.get('cd_mat')
        cd_negociante_id = dados.get('cd_negociante')
        qtd_solicitada = dados.get('qtd_matmed') 

        if not all([nr_lote_id, cd_mat_id, cd_negociante_id, qtd_solicitada]):
            return Response(
                {"erro": "Faltam parâmetros obrigatórios (nr_lote, cd_mat, cd_negociante, qtd_matmed)."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lote = Lote.objects.get(nr_lote=nr_lote_id)
            material = MatMed.objects.get(cd_mat=cd_mat_id)
            hospital_vendedor = PessoaJuridica.objects.get(cd_pessoaj=cd_negociante_id)
            
            marca_nome = material.ds_marca.ds_marca  
            tipo_nome = material.ds_tipo.ds_tipo    
            fabricante_nome = lote.fabricante.ds_fabricante 
            
        except (Lote.DoesNotExist, MatMed.DoesNotExist, PessoaJuridica.DoesNotExist) as e:
            return Response(
                {"erro": f"Registro não encontrado no banco de dados: {str(e)}"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Formatar a data de validade 
        validade_formatada = lote.dt_validade.strftime('%d/%m/%Y') if hasattr(lote.dt_validade, 'strftime') else lote.dt_validade

        # Prompt 
        prompt = f"""
        Atue como um assistente de logística hospitalar para uma plataforma B2B de combate ao desperdício.
        Gere uma descrição profissional, clara e técnica para um anúncio de repasse/venda do seguinte item:

        Dados Técnicos:
        - Categoria: {tipo_nome}
        - Nome do Item: {material.ds_mat}
        - Marca: {marca_nome}
        - Fabricante: {fabricante_nome}
        - Número do Lote: {lote.nr_lote}
        - Data de Validade: {validade_formatada}
        
        Logística:
        - Quantidade Disponível: {qtd_solicitada} {lote.unidade_med}
        - Hospital Ofertante: {hospital_vendedor.nm_pessoaj}

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