"""Regras do número de CNPJ (sem consulta externa)."""

PESOS_PRIMEIRO_DIGITO = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
PESOS_SEGUNDO_DIGITO = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


def limpar_cnpj(valor) -> str:
    """Remove a máscara do CNPJ (pontos, barra e hífen)."""
    return ''.join(ch for ch in str(valor or '') if ch not in './-').strip()


def _digito(numeros: list[int], pesos: tuple[int, ...]) -> int:
    resto = sum(n * p for n, p in zip(numeros, pesos)) % 11
    return 0 if resto < 2 else 11 - resto


def validar_cnpj(valor) -> bool:
    """
    Confere os dois dígitos verificadores. Diz se o número PODE existir
    (pega erros de digitação), não se a empresa existe na Receita.
    """
    texto = limpar_cnpj(valor)
    if len(texto) != 14 or not texto.isdigit() or len(set(texto)) == 1:
        return False
    numeros = [int(c) for c in texto]
    return (
        numeros[12] == _digito(numeros[:12], PESOS_PRIMEIRO_DIGITO)
        and numeros[13] == _digito(numeros[:13], PESOS_SEGUNDO_DIGITO)
    )


def formatar_cnpj(valor) -> str:
    """00.000.000/0000-00"""
    t = limpar_cnpj(valor)
    return f'{t[:2]}.{t[2:5]}.{t[5:8]}/{t[8:12]}-{t[12:]}' if len(t) == 14 else t
