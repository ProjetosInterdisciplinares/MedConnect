"""
Bulk upload views for creating multiple ads at once via Excel import.
"""
import io
import json
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from anuncio.models import Anuncio
from mat_med.models import MatMed


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_template(request):
    """
    Returns an Excel (.xlsx) template file for bulk ad upload.
    The template contains:
    - 'Anúncios' sheet with column headers and data validation instructions
    - 'Tutorial' sheet explaining each field
    """
    wb = Workbook()

    # ── Tutorial Sheet ──────────────────────────────────────────────────
    ws_tutorial = wb.active
    ws_tutorial.title = "Tutorial"

    header_font = Font(name="Calibri", bold=True, size=14, color="FFFFFF")
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    section_font = Font(name="Calibri", bold=True, size=12, color="1E3A5F")
    body_font = Font(name="Calibri", size=11)
    required_font = Font(name="Calibri", size=11, color="CC0000", bold=True)

    ws_tutorial.column_dimensions["A"].width = 30
    ws_tutorial.column_dimensions["B"].width = 80

    # Title
    ws_tutorial.merge_cells("A1:B1")
    cell = ws_tutorial["A1"]
    cell.value = "📋 Tutorial de Importação em Massa - MedConnect"
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center")
    ws_tutorial.row_dimensions[1].height = 40

    # Instructions
    tutorial_rows = [
        ("", ""),
        ("🔹 COMO USAR", ""),
        ("Passo 1", "Vá para a aba 'Anúncios' e preencha os dados de cada anúncio em uma linha."),
        ("Passo 2", "Campos marcados com (*) são OBRIGATÓRIOS. Os demais são opcionais."),
        ("Passo 3", "Salve o arquivo e faça upload na plataforma."),
        ("Passo 4", "O sistema irá validar os dados e mostrar uma prévia antes de publicar."),
        ("", ""),
        ("🔹 CAMPOS DO ANÚNCIO", ""),
        ("Nome do Insumo (*)", "Nome do material/medicamento. Se já existir um insumo cadastrado com mesmo nome, ele será vinculado automaticamente."),
        ("Categoria do Insumo (*)", "Tipo do insumo. Valores aceitos: 'Material Hospitalar' ou 'Medicamento'."),
        ("Marca do Insumo (*)", "Marca/fabricante do insumo."),
        ("Unidade de Medida (*)", "Ex: Caixa, Unidade, Frasco, Ampola, Comprimido."),
        ("Código TUSS (*)", "Código TUSS do insumo (até 8 dígitos). Obrigatório para identificação."),
        ("Tabela TISS", "Opcional. Valores aceitos: '19' (Brasíndice) ou '20' (TUSS)."),
        ("Código SIMPRO", "Opcional. Código SIMPRO do insumo."),
        ("Código Brasíndice", "Opcional. Código Brasíndice do insumo."),
        ("Lote (*)", "Identificação do lote do produto. Ex: L123456."),
        ("Data de Fabricação (*)", "Formato: DD/MM/AAAA. Ex: 01/06/2025."),
        ("Data de Validade (*)", "Formato: DD/MM/AAAA. Ex: 01/06/2026."),
        ("Quantidade (*)", "Quantidade disponível do insumo (número inteiro positivo)."),
        ("Valor Base R$ (*)", "Valor unitário de venda. Use vírgula para decimais. Ex: 15,90."),
        ("Observações (*)", "Descrição ou observações sobre o anúncio. Ex: 'Produto lacrado, em perfeito estado'."),
        ("", ""),
        ("🔹 REGRAS IMPORTANTES", ""),
        ("Insumos", "Se o nome + código TUSS do insumo já existir no seu cadastro, o sistema reutiliza. Caso contrário, cria automaticamente."),
        ("Datas", "Use o formato DD/MM/AAAA ou deixe o Excel reconhecer como data."),
        ("Valores", "Use vírgula ou ponto para separar decimais. Ex: 15,90 ou 15.90."),
        ("Linhas em branco", "Linhas completamente vazias serão ignoradas."),
    ]

    for i, (col_a, col_b) in enumerate(tutorial_rows, start=2):
        cell_a = ws_tutorial.cell(row=i, column=1, value=col_a)
        cell_b = ws_tutorial.cell(row=i, column=2, value=col_b)
        cell_b.font = body_font
        cell_b.alignment = Alignment(wrap_text=True)

        if col_a.startswith("🔹"):
            cell_a.font = section_font
            cell_b.font = section_font
        elif "(*)" in col_a:
            cell_a.font = required_font
        else:
            cell_a.font = Font(name="Calibri", size=11, bold=True)

    # ── Anúncios Sheet ──────────────────────────────────────────────────
    ws_data = wb.create_sheet("Anúncios")

    columns = [
        ("Nome do Insumo (*)", 30),
        ("Categoria do Insumo (*)", 25),
        ("Marca do Insumo (*)", 20),
        ("Unidade de Medida (*)", 20),
        ("Código TUSS (*)", 18),
        ("Tabela TISS", 15),
        ("Código SIMPRO", 18),
        ("Código Brasíndice", 18),
        ("Lote (*)", 15),
        ("Data de Fabricação (*)", 22),
        ("Data de Validade (*)", 22),
        ("Quantidade (*)", 15),
        ("Valor Base R$ (*)", 18),
        ("Observações (*)", 50),
    ]

    col_header_font = Font(name="Calibri", bold=True, size=11, color="FFFFFF")
    col_header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    required_fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")
    optional_fill = PatternFill(start_color="F0F4F8", end_color="F0F4F8", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin", color="CCCCCC"),
        right=Side(style="thin", color="CCCCCC"),
        top=Side(style="thin", color="CCCCCC"),
        bottom=Side(style="thin", color="CCCCCC"),
    )

    for col_idx, (header, width) in enumerate(columns, start=1):
        cell = ws_data.cell(row=1, column=col_idx, value=header)
        cell.font = col_header_font
        cell.fill = col_header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
        ws_data.column_dimensions[get_column_letter(col_idx)].width = width

    ws_data.row_dimensions[1].height = 35

    # Add example row
    example = [
        "Seringa Descartável 5ml",
        "Material Hospitalar",
        "BD",
        "Caixa",
        "70908788",
        "20",
        "",
        "",
        "L2025001",
        "01/01/2025",
        "01/01/2027",
        100,
        "12,50",
        "Produto lacrado, caixas em perfeito estado.",
    ]

    example_font = Font(name="Calibri", size=11, italic=True, color="888888")
    for col_idx, val in enumerate(example, start=1):
        cell = ws_data.cell(row=2, column=col_idx, value=val)
        cell.font = example_font
        cell.alignment = Alignment(vertical="center")
        cell.border = thin_border
        
        if col_idx not in (10, 11):
            cell.number_format = '@'

    # Pre-format empty rows with fill to show required vs optional
    for row_idx in range(3, 103):  # Pre-format 100 rows
        for col_idx in range(1, len(columns) + 1):
            cell = ws_data.cell(row=row_idx, column=col_idx)
            cell.border = thin_border
            header_text = columns[col_idx - 1][0]
            if "(*)" in header_text:
                cell.fill = required_fill
            else:
                cell.fill = optional_fill
                
            # Set number format to Text (@) for all columns except dates
            # Dates are col_idx 10 and 11
            if col_idx not in (10, 11):
                cell.number_format = '@'

    # Freeze header row
    ws_data.freeze_panes = "A2"

    # Write to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="template_anuncios_massa.xlsx"'
    return response


