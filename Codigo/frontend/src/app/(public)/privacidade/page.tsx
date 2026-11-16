import type { Metadata } from "next"
import LegalPage, { SecaoLegal } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Política de Privacidade | MedConnect",
}

const SECOES: SecaoLegal[] = [
  {
    id: "quem-somos",
    titulo: "Quem somos e a quem se aplica",
    conteudo: (
      <>
        <p>
          O MedConnect é uma plataforma B2B em que instituições de saúde anunciam e negociam materiais
          hospitalares e medicamentos excedentes. Esta política explica como tratamos os dados pessoais
          ligados às instituições cadastradas e aos seus representantes, conforme a Lei Geral de Proteção
          de Dados (Lei nº 13.709/2018, LGPD).
        </p>
        <p>
          Os usuários da plataforma são pessoas jurídicas. Os dados pessoais tratados são, principalmente,
          os dos representantes dessas instituições (por exemplo, o nome do responsável técnico e os
          contatos informados no cadastro).
        </p>
      </>
    ),
  },
  {
    id: "pacientes",
    titulo: "Dados de pacientes",
    conteudo: (
      <>
        <p>
          O MedConnect <strong>não coleta nem precisa de dados de pacientes</strong>. A plataforma trata
          apenas de insumos (materiais e medicamentos) e das instituições que os negociam.
        </p>
        <p>
          É proibido inserir dados de pacientes ou qualquer dado pessoal sensível referente à saúde
          (art. 5º, II, da LGPD) em anúncios, observações, propostas, imagens ou planilhas enviadas à
          plataforma. Conteúdos desse tipo podem ser removidos.
        </p>
      </>
    ),
  },
  {
    id: "dados-coletados",
    titulo: "Quais dados coletamos",
    conteudo: (
      <>
        <p><strong>Cadastro da instituição:</strong></p>
        <ul>
          <li>nome da empresa, razão social e CNPJ;</li>
          <li>e-mail corporativo, telefone e nome do responsável técnico;</li>
          <li>endereço (CEP, logradouro, número, bairro, cidade e UF) e as coordenadas geográficas
            aproximadas obtidas a partir dele, usadas para calcular distâncias no catálogo;</li>
          <li>senha de acesso, armazenada apenas em formato cifrado (hash), sem possibilidade de leitura;</li>
          <li>imagem de perfil, se a instituição optar por enviá-la.</li>
        </ul>
        <p><strong>Uso da plataforma:</strong></p>
        <ul>
          <li>materiais cadastrados, anúncios (incluindo lote, validade e imagens) e propostas;</li>
          <li>histórico de créditos: compras, consumo e créditos concedidos;</li>
          <li>termos digitados na busca do catálogo e os interesses de produto inferidos a partir deles,
            usados para recomendar anúncios.</li>
        </ul>
      </>
    ),
  },
  {
    id: "finalidades",
    titulo: "Para que usamos os dados e com qual base legal",
    conteudo: (
      <ul>
        <li><strong>Credenciar a instituição e manter a conta</strong>, incluindo a análise do cadastro
          pela equipe do MedConnect: execução de contrato (art. 7º, V).</li>
        <li><strong>Exibir anúncios, viabilizar propostas e colocar as partes em contato</strong>:
          execução de contrato (art. 7º, V).</li>
        <li><strong>Gerir créditos</strong> (saldo, extrato, validade de créditos promocionais):
          execução de contrato (art. 7º, V).</li>
        <li><strong>Recomendar anúncios e gerar descrições com IA</strong>: legítimo interesse
          (art. 7º, IX), limitado a dados de produto e termos de busca.</li>
        <li><strong>Segurança e prevenção de fraude</strong>, como o controle de acesso por perfil:
          legítimo interesse (art. 7º, IX).</li>
        <li><strong>Guardar registros de acesso</strong> pelo prazo exigido no Marco Civil da Internet
          (Lei nº 12.965/2014, art. 15): cumprimento de obrigação legal (art. 7º, II).</li>
      </ul>
    ),
  },
  {
    id: "compartilhamento",
    titulo: "Com quem compartilhamos",
    conteudo: (
      <>
        <p><strong>Outras instituições cadastradas.</strong> O nome da instituição anunciante, sua cidade
          e UF, endereço e dados de contato ficam visíveis para as demais instituições credenciadas, para
          permitir a negociação. Propostas e seus valores são visíveis apenas para o comprador e o vendedor
          envolvidos.</p>
        <p><strong>Prestadores de serviço</strong>, que tratam dados apenas para executar a sua função:</p>
        <ul>
          <li><strong>Google (Gemini)</strong>: recebe dados de produto e termos de busca para gerar
            descrições, realizar buscas e inferir interesses. Não enviamos dados de contato para a IA;</li>
          <li><strong>ViaCEP e OpenStreetMap (Nominatim)</strong>: recebem o CEP e o endereço informados
            no cadastro, para preencher o endereço e obter as coordenadas aproximadas;</li>
          <li><strong>provedores de hospedagem em nuvem</strong>, onde ficam a aplicação e o banco de dados.</li>
        </ul>
        <p>Não vendemos dados pessoais.</p>
      </>
    ),
  },
  {
    id: "transferencia",
    titulo: "Transferência internacional",
    conteudo: (
      <p>
        Alguns prestadores, como o Google, podem processar dados em servidores fora do Brasil. Nesses
        casos, a transferência segue as hipóteses do art. 33 da LGPD.
      </p>
    ),
  },
  {
    id: "pagamentos",
    titulo: "Pagamentos e créditos",
    conteudo: (
      <>
        <p>
          O MedConnect não intermedia o pagamento das negociações entre instituições: valores, pagamento e
          entrega são combinados diretamente entre as partes.
        </p>
        <p>
          Na compra de créditos, o MedConnect não armazena números de cartão. No ambiente atual o pagamento
          de créditos é simulado. Quando um meio de pagamento real for integrado, esta seção será atualizada
          para indicar o processador utilizado.
        </p>
      </>
    ),
  },
  {
    id: "retencao",
    titulo: "Por quanto tempo guardamos",
    conteudo: (
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Após o encerramento, os dados são eliminados ou
        anonimizados, exceto quando a guarda for necessária para cumprir obrigação legal (como os registros
        de acesso exigidos pelo Marco Civil da Internet) ou para o exercício regular de direitos, inclusive
        o histórico de negociações e de créditos.
      </p>
    ),
  },
  {
    id: "seguranca",
    titulo: "Segurança",
    conteudo: (
      <ul>
        <li>conexão protegida por HTTPS no ambiente de produção;</li>
        <li>senhas armazenadas apenas em formato cifrado (hash);</li>
        <li>acesso por autenticação, com o painel de credenciamento restrito a administradores;</li>
        <li>propostas visíveis somente para o comprador e o vendedor envolvidos.</li>
      </ul>
    ),
  },
  {
    id: "direitos",
    titulo: "Direitos do titular",
    conteudo: (
      <>
        <p>
          Nos termos do art. 18 da LGPD, o titular pode solicitar: confirmação do tratamento, acesso,
          correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação
          sobre compartilhamentos e revisão de decisões automatizadas.
        </p>
        <p>
          Os dados cadastrais podem ser consultados e corrigidos em <strong>Meu perfil</strong>. Para os
          demais pedidos, use o canal do encarregado pelo tratamento de dados: <strong>contato a definir
          antes da operação comercial</strong>.
        </p>
        <p>
          Também é possível apresentar reclamação à Autoridade Nacional de Proteção de Dados (
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">ANPD</a>).
        </p>
      </>
    ),
  },
  {
    id: "alteracoes",
    titulo: "Alterações desta política",
    conteudo: (
      <p>
        Esta política pode ser atualizada quando a plataforma mudar. A data da última atualização fica no
        topo da página, e mudanças relevantes serão comunicadas às instituições cadastradas.
      </p>
    ),
  },
]

export default function PrivacidadePage() {
  return (
    <LegalPage
      titulo="Política de Privacidade"
      resumo="Como o MedConnect coleta, usa e protege os dados das instituições de saúde cadastradas e de seus representantes."
      atualizadoEm="14 de novembro de 2026"
      secoes={SECOES}
    />
  )
}
