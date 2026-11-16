/**
 * Explicações dos códigos de referência usados no cadastro de insumos,
 * exibidas no ícone informativo ao lado de cada campo.
 */
export type CodigoReferencia = "TUSS" | "TISS" | "SIMPRO" | "BRASINDICE" | "CATMAT"

export const CODIGOS_REFERENCIA: Record<CodigoReferencia, { titulo: string; oQueE: string; ondeEncontrar: string }> = {
  TUSS: {
    titulo: "Código TUSS",
    oQueE:
      "Terminologia Unificada da Saúde Suplementar: padrão da ANS que dá um código único a cada material, medicamento e procedimento usado na troca de informações entre hospitais e planos de saúde.",
    ondeEncontrar:
      "No sistema de faturamento ou de compras do hospital. A tabela completa é publicada pela ANS em gov.br/ans, em Padrão TISS > Terminologia Unificada.",
  },
  TISS: {
    titulo: "Tabela TISS",
    oQueE:
      "Indica de qual tabela da terminologia TUSS vem o código do insumo: 19 para materiais e OPME (órteses, próteses e materiais especiais) e 20 para medicamentos.",
    ondeEncontrar:
      "Fica junto do código TUSS no sistema de faturamento do hospital. Se não souber, deixe em branco: o campo é opcional.",
  },
  SIMPRO: {
    titulo: "Código SIMPRO",
    oQueE:
      "Código do item na tabela SIMPRO, uma publicação privada de preços de referência de materiais e medicamentos usada em contratos entre hospitais e planos de saúde.",
    ondeEncontrar:
      "Com o setor de compras ou faturamento do hospital, que costuma assinar a tabela. Opcional no MedConnect.",
  },
  BRASINDICE: {
    titulo: "Código Brasíndice",
    oQueE:
      "Código do item no Brasíndice, um guia privado de preços de referência de medicamentos e materiais usado no faturamento hospitalar.",
    ondeEncontrar:
      "Com o setor de compras ou faturamento do hospital, que costuma assinar o guia. Opcional no MedConnect.",
  },
  CATMAT: {
    titulo: "Código CATMAT",
    oQueE:
      "Código do item no Catálogo de Materiais do Governo Federal. Permite consultar quanto órgãos públicos pagaram pelo insumo no Compras.gov.br.",
    ondeEncontrar:
      "Digite o nome do insumo e escolha uma das sugestões, ou consulte o catálogo em catalogo.compras.gov.br. Opcional no MedConnect.",
  },
}