def _parse_date(value):
    """Parse a date from various formats."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    value = str(value).strip()
    if not value:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _parse_decimal(value):
    """Parse a decimal value from string, handling commas."""
    if value is None:
        return None
    value = str(value).strip().replace(",", ".")
    if not value:
        return None
    try:
        d = Decimal(value)
        if d <= 0:
            return None
        return str(d)
    except (InvalidOperation, ValueError):
        return None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def validate_bulk_upload(request):
    """
    Receives an Excel file, parses it, validates each row, and returns
    a JSON preview of all ads that would be created.
    Does NOT persist anything — just returns a preview + error list.
    """
    file = request.FILES.get("file")
    if not file:
        return Response(
            {"erro": "Nenhum arquivo enviado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from openpyxl import load_workbook
        wb = load_workbook(file, data_only=True)
    except Exception:
        return Response(
            {"erro": "Arquivo inválido. Envie um arquivo .xlsx válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Try to find the data sheet
    if "Anúncios" in wb.sheetnames:
        ws = wb["Anúncios"]
    elif len(wb.sheetnames) > 1:
        ws = wb.worksheets[1]
    else:
        ws = wb.active

    user_id = request.user.pk

    # Fetch existing insumos for this user, keyed by TUSS code
    existing_insumos = {
        m.cd_tuss.strip(): m
        for m in MatMed.objects.filter(ds_pessoaj=user_id)
        if m.cd_tuss
    }

    results = []
    errors_list = []
    row_index = 0

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        # Skip completely empty rows
        if all(cell is None or str(cell).strip() == "" for cell in row):
            continue

        # Pad row to have at least 14 columns
        row = list(row) + [None] * max(0, 14 - len(row))

        row_index += 1
        row_errors = []

        # Parse fields
        ds_mat = str(row[0]).strip() if row[0] else ""
        ds_tipo = str(row[1]).strip() if row[1] else ""
        ds_marca = str(row[2]).strip() if row[2] else ""
        unidade_med = str(row[3]).strip() if row[3] else ""
        cd_tuss = str(row[4]).strip() if row[4] is not None else ""
        if cd_tuss.endswith(".0"): cd_tuss = cd_tuss[:-2]
        cd_tiss = str(row[5]).strip() if row[5] is not None else ""
        if cd_tiss.endswith(".0"): cd_tiss = cd_tiss[:-2]
        cd_simpro = str(row[6]).strip() if row[6] is not None else ""
        if cd_simpro.endswith(".0"): cd_simpro = cd_simpro[:-2]
        cd_brasindice = str(row[7]).strip() if row[7] is not None else ""
        if cd_brasindice.endswith(".0"): cd_brasindice = cd_brasindice[:-2]
        ds_lote = str(row[8]).strip() if row[8] else ""
        dt_fabricacao_raw = row[9]
        dt_validade_raw = row[10]
        qtd_mat_raw = row[11]
        val_base_raw = row[12]
        ds_obs = str(row[13]).strip() if row[13] else ""

        # Validate required fields
        if not ds_mat:
            row_errors.append("Nome do Insumo é obrigatório")
        if not ds_tipo:
            row_errors.append("Categoria do Insumo é obrigatória")
        elif ds_tipo not in ("Material Hospitalar", "Medicamento"):
            row_errors.append(f"Categoria '{ds_tipo}' inválida. Use 'Material Hospitalar' ou 'Medicamento'")
        if not ds_marca:
            row_errors.append("Marca do Insumo é obrigatória")
        if not unidade_med:
            row_errors.append("Unidade de Medida é obrigatória")
        
        if not cd_tuss:
            row_errors.append("Código TUSS é obrigatório")
        elif len(cd_tuss) > 8:
            row_errors.append(f"Código TUSS '{cd_tuss}' excede 8 caracteres")
            
        if cd_simpro and len(cd_simpro) > 10:
            row_errors.append(f"Código SIMPRO '{cd_simpro}' excede 10 caracteres")
            
        if cd_brasindice and len(cd_brasindice) > 15:
            row_errors.append(f"Código Brasíndice '{cd_brasindice}' excede 15 caracteres")
            
        if not ds_lote:
            row_errors.append("Lote é obrigatório")
        if not ds_obs:
            row_errors.append("Observações são obrigatórias")

        # Validate TISS
        if cd_tiss and cd_tiss not in ("19", "20"):
            row_errors.append(f"Tabela TISS '{cd_tiss}' inválida. Use '19' ou '20'")

        # Parse dates
        dt_fabricacao = _parse_date(dt_fabricacao_raw)
        dt_validade = _parse_date(dt_validade_raw)
        if not dt_fabricacao:
            row_errors.append("Data de Fabricação é obrigatória (formato DD/MM/AAAA)")
        if not dt_validade:
            row_errors.append("Data de Validade é obrigatória (formato DD/MM/AAAA)")

        # Parse quantity
        qtd_mat = None
        if qtd_mat_raw is not None:
            try:
                qtd_mat = int(float(str(qtd_mat_raw)))
                if qtd_mat <= 0:
                    row_errors.append("Quantidade deve ser um número positivo")
                    qtd_mat = None
            except (ValueError, TypeError):
                row_errors.append("Quantidade inválida")
        else:
            row_errors.append("Quantidade é obrigatória")

        # Parse value
        val_base = _parse_decimal(val_base_raw)
        if not val_base:
            row_errors.append("Valor Base é obrigatório e deve ser um número positivo")

        # Check if insumo already exists
        insumo_key = cd_tuss
        insumo_existente = existing_insumos.get(insumo_key)

        result_row = {
            "linha": row_num,
            "index": row_index - 1,
            "publicar": len(row_errors) == 0,
            "valido": len(row_errors) == 0,
            "erros": row_errors,
            "insumo_existente": insumo_existente is not None,
            "insumo_cd_mat": insumo_existente.cd_mat if insumo_existente else None,
            "insumo": {
                "ds_mat": ds_mat,
                "ds_tipo": ds_tipo,
                "ds_marca": ds_marca,
                "unidade_med": unidade_med,
                "cd_tuss": cd_tuss,
                "cd_tiss": cd_tiss or None,
                "cd_simpro": cd_simpro or None,
                "cd_brasindice": cd_brasindice or None,
            },
            "anuncio": {
                "ds_lote": ds_lote,
                "dt_fabricacao": dt_fabricacao,
                "dt_validade": dt_validade,
                "qtd_mat": qtd_mat,
                "val_base": val_base,
                "ds_obs": ds_obs,
            },
        }

        results.append(result_row)

    if not results:
        return Response(
            {"erro": "Nenhuma linha de dados encontrada na planilha. Preencha os dados na aba 'Anúncios'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    total_valid = sum(1 for r in results if r["valido"])
    total_invalid = sum(1 for r in results if not r["valido"])
    total_new_insumos = sum(1 for r in results if not r["insumo_existente"] and r["valido"])

    return Response({
        "total": len(results),
        "total_validos": total_valid,
        "total_invalidos": total_invalid,
        "total_novos_insumos": total_new_insumos,
        "anuncios": results,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def publish_bulk_ads(request):
    """
    Receives the validated list of ads to actually create.
    Each ad entry includes insumo data and ad data.
    Creates insumos if needed, then creates all ads in a single transaction.
    """
    try:
        ads_data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response(
            {"erro": "Dados inválidos."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(ads_data, list) or len(ads_data) == 0:
        return Response(
            {"erro": "Nenhum anúncio para publicar."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_id = request.user.pk
    created_ads = []
    errors = []

    # Fetch existing insumos for this user, keyed by TUSS code
    existing_insumos = {
        m.cd_tuss.strip(): m
        for m in MatMed.objects.filter(ds_pessoaj=user_id)
        if m.cd_tuss
    }

    try:
        with transaction.atomic():
            for idx, item in enumerate(ads_data):
                try:
                    insumo_data = item.get("insumo", {})
                    anuncio_data = item.get("anuncio", {})

                    # Check if insumo already exists or needs to be created
                    ds_mat = (insumo_data.get("ds_mat") or "").strip()
                    cd_tuss = (insumo_data.get("cd_tuss") or "").strip()
                    insumo_key = cd_tuss

                    if insumo_key in existing_insumos:
                        mat_med = existing_insumos[insumo_key]
                    else:
                        # Create new insumo
                        mat_med = MatMed.objects.create(
                            ds_mat=ds_mat,
                            ds_tipo=insumo_data.get("ds_tipo"),
                            ds_marca=insumo_data.get("ds_marca"),
                            unidade_med=insumo_data.get("unidade_med"),
                            cd_tuss=cd_tuss,
                            cd_tiss=insumo_data.get("cd_tiss"),
                            cd_simpro=insumo_data.get("cd_simpro"),
                            cd_brasindice=insumo_data.get("cd_brasindice"),
                            ds_pessoaj_id=user_id,
                        )
                        # Add to cache so duplicate rows in same batch reuse it
                        existing_insumos[insumo_key] = mat_med

                    # Create ad
                    anuncio = Anuncio.objects.create(
                        cd_mat=mat_med,
                        ds_lote=anuncio_data.get("ds_lote"),
                        dt_fabricacao=anuncio_data.get("dt_fabricacao"),
                        dt_validade=anuncio_data.get("dt_validade"),
                        qtd_mat=anuncio_data.get("qtd_mat"),
                        val_base=anuncio_data.get("val_base"),
                        ds_obs=anuncio_data.get("ds_obs", ""),
                        imagem_anuncio=anuncio_data.get("imagem_anuncio"),
                        cd_pessoa_anunciante_id=user_id,
                        ie_status="A",
                    )

                    created_ads.append({
                        "nr_anuncio": anuncio.nr_anuncio,
                        "ds_mat": ds_mat,
                        "ds_lote": anuncio.ds_lote,
                        "qtd_mat": anuncio.qtd_mat,
                        "val_base": str(anuncio.val_base),
                    })

                except Exception as e:
                    errors.append({
                        "index": idx,
                        "erro": str(e),
                    })
                    raise  # Rollback the entire transaction

    except Exception:
        if errors:
            return Response(
                {
                    "erro": f"Erro ao publicar anúncio {errors[0]['index'] + 1}: {errors[0]['erro']}",
                    "detalhes": errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"erro": "Erro interno ao processar os anúncios."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({
        "mensagem": f"{len(created_ads)} anúncio(s) publicado(s) com sucesso!",
        "total_criados": len(created_ads),
        "anuncios": created_ads,
    }, status=status.HTTP_201_CREATED)
