

| Controle de Versões |  |  |  |
| :---- | :---- | :---- | :---- |
| **Versão** | **Data** | **Autor** | **Notas da Revisão** |
| 1.0 | 18/08 | Ana Carolina dos Santos Simões Andressa Fernanda Fernandes Beatriz Barros Rodrigues Pereira Felipe Leme do Prado Laynne Maria da Silva Maria Gabriela Bonatto | Versão inicial do TAP, elaborada a partir do levantamento de requisitos (entrevistas com o cliente).  |
|  |  |  |  |

# **Objetivos deste documento**

Autorizar o início de desenvolvimento da segunda etapa do projeto MedConnect, a ser desenvolvida neste segundo semestre de 2026, estabelecendo seus objetivos, principais responsáveis, requisitos iniciais, entregas, premissas e restrições.

# **Contexto e evolução do projeto**

A segunda etapa de desenvolvimento do MedConnect contempla a evolução das funcionalidades definidas na etapa anterior (primeiro semestre de 2026\) incorporando novos pontos de melhoria, identificados a partir do amadurecimento das discussões com o cliente e do retorno obtido na avaliação da entrega anterior.   
Nesta etapa, o projeto mantém sua proposta de oferecer uma plataforma B2B voltada à negociação e redistribuição de materiais e medicamentos hospitalares, permitindo que instituições de saúde publiquem anúncios, consultem ofertas e realizem negociações em um ambiente digital centralizado.   
Entre as principais evoluções previstas estão o aprimoramento do processo de negociação, com possibilidade de negociação de quantidades parciais dos itens anunciados, o registro do histórico de negociações, o controle de validade dos produtos e a comparação de preços de referência, condicionada ao plano de assinatura da empresa compradora.    
O principal diferencial desta segunda etapa é a incorporação de soluções de Inteligência Artificial (IA) como mecanismo de inovação da plataforma. A aplicação da IA busca tornar o MedConnect mais inteligente e proativo, reduzindo atividades manuais e auxiliando as instituições na identificação e no gerenciamento de oportunidades de negociação.   
Entre as principais aplicações de IA previstas estão:

* **Matching inteligente entre oferta e demanda:** análise do histórico de pesquisas e compras das empresas compradoras para recomendar anúncios compatíveis com seus interesses e necessidades.  
* **Importação e validação de dados por planilha:** possibilidade de criação de anúncios em massa por meio da importação de planilhas, com utilização de IA para verificar as informações inseridas, identificar inconsistências e sugerir adequações ao padrão estabelecido.

A incorporação dessas soluções tem como objetivo ampliar a eficiência da plataforma, facilitar a utilização por parte das instituições parceiras e aumentar seu potencial de adoção no ecossistema hospitalar, mantendo o alinhamento do projeto ao ODS 9 — Indústria, Inovação e Infraestrutura.

Para esta etapa, destacam-se como requisitos iniciais e inovadores:

* Registro e consulta do histórico de negociações realizadas;  
* Permissão para negociação de quantidades parciais dos produtos anunciados;  
* Expiração automática de anúncios de materiais ou medicamentos com validade expirada;  
* Comparação entre preços anunciados e valores de referência, conforme o plano de assinatura contratado;  
* Recomendação inteligente de anúncios utilizando IA;  
* Importação de anúncios em massa por meio de planilhas;  
* Validação e adequação dos dados importados utilizando IA;  
* Hospedagem da aplicação em ambiente web.

# **Situação atual e justificativa do projeto**

Hospitais frequentemente precisam comprar materiais e medicamentos em lotes fechados para atender demandas pontuais, o que aumenta o risco de desperdício por vencimento da validade, já que não há um mecanismo eficiente de redistribuição entre as instituições. Para resolver esse problema, propõe-se uma plataforma B2B de negociação de materiais e medicamentos hospitalares: uma infraestrutura digital centralizada e transparente que conecta instituições de saúde para compra, venda e redistribuição de insumos, com funcionalidades como cadastro de produtos, gestão de lotes, marketplace, anúncios e acompanhamento de negociações. A iniciativa está alinhada ao ODS 9 (Indústria, Inovação e Infraestrutura) da Agenda 2030 da ONU, usando tecnologia para tornar o setor de saúde mais eficiente, sustentável e colaborativo.

# **Objetivos SMART e critérios de sucesso do projeto**

