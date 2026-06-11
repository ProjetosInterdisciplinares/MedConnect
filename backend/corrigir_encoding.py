from pathlib import Path

data = Path("dados_utf8.json").read_text(encoding="utf-8-sig")
Path("dados_corrigido.json").write_text(data, encoding="utf-8")