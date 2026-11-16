class PlanilhaInvalidaError(Exception):
    """O arquivo enviado não pôde ser lido como planilha."""


class EntradaVaziaError(Exception):
    """Não há nenhum anúncio para processar."""


class AnuncioInvalidoError(Exception):
    """O builder não conseguiu montar o anúncio."""

    def __init__(self, erros: list[str]):
        self.erros = erros
        super().__init__('; '.join(erros))


class PublicacaoInvalidaError(Exception):
    """Um ou mais anúncios do envio são inválidos; nada foi publicado."""

    def __init__(self, itens_invalidos):
        self.itens_invalidos = itens_invalidos
        primeiro = itens_invalidos[0]
        super().__init__(f'Erro ao publicar anúncio {primeiro.indice + 1}: {"; ".join(primeiro.erros)}')
