import type { Metadata } from "next"
import Link from "next/link"
import LegalPage, { SecaoLegal } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Termos de Uso | MedConnect",
}

const SECOES: SecaoLegal[] = [
  {
    id: "objeto",
    titulo: "O que é o MedConnect",
    conteudo: (
      <>
        <p>
          O MedConnect é uma plataforma B2B que conecta instituições de saúde para anunciar e negociar
          materiais hospitalares e medicamentos, com o objetivo de reduzir o desperdício de insumos parados
          em estoque, por vencimento próximo ou excesso de lote.
        </p>
        <p>
          O MedConnect <strong>não é parte das negociações</strong>: não compra, não vende, não armazena e
          não transporta produtos, e não intermedia o pagamento entre as instituições. Preço, pagamento,
          retirada ou entrega são acordados diretamente entre comprador e vendedor.
        </p>
      </>
    ),
  },
  {
    id: "cadastro",
    titulo: "Cadastro e credenciamento",
    conteudo: (
      <ul>
        <li>O cadastro é exclusivo para pessoas jurídicas, com CNPJ válido, e exige a indicação de um
          responsável técnico.</li>
        <li>Toda solicitação passa por análise da equipe do MedConnect. O acesso só é liberado após a
          aprovação, que pode ser negada ou revogada se os dados forem inconsistentes.</li>
        <li>A instituição é responsável pela veracidade dos dados informados, por mantê-los atualizados e
          pelo sigilo da senha de acesso.</li>
      </ul>
    ),
  },
  {
    id: "regulatorio",
    titulo: "Responsabilidade sanitária e regulatória",
    conteudo: (
      <>
        <p>
          Cada instituição responde integralmente pelo cumprimento das normas sanitárias aplicáveis aos
          produtos que anuncia, compra, armazena e transporta, incluindo as regras da Agência Nacional de
          Vigilância Sanitária (ANVISA) e da vigilância sanitária local, bem como as licenças e autorizações
          de funcionamento exigidas para a sua atividade.
        </p>
        <p>Não é permitido anunciar:</p>
        <ul>
          <li>produtos vencidos, violados, avariados ou armazenados fora das condições exigidas pelo fabricante;</li>
          <li>produtos sem registro, notificação ou cadastro na ANVISA, quando exigidos;</li>
          <li>amostras grátis ou produtos de venda proibida;</li>
          <li>medicamentos sujeitos a controle especial (Portaria SVS/MS nº 344/1998).</li>
        </ul>
        <p>
          O anúncio deve informar lote e validade corretos, para garantir a rastreabilidade. Anúncios com a
          validade vencida são inativados automaticamente.
        </p>
      </>
    ),
  },
  {
    id: "anuncios",
    titulo: "Anúncios e descrições geradas por IA",
    conteudo: (
      <ul>
        <li>O anunciante é responsável pelo conteúdo do anúncio: descrição, quantidade, valor, imagens,
          lote e validade.</li>
        <li>A plataforma pode sugerir descrições geradas por inteligência artificial. Elas são apenas
          sugestões: o anunciante deve revisá-las e responde pelo texto publicado.</li>
        <li>É proibido incluir dados de pacientes ou dados pessoais sensíveis em anúncios, observações,
          imagens ou planilhas.</li>
      </ul>
    ),
  },
  {
    id: "negociacao",
    titulo: "Propostas e negociação",
    conteudo: (
      <ul>
        <li>Instituições credenciadas podem enviar propostas para anúncios ativos. O vendedor decide se
          aceita ou recusa.</li>
        <li>O aceite de uma proposta registra o acordo comercial na plataforma. A emissão de nota fiscal,
          o pagamento, a retirada ou entrega e a conferência dos produtos são de responsabilidade das partes.</li>
        <li>Recomenda-se que o comprador confira o produto, o lote e a validade no recebimento.</li>
      </ul>
    ),
  },
  {
    id: "creditos",
    titulo: "Créditos",
    conteudo: (
      <ul>
        <li>Algumas funcionalidades consomem créditos, como publicar anúncios e gerar descrições com IA.
          O custo de cada funcionalidade é informado antes do uso.</li>
        <li>Os créditos são adquiridos em pacotes, cujos valores atuais são exibidos na Central de Créditos
          e podem ser alterados para novas compras.</li>
        <li>Créditos promocionais, como os de boas-vindas, podem ter prazo de validade, informado no
          extrato. Os não utilizados até o fim do prazo expiram.</li>
        <li>Créditos não são convertidos em dinheiro e não podem ser transferidos entre instituições.</li>
      </ul>
    ),
  },
  {
    id: "condutas",
    titulo: "Condutas proibidas",
    conteudo: (
      <ul>
        <li>usar dados de outras instituições obtidos na plataforma para fins alheios à negociação;</li>
        <li>criar anúncios falsos, enganosos ou duplicados;</li>
        <li>tentar acessar áreas, contas ou dados sem autorização;</li>
        <li>usar a plataforma para qualquer atividade ilegal.</li>
      </ul>
    ),
  },
  {
    id: "suspensao",
    titulo: "Suspensão e encerramento",
    conteudo: (
      <p>
        O MedConnect pode remover anúncios e suspender ou bloquear contas que descumpram estes termos ou a
        legislação, especialmente a sanitária. A instituição pode solicitar o encerramento da conta a
        qualquer momento.
      </p>
    ),
  },
  {
    id: "responsabilidade",
    titulo: "Limites de responsabilidade",
    conteudo: (
      <p>
        Como não participa das negociações, o MedConnect não responde pela qualidade, procedência,
        conservação, entrega ou pagamento dos produtos negociados, nem pelo cumprimento das obrigações
        assumidas entre as instituições.
      </p>
    ),
  },
  {
    id: "privacidade",
    titulo: "Privacidade",
    conteudo: (
      <p>
        O tratamento de dados pessoais segue a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    ),
  },
  {
    id: "legislacao",
    titulo: "Alterações e legislação aplicável",
    conteudo: (
      <p>
        Estes termos podem ser atualizados, e mudanças relevantes serão comunicadas às instituições
        cadastradas. Aplica-se a legislação brasileira.
      </p>
    ),
  },
]

export default function TermosPage() {
  return (
    <LegalPage
      titulo="Termos de Uso"
      resumo="Regras para instituições de saúde que anunciam e negociam materiais hospitalares e medicamentos no MedConnect."
      atualizadoEm="14 de novembro de 2026"
      secoes={SECOES}
    />
  )
}
