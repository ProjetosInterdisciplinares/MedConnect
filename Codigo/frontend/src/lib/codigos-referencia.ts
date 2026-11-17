/**
 * Explicações dos códigos de referência usados no cadastro de insumos,
 * exibidas no ícone informativo ao lado de cada campo.
 */
export type CodigoReferencia = "TUSS" | "SIMPRO" | "BRASINDICE" | "CATMAT"

export const CODIGOS_REFERENCIA: Record<CodigoReferencia, { titulo: string; oQueE: string; ondeEncontrar: string }> = {
  TUSS: {
    titulo: "Código TUSS",
    oQueE:
      "Terminologia Unificada da Saúde Suplementar: padrão da ANS que dá um código único a cada material, medicamento e procedimento usado na troca de informações entre hospitais e planos de saúde.",
    ondeEncontrar:
      "No sistema de faturamento ou de compras do hospital. A tabela completa é publicada pela ANS em gov.br/ans, em Padrão TISS > Terminologia Unificada.",
  },
  SIMPRO: {
    titulo: "Código SIMPRO",
    oQueE:
      "Código de precificação do material na tabela SIMPRO, a referência de preços de materiais hospitalares usada em contratos entre hospitais e planos de saúde.",
    ondeEncontrar:
      "Com o setor de compras ou faturamento do hospital, que costuma assinar a tabela. Opcional no MedConnect.",
  },
  BRASINDICE: {
    titulo: "Código Brasíndice",
    oQueE:
      "Código de precificação do medicamento no Brasíndice, o guia de preços de referência de medicamentos usado no faturamento hospitalar.",
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
