# 🏥 MedConnect

Plataforma B2B de negociação de materiais e medicamentos hospitalares.

---

## 📖 Sobre o Projeto

O **MedConnect** é uma plataforma digital desenvolvida para conectar empresas do setor da saúde em um ambiente centralizado, seguro e eficiente para negociação de materiais e medicamentos hospitalares.

A plataforma atua como um marketplace B2B, permitindo que empresas compradoras e vendedoras:

* Cadastrem ou busquem por materiais, medicamentos e produtos hospitalares;
* Publiquem anúncios para negociação;
* Busquem produtos disponíveis no marketplace;
* Enviem propostas comerciais (iniciando uma negociação);
* Utilizem Inteligência Artificial para auxiliar na criação de anúncios.
  
O principal objetivo da plataforma é promover uma gestão mais inteligente dos recursos hospitalares, reduzindo desperdícios e facilitando a circulação de insumos entre instituições de saúde.
Além do impacto econômico, o projeto também está alinhado ao Objetivo de Desenvolvimento Sustentável número 9 da ONU, que incentiva a inovação e o desenvolvimento de infraestruturas resilientes e sustentáveis.

---
## 👥 Perfis de Usuário

**Administrador:** Responsável pelo gerenciamento geral da plataforma, incluindo controle de usuários e operações do sistema.

**Empresa Vendedora:** Empresa responsável pelo cadastro de insumos e publicação de anúncios para negociação na plataforma.

**Empresa Compradora:** Empresa que busca produtos disponíveis no marketplace, podendo demonstrar interesse e iniciar negociações com as empresas vendedoras.

---
## 🔄 Fluxo Básico de Uso
1. A empresa realiza seu cadastro e solicita seu credenciamento para utilizar a plataforma;
2. Um usuário administrador aprova a solicitação de credenciamento da empresa;
3. A empresa efetua login utilizando CNPJ e senha;
4. Empresas vendedoras cadastram insumos, lotes e fabricantes;
5. Empresas vendedoras publicam anúncios no marketplace;
6. Empresas compradoras pesquisam produtos disponíveis;
7. A empresa compradora demonstra interesse em um anúncio enviando uma proposta direta ou personalizada;
8. A empresa vendedora analisa a proposta recebida;
9. A proposta pode ser aceita ou recusada;
10. Após o aceite, as empresas realizam a negociação diretamente entre si;
11. A negociação é concluída externamente à plataforma.
12. A empresa vendedora altera manualmente o status do anuncio para marca-lo como finalizado.
---

## ✨ Funcionalidades Implementadas

### Empresas

* Cadastro de empresas
* Validação de CNPJ
* Login utilizando JWT
* Controle de autenticação

### Materiais e Medicamentos

* Cadastro de materiais
* Cadastro de medicamentos
* Cadastro de produtos
* Cadastro de fabricantes
* Cadastro de Lotes

### Marketplace

* Publicação de anúncios
* Busca de produtos
* Catálogo de insumos disponíveis
* Visualização de detalhes dos anúncios

### Negociações

* Envio de propostas
* Aceite de propostas
* Recusa de propostas
* Controle de status da negociação
* Caixa de propostas recebidas
* Caixa de propostas enviadas

### Inteligência Artificial

* Integração com Google Gemini;
* Possibilidade de geração de descrições de anúncios com IA (permitindo alteração do escrito).

---

## 🛡️ Regras de Negócio

* Apenas empresas cadastradas podem acessar o sistema;
* O cadastro exige CNPJ válido;
* Cada anúncio pode conter apenas um tipo de produto;
* Lotes vencidos são automaticamente inativados no momento da publicação do anúncio;
* Materiais e medicamentos exigem códigos de referência (TISS, TUSS, Simpro e Brasíndice).

---

## 🔐 Segurança

* Autenticação baseada em JWT;
* Controle de autorização por perfil;
* Comunicação protegida por HTTPS;
* Registro de acessos e operações do sistema.

---

## 🛠️ Tecnologias Utilizadas

### Backend

* Python
* Django
* Django REST Framework
* PostgreSQL
* JWT Authentication
* Django CORS Headers

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Inteligência Artificial

* Google Gemini API

---

## 📂 Estrutura do Projeto

```text
MedConnect
│
├── backend
│   ├── anuncio
│   ├── autenticacao
│   ├── fabricante
│   ├── lote
│   ├── marca
│   ├── material
│   ├── pessoa_juridica
│   └── ...
│
├── frontend
│   ├── app
│   ├── components
│   ├── server
│   ├── types
│   └── ...
│
└── README.md
```

---
## 🚀 Como Executar o Projeto

---

## ⚙️ Pré-requisitos
Antes de iniciar o projeto, instale:
* Python 3.11 ou 3.12 (recomendado)
* PostgreSQL
* Node.js 20 ou superior
* Git
---

### 1. Clonar o Repositório

```bash
git clone URL_DO_REPOSITORIO
```

Entre na pasta do projeto:

```bash
cd MedConnect
```

---

## 🐍 Configuração do Ambiente Virtual
Entre na pasta backend do projeto: 

```bash
cd backend
```

### 2. Criar Ambiente Virtual

#### Windows

```bash
python -m venv venv
```

---

### 3. Ativar Ambiente Virtual

#### Windows

```bash
venv\Scripts\activate
```

---

## 📦 Instalar Dependências

### 4. Instalar Dependências do Projeto

```bash
pip install -r requirements.txt
```

---

## 🔐 Configuração do Ambiente

### 5. Criar Arquivo `.env`

Crie um arquivo chamado `.env` na raiz do projeto.

É onde ficará sua chave API:

```env
GEMINI_API_KEY=sua_chave_api
```

---

## 🗄️ Configuração do Banco de Dados

### 6. Criar Banco PostgreSQL

Exemplo:

```sql
CREATE DATABASE medconnect;
```

---

## 🔄 Migrations

### 7. Rodar Migrations

Caso existam alterações nos modelos que ainda não foram versionadas:

```bash
python manage.py makemigrations
```

---

## 8. Executar as Migrations

```bash
python manage.py migrate
```

---

## 👤 Criar Superusuário

### 9. Criar Administrador

```bash
python manage.py createsuperuser
```

---

## ▶️ Executar o Projeto

### 10. Iniciar Servidor Django

```bash
python manage.py runserver
```

Servidor disponível em:

```text
http://127.0.0.1:8000/
```

---

# 💻 Configuração do Frontend

Acesse a pasta do frontend:

```bash
cd frontend
```

---

## 1. Instalar Dependências

```bash
npm install
```

---

## 2. Criar Arquivo .env.local

Crie o arquivo:

```text
.env.local
```

Adicione:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## 3. Executar Frontend

```bash
npm run dev
```

Aplicação disponível em:

```text
http://localhost:3000
```

---

## 🔑 Variáveis de Ambiente

### Backend

```env
GEMINI_API_KEY=sua_chave_api
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```
---

## 📌 Status do Projeto

🚧 Projeto em desenvolvimento para fins acadêmicos e demonstração de conceito.

---

## 👨‍💻 Desenvolvido por

Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC), com foco na otimização das negociações B2B de materiais e medicamentos hospitalares, promovendo sustentabilidade e redução de desperdícios no setor da saúde.
