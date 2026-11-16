"""
Dados fictícios para `python manage.py povoar_demo`.

- As instituições são inventadas (nome, CNPJ, e-mail e telefone).
- Os produtos usam marcas reais apenas no campo "marca", com nomes genéricos.
- Os códigos TUSS são ILUSTRATIVOS: não correspondem à tabela oficial da ANS.
- Nenhum medicamento sujeito a controle especial (Portaria SVS/MS nº 344/1998).
"""

DOMINIO_DEMO = "demo.medconnect.local"
SENHA_DEMO = "Demo@2026"

INSTITUICOES = [
    {
        "nome": "Hospital Demo Santa Clara", "razao": "Hospital Demo Santa Clara Ltda.",
        "resp": "Mariana Alves", "cidade": "Campinas", "uf": "SP", "cep": "13010-000",
        "bairro": "Centro", "logradouro": "Rua das Acácias", "numero": "120",
        "lat": -22.9056, "lng": -47.0608, "tel": "(19) 3000-0101",
    },
    {
        "nome": "Clínica Demo Vida Plena", "razao": "Clínica Demo Vida Plena S.A.",
        "resp": "Ricardo Nogueira", "cidade": "São Paulo", "uf": "SP", "cep": "01310-000",
        "bairro": "Bela Vista", "logradouro": "Rua dos Ipês", "numero": "845",
        "lat": -23.5614, "lng": -46.6559, "tel": "(11) 3000-0202",
    },
    {
        "nome": "Hospital Demo São Lucas", "razao": "Associação Hospitalar Demo São Lucas",
        "resp": "Fernanda Rocha", "cidade": "Ribeirão Preto", "uf": "SP", "cep": "14010-000",
        "bairro": "Centro", "logradouro": "Avenida das Palmeiras", "numero": "1500",
        "lat": -21.1775, "lng": -47.8103, "tel": "(16) 3000-0303",
    },
    {
        "nome": "Hospital Demo Bom Pastor", "razao": "Hospital Demo Bom Pastor Ltda.",
        "resp": "Paulo Henrique Lima", "cidade": "Sorocaba", "uf": "SP", "cep": "18035-000",
        "bairro": "Jardim Vergueiro", "logradouro": "Rua dos Jacarandás", "numero": "77",
        "lat": -23.5015, "lng": -47.4526, "tel": "(15) 3000-0404",
    },
    {
        "nome": "Clínica Demo Horizonte", "razao": "Clínica Demo Horizonte Ltda.",
        "resp": "Juliana Martins", "cidade": "Belo Horizonte", "uf": "MG", "cep": "30130-000",
        "bairro": "Funcionários", "logradouro": "Rua das Magnólias", "numero": "310",
        "lat": -19.9318, "lng": -43.9378, "tel": "(31) 3000-0505",
    },
    {
        "nome": "Hospital Demo Litoral", "razao": "Hospital Demo Litoral S.A.",
        "resp": "André Carvalho", "cidade": "Santos", "uf": "SP", "cep": "11010-000",
        "bairro": "Gonzaga", "logradouro": "Avenida dos Coqueiros", "numero": "2020",
        "lat": -23.9673, "lng": -46.3330, "tel": "(13) 3000-0606",
    },
]

MAT = "Material Hospitalar"
MED = "Medicamento"

