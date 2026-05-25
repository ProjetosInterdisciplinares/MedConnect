# 🏥 MedConnect

Plataforma B2B de negociação de materiais e medicamentos hospitalares.

---

## 📖 Sobre o Projeto

O **MedConnect** é uma plataforma digital desenvolvida para conectar empresas do setor da saúde em um ambiente centralizado, seguro e eficiente para negociação de materiais e medicamentos hospitalares.

A plataforma atua como um marketplace B2B, permitindo que empresas compradoras e vendedoras:

* Cadastrem ou busquem por materiais, medicamentos e produtos;
* Iniciem negociações;
* Gerenciem anúncios e interações comerciais.

O principal objetivo do projeto é reduzir desperdícios de insumos hospitalares, otimizar negociações e promover práticas sustentáveis no setor da saúde.

---
## 👥 Perfis de Usuário

**Administrador:** Responsável pelo gerenciamento geral da plataforma, incluindo controle de usuários e operações do sistema.

**Empresa Vendedora:** Empresa responsável pelo cadastro de insumos e publicação de anúncios para negociação na plataforma.

**Empresa Compradora:** Empresa que busca produtos disponíveis no marketplace, podendo demonstrar interesse e iniciar negociações com as empresas vendedoras.

---
## 🛡️ Regras de Negócio e Segurança
* Apenas empresas cadastradas com CNPJ podem utilizar o sistema.
* O sistema é acessível via web, utiliza criptografia HTTPS para dados sensíveis e registra logs de acesso.

## 🔄 Fluxo Básico de Uso
1. A empresa realiza seu cadastro na plataforma;
2. Empresas vendedoras anunciam os insumos disponíveis para negociação;
3. Empresas compradoras pesquisam os produtos disponíveis no marketplace e podem demonstrar interesse no produto nas condições anunciadas ou enviar uma proposta personalizada;
4. A empresa vendedora pode aceitar ou recusar a proposta recebida, podendo justificar o motivo da recusa;
5. Após o aceite, as empresas iniciam a negociação diretamente pela plataforma;
6. Após o acordo entre as partes, a negociação é concluída externamente.

## 🛠️ Tecnologias Utilizadas

### Backend
* Python
* Django
* PostgreSQL

### Frontend

* Next.js
* React
* TypeScript
* Tailwind

### Outras Tecnologias

* JWT Authentication
* Google Gemini API
* Django CORS Headers

---

## ⚙️ Pré-requisitos

Antes de iniciar o projeto, instale:

* Python 3.11 ou 3.12 (recomendado)
* PostgreSQL
* Git

---

## 🚀 Como Executar o Projeto

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

## 🔄 Executar as Migrations

### 7. Rodar Migrations

```bash
python manage.py migrate
```

---

## 👤 Criar Superusuário

### 8. Criar Administrador

```bash
python manage.py createsuperuser
```

---

## ▶️ Executar o Projeto

### 9. Iniciar Servidor Django

```bash
python manage.py runserver
```

Servidor disponível em:

```text
http://127.0.0.1:8000/
```

---

## 📄 Licença

Este projeto é destinado a fins acadêmicos e de desenvolvimento interno.
