# 🏠 Chá de Casa Nova - Ialy & Klaiven

Este é um projeto web moderno e elegante desenvolvido para gerenciar a lista de presentes do nosso **Chá de Casa Nova**. O objetivo é facilitar a escolha de presentes pelos amigos e familiares, com integração direta para pagamentos via PIX e notificações por WhatsApp.

---

## ✨ Funcionalidades

### 🎁 Para os Convidados
- **Lista de Presentes Interativa:** Visualização clara de todos os itens desejados com fotos, nomes e valores.
- **Sistema de Reserva:** Garante que um item não seja presenteado em duplicidade.
- **Integração com PIX:** Geração automática de QR Code e código "Copia e Cola" para facilitar o presente em dinheiro.
- **Notificação via WhatsApp:** Envio automático dos detalhes do presente reservado (Nome, Valor, Link e PIX) diretamente para os anfitriões.

### 🔐 Para os Anfitriões (Painel Admin)
- **Login Seguro:** Acesso restrito via Firebase Authentication.
- **Gestão de Produtos (CRUD):** Adicionar, editar ou excluir itens da lista em tempo real.
- **Upload de Imagens:** Integração com a API do ImgBB para hospedagem automática de fotos dos produtos.
- **Gestão de Reservas:** Opção para liberar um item reservado caso haja desistência.
- **Gestão de Usuários:** Possibilidade de adicionar outros administradores ao painel.

---

## 🚀 Tecnologias Utilizadas

- **[React 19](https://react.dev/):** Biblioteca para construção da interface.
- **[Vite](https://vitejs.dev/):** Ferramenta de build rápida para o desenvolvimento.
- **[Tailwind CSS](https://tailwindcss.com/):** Framework CSS utilitário para um design responsivo e moderno.
- **[Firebase](https://firebase.google.com/):** 
  - **Firestore:** Banco de dados em tempo real para sincronização da lista.
  - **Authentication:** Controle de acesso seguro para o painel admin.
- **[Lucide React](https://lucide.dev/):** Conjunto de ícones minimalistas.
- **[QRCode.js](https://github.com/davidshimjs/qrcodejs):** Geração de QR Codes dinâmicos para o PIX.
- **[ImgBB API](https://api.imgbb.com/):** API para upload e hospedagem de imagens.

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Node.js (v18 ou superior)
- NPM ou Yarn

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/nome-do-repositorio.git
   cd nome-do-repositorio
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar o Firebase:**
   As credenciais do Firebase já estão configuradas no arquivo `src/App.jsx` para este projeto específico. Caso deseje usar seu próprio banco:
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
   - Ative o **Firestore Database** e o **Authentication** (E-mail/Senha).
   - Atualize a variável `firebaseConfig` em `src/App.jsx`.

4. **Configurar o ImgBB:**
   Obtenha uma chave de API gratuita no [ImgBB](https://api.imgbb.com/) e atualize a constante `IMGBB_API_KEY` no código.

5. **Rodar em ambiente de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173` no seu navegador.

---

## 🎨 Design e Estilo

O site foi desenhado com uma estética **Clean e Romântica**, utilizando:
- **Cores:** Tons de rosa suave (`pink-50` a `pink-800`) e branco, transmitindo delicadeza.
- **Tipografia:** Combinação de fontes Serifadas (títulos) e Sans-serif (corpo) para elegância e legibilidade.
- **Animações:** Transições suaves e efeitos de "hover" nos cards para uma experiência de usuário fluida.

---

## 📸 Personalização

O projeto conta com uma foto personalizada de **Ialy e Klaiven** no topo, reforçando o caráter pessoal e celebrativo do site.

---

Desenvolvido com ❤️ para marcar o início de uma nova jornada.