# preco = faixa de valor por unidade de venda (R$); o anúncio grava o total do lote (preço × quantidade)
# validade = vida útil típica em meses
PRODUTOS = [
    # ── Descarpack ──────────────────────────────────────────────
    {"nome": "Seringa descartável 10 ml sem agulha, bico Luer slip", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 100", "img": "seringa-10ml", "preco": (38, 55), "validade": 60, "lote": "DSC"},
    {"nome": "Seringa descartável 3 ml com agulha 25x7", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 100", "img": "seringa-3ml-agulha", "preco": (42, 60), "validade": 60, "lote": "DSA"},
    {"nome": "Seringa de insulina 1 ml com agulha 13x4,5", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 100", "img": "seringa-insulina", "preco": (45, 68), "validade": 60, "lote": "DSI"},
    {"nome": "Agulha hipodérmica 25x7 (22G)", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 100", "img": "agulha-hipodermica", "preco": (14, 22), "validade": 60, "lote": "DAG"},
    {"nome": "Luva de procedimento nitrílica sem pó, tamanho M", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 100", "img": "luva-nitrilica", "preco": (28, 42), "validade": 36, "lote": "DLN"},
    {"nome": "Luva de procedimento látex com pó, tamanho M", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 100", "img": "luva-latex", "preco": (24, 36), "validade": 36, "lote": "DLL"},
    {"nome": "Máscara cirúrgica tripla com elástico", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 50", "img": "mascara-cirurgica", "preco": (9, 18), "validade": 36, "lote": "DMC"},
    {"nome": "Compressa de gaze 7,5x7,5 cm, 13 fios, não estéril", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Pacote c/ 500", "img": "compressa-gaze", "preco": (22, 34), "validade": 60, "lote": "DCG"},
    {"nome": "Equipo macrogotas com injetor lateral", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 25", "img": "equipo-macrogotas", "preco": (45, 70), "validade": 60, "lote": "DEQ"},
    {"nome": "Cateter intravenoso periférico 22G", "marca": "Descarpack", "tipo": MAT,
     "unidade": "Caixa c/ 50", "img": "cateter-intravenoso", "preco": (55, 85), "validade": 60, "lote": "DCV"},
    # ── 3M ──────────────────────────────────────────────────────
    {"nome": "Fita cirúrgica Micropore 12,5 mm x 10 m", "marca": "3M", "tipo": MAT,
     "unidade": "Caixa c/ 24 rolos", "img": "fita-micropore", "preco": (48, 72), "validade": 60, "lote": "3MP"},
    {"nome": "Curativo transparente Tegaderm I.V. 7 x 8,5 cm", "marca": "3M", "tipo": MAT,
     "unidade": "Caixa c/ 50", "img": "curativo-transparente", "preco": (160, 240), "validade": 36, "lote": "3MT"},
    # ── Eurofarma ───────────────────────────────────────────────
    {"nome": "Dipirona sódica 500 mg/ml solução injetável, ampola 2 ml", "marca": "Eurofarma", "tipo": MED,
     "unidade": "Caixa c/ 50 ampolas", "img": "ampola-injetavel", "preco": (55, 85), "validade": 24, "lote": "EDI"},
    {"nome": "Ceftriaxona 1 g pó para solução injetável", "marca": "Eurofarma", "tipo": MED,
     "unidade": "Caixa c/ 10 frascos-ampola", "img": "frasco-ampola-po", "preco": (75, 120), "validade": 24, "lote": "ECF"},
    {"nome": "Amoxicilina 500 mg cápsulas", "marca": "Eurofarma", "tipo": MED,
     "unidade": "Caixa c/ 21 cápsulas", "img": "capsulas-blister-verde", "preco": (9, 16), "validade": 24, "lote": "EAM"},
    {"nome": "Omeprazol 20 mg cápsulas", "marca": "Eurofarma", "tipo": MED,
     "unidade": "Caixa c/ 28 cápsulas", "img": "capsulas-blister-azul", "preco": (8, 14), "validade": 24, "lote": "EOM"},
    {"nome": "Losartana potássica 50 mg comprimidos revestidos", "marca": "Eurofarma", "tipo": MED,
     "unidade": "Caixa c/ 30 comprimidos", "img": "comprimidos-blister-rosa", "preco": (7, 13), "validade": 24, "lote": "ELO"},
    # ── Cimed ───────────────────────────────────────────────────
    {"nome": "Paracetamol 750 mg comprimidos", "marca": "Cimed", "tipo": MED,
     "unidade": "Caixa c/ 20 comprimidos", "img": "comprimidos-blister-branco", "preco": (4, 8), "validade": 24, "lote": "CPA"},
    {"nome": "Ibuprofeno 600 mg comprimidos revestidos", "marca": "Cimed", "tipo": MED,
     "unidade": "Caixa c/ 20 comprimidos", "img": "comprimidos-brancos", "preco": (7, 12), "validade": 24, "lote": "CIB"},
    {"nome": "Loratadina 10 mg comprimidos", "marca": "Cimed", "tipo": MED,
     "unidade": "Caixa c/ 12 comprimidos", "img": "comprimidos-blister-amarelo", "preco": (5, 9), "validade": 24, "lote": "CLO"},
]

OBSERVACOES = [
    "Excedente de compra programada. Embalagens lacradas, armazenadas conforme orientação do fabricante.",
    "Sobra de estoque após troca de padronização. Caixas fechadas, sem avarias.",
    "Lote recebido em quantidade acima da demanda do setor. Disponível para retirada.",
    "Produto armazenado em almoxarifado climatizado. Nota fiscal de origem disponível ao comprador.",
    "Caixas íntegras, transportadas apenas entre almoxarifado e farmácia central.",
    "Validade próxima ao limite de uso interno; preço reduzido para giro rápido.",
]