Disponibilizar, em até 6 meses após o início do projeto, uma plataforma B2B  
funcional que permita a empresas do setor de saúde cadastrar, anunciar e negociar materiais e medicamentos hospitalares, reduzindo o desperdício de  
itens por vencimento ou excesso de lote. Critérios de sucesso: (1) plataforma  
em produção com cadastro, login, anúncio, busca e negociação de produtos  
operacionais; (2) pelo menos 3 empresas parceiras utilizando o sistema em  
ambiente piloto até o fim do projeto; (3) redução mensurável do tempo médio  
de negociação entre empresas em relação ao processo manual atual; (4) 100%  
dos requisitos funcionais e não funcionais priorizados implementados e validados com o cliente.  
(Specific: aumento de eficiência na negociação de insumos; Measurable:  
indicadores acima; Assignable: equipe de desenvolvimento e PM; Realistic:  
escopo compatível com os RFs definidos; Time-related: entrega em 6 meses.)

# **Produtos e principais requisitos**

O principal produto deste projeto é uma plataforma digital B2B para negociação  
de materiais e medicamentos hospitalares entre empresas do setor de saúde.  
Os principais requisitos levantados junto ao cliente, por meio de entrevistas,  
estão organizados a seguir.

# 

# **Requisitos Funcionais (RF)**

RF01 – O sistema deverá permitir o cadastro de empresas.  
RF02 – O sistema deverá validar o cadastro através do CNPJ informado.  
RF03 – O sistema deverá permitir o login de empresas por meio de CNPJ e senha.  
RF04 – O sistema deverá permitir que as empresas realizem o cadastro de  
materiais ou medicamentos.  
RF05 – O sistema deverá permitir o cadastro e controle de lotes associados  
aos produtos.  
RF06 – O sistema deverá permitir o cadastro de fabricantes.  
RF07 – O sistema deve disponibilizar uma funcionalidade que utilize a API do Gemini para gerar automaticamente uma sugestão de descrição para o  
anúncio, considerando os dados informados pelo usuário, permitindo sua  
edição antes da publicação.  
RF08 – O sistema deverá permitir anunciar produtos.  
RF09 – O sistema deverá permitir a busca de produtos disponíveis no  
marketplace.  
RF10 – O sistema deverá permitir a abertura de negociações entre empresas.  
RF11 – O sistema deverá permitir o envio de propostas para a negociação.  
RF12 – O sistema deverá permitir a aceitação ou recusa de propostas.  
RF13 – O sistema deverá permitir o encerramento de negociações.  
RF14 – O sistema deverá registrar e atualizar o status das negociações (ex:  
aberta, aceita, recusada, encerrada).  
RF15 – O sistema deverá permitir que administradores gerenciem empresas  
cadastradas.  
RF16 – O sistema deverá permitir a gestão de planos de assinatura.  
RF17 – O sistema deverá permitir o registro e a consulta do histórico de negociações realizadas.  
RF18 – O sistema deverá permitir que empresas realizem negociações de quantidades parciais dos produtos disponíveis em um anúncio.  
RF19 – O sistema deverá utilizar Inteligência Artificial para recomendar anúncios de produtos com base no histórico de pesquisas e compras realizadas pela empresa.  
RF20 – O sistema deverá permitir a importação de planilhas para a criação de anúncios em massa.  
RF21 – O sistema deverá utilizar Inteligência Artificial para validar os dados importados por meio de planilhas e sugerir adequações quando forem identificadas inconsistências.

# **Requisitos Não Funcionais (RNF)**

RNF01 – O sistema deverá ser acessível via navegador web.  
RNF02 – O sistema deverá garantir criptografia de dados sensíveis (HTTPS).  
RNF03 – O sistema deverá possuir controle de autenticação e autorização de  
usuários.

# **Regras de Negócio (RN)**

RN01 – O cadastro de materiais e medicamentos deve exigir o preenchimento  
dos códigos de referência (TISS, TUSS, Simpro e Brasíndice).  
RN02 – O sistema deve inativar cadastros de lotes com validade expirada.  
RN03 – O sistema deve expirar um anúncio se o lote dos produtos associados  
estiver com validade expirada.  
RN04 – O sistema deve permitir a publicação de apenas um tipo de produto por anúncio.  
RN06 – A comparação entre o valor anunciado pelo fornecedor e os valores de referência das tabelas SIMPRO e Brasíndice deverá estar disponível somente para empresas cujo plano de assinatura contemple essa funcionalidade. 

# 

# **Marcos**

| Marcos | Previsão |
| :---- | :---- |
| Tema do Trabalho Interdisciplinar e Requisitos.  | 24/08/2026 23:59  |
| Planejamento do Projeto (Github). | 31/08/2026 23:59  |
| Entrega 1ª Fase do Projeto Interdisciplinar  | 14/09/2026 23:59  |
| Entrega 2ª Fase do Projeto Interdisciplinar | 05/10/2026 23:59  |
| Entrega 3ª Fase do Projeto Interdisciplinar  | 26/10/2026 23:59  |
| Entrega Final do Projeto Interdisciplinar  | 30/11/2026 23:59  |
| Resumo Expandido PI-IV  | 30/11/2026 23:59  |

