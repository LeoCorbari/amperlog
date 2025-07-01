
# 📋 AmperLog

AmperLog é um sistema web para registro e acompanhamento de eventos em tempo real, com suporte a modo escuro, animações visuais e integração com Firebase Firestore.

## 🚀 Funcionalidades

- Cadastro de eventos com título, descrição e data de início.
- Marcação de eventos como "resolvido".
- Ocultação de eventos com o campo `isHidden`.
- Atualizações em tempo real via **Socket.IO**.
- Interface moderna com **Tailwind CSS** e animações com **Vanilla Tilt**.
- Splash screen animado e suporte a modo escuro.

## 🛠️ Tecnologias Utilizadas

**Frontend:**

- [Tailwind CSS](https://tailwindcss.com/)
- [Vanilla Tilt.js](https://micku7zu.github.io/vanilla-tilt.js/)
- [Material Icons](https://fonts.google.com/icons)

**Backend:**

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## 📂 Estrutura do Projeto

```
├── backend/
│   └── server.js
├── firebase-service-account.json
├── firebase.js
├── index.html
├── package.json
├── package-lock.json
└── .gitignore
```

## 📦 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/amperlog.git
cd amperlog
```

2. Instale as dependências:

```bash
npm install
```

3. Adicione o arquivo `firebase-service-account.json` (obtido no console do Firebase) na raiz do projeto.

## 🚀 Executando o Projeto

### Backend

Inicie o servidor Node.js com:

```bash
node server.js
```

Servidor será iniciado em `http://localhost:3000`

### Frontend

Abra o arquivo `index.html` no navegador, ou utilize uma extensão como Live Server no VS Code.

> A interface usa as rotas do backend para consultar e atualizar eventos.

## 🌐 Endpoints da API

- `GET /events` – Lista todos os eventos ordenados por data de início.
- `POST /events` – Cria um novo evento.
- `PATCH /events/:id` – Atualiza o status ou visibilidade do evento.
- `DELETE /events/:id` – Remove o evento.

## 📄 Exemplo de Requisição

```json
POST /events
{
  "title": "Queda de energia",
  "description": "Afetando bairro central",
  "start": "2025-07-01T14:00:00Z"
}
```

## 🔒 Segurança

⚠️ **Importante:** Nunca suba seu arquivo `firebase-service-account.json` para repositórios públicos. Ele já está incluído no `.gitignore` por segurança.

## ✅ Requisitos

- Node.js versão 18 ou superior
- Conta Firebase com Firestore ativado
- Chave de serviço Firebase salva como `firebase-service-account.json`

## 👨‍💻 Autor

Desenvolvido por **Leonardo Corbari** – Projeto educacional
