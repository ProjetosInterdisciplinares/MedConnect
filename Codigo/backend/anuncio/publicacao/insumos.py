from mat_med.models import MatMed


class CatalogoInsumos:
    """
    Insumos da empresa indexados pelo código TUSS, durante uma publicação.
    Guarda também os insumos novos do mesmo envio, para que linhas
    repetidas reaproveitem o mesmo insumo em vez de duplicá-lo.
    """

    def __init__(self, empresa):
        self._cadastrados = {
            m.cd_tuss.strip(): m for m in MatMed.objects.filter(ds_pessoaj=empresa) if m.cd_tuss
        }
        self._novos: dict[str, MatMed] = {}

    def cadastrado(self, cd_tuss: str) -> MatMed | None:
        """Insumo que já existe no banco."""
        return self._cadastrados.get(cd_tuss)

    def buscar(self, cd_tuss: str) -> MatMed | None:
        """Insumo do banco ou criado antes neste mesmo envio."""
        return self._cadastrados.get(cd_tuss) or self._novos.get(cd_tuss)

    def registrar_novo(self, insumo: MatMed) -> None:
        if insumo.cd_tuss:
            self._novos[insumo.cd_tuss] = insumo