# 

# **Partes interessadas do Projeto**

| Empresa | Participante (RA/Nome) | Função |
| :---- | :---- | :---- |
| FHO  | RA: 117199/ Ana Carolina dos Santos Simões | (PO) E BUSINESS ANALYST |
| FHO | RA: 116479/ Andressa Fernanda Fernandes | ARQUITETO DE SOFTWARE & DBA |
| FHO | RA: 116418/ Felipe Leme do Prado | ENGENHEIRO DE IA E DADOS |
| FHO | RA: 116538/ Beatriz Barros Rodrigues | DESENVOLVEDOR BACK-END (IA) |
| FHO | RA: 117264/ Laynne Maria da Silva | DESENVOLVEDOR FRONT-END & UX |
| FHO | RA: 117246/ Maria Gabriela Bonatto | QA / SCRUM MASTER |

# **Restrições**

Não será possível cadastros de pessoas físicas ou instituições que não possuam os documentos aprovados no momento de cadastro.

# **Premissas**

(1) o cliente estará disponível para entrevistas e validações periódicas ao longo do desenvolvimento iterativo;   
(2) as empresas piloto fornecerão os dados reais de materiais e medicamentos  
(incluindo códigos TISS, TUSS, Simpro e Brasíndice) necessários para os testes;  
(3) a API do Gemini permanecerá disponível e dentro dos limites de uso  
gratuitos/contratados durante todo o projeto;   
(4) os usuários finais possuem acesso à internet e navegador web compatível.

# **Riscos**

(1)Indisponibilidade ou mudança de política/custos da API do Gemini, impactando a geração automática de descrições (RF07);   
(2)Dados incompletos ou inconsistentes de códigos de referência (TISS, TUSS, Simpro, Brasíndice) fornecidos pelas empresas cadastradas;   
(3)Baixa adesão inicial de empresas parceiras à plataforma, reduzindo o volume de negociações;   
(4)Exposição de dados sensíveis em caso de falha na criptografia (RNF02) ou no controle de autenticação (RNF03);   
(5)Atraso no cronograma acadêmico devido à complexidade do módulo de negociação e controle de status.

# **Orçamento do Projeto** 

Com base na última avaliação e nos conceitos apresentados na aula de Engenharia de Software, chegamos à seguinte relação de valores. Esses custos poderão sofrer ajustes conforme novas implementações forem realizadas. 

**Pontos de Função**

**Arquivos Lógicos Internos (ALI)**

| ALI | Descrição | PF Médio |
| :---- | :---- | :---- |
| Empresas | Cadastro das empresas | 10 |
| Produtos | Materiais e medicamentos | 10 |
| Lotes | Controle de lotes | 10 |
| Negociações | Histórico e status | 10 |
| Propostas | Propostas Enviadas | 10 |
| Anúncios | Marketplace | 10 |

## **Arquivos de Interface Externa (AIE)**

| AIE | Descrição | PF Médio |
| :---- | :---- | :---- |
| Validação de CNPJ | Serviço externo | 7 |
| TISS/TUSS/Simpro/Brasíndice  | Bases externas  | 7 |

## **Entradas Externas (EE)**

| EE | PF Médio |
| :---- | :---- |
| Cadastro de empresa | 4 |
| Login | 4 |
| Cadastro de produto | 4 |
| Editar produto | 4 |
| Cadastro de lote | 4 |
| Publicar anúncio | 4 |
| Abrir negociação | 4 |
| Enviar proposta | 4 |
| Aceitar proposta | 4 |
| Recusar proposta | 4 |
| Encerrar negociação | 4 |
| Gerenciar empresas | 4 |

**Consultas Externas (CE)Saídas Externas (SE)**

| CE | PF Médio |
| :---- | :---- |
| Buscar produtos | 4 |
| Visualizar detalhes do produto | 4 |
| Listar negociações | 4 |
| Filtrar negociações | 4 |
| Consultar status de negociação | 4 |
| Listar empresas cadastradas | 4 |

| AIE | PF Médio |
| :---- | :---- |
| Atualização automática de estoque | 5 |
| Relatórios administrativos | 5 |
| Controle de validade de lotes | 5 |
| Histórico de negociações | 5 |

* **Custo do Custo do Software:**  
- Custo \= 166 x 32 \= R$5.312,00 

| Aprovações |  |  |
| :---- | :---- | :---- |
| **Participante** | **Assinatura** | **Data** |
| Patrocinador do Projeto |  |  |
| Gerente do Projeto |  |  |

