# Universal Sales Chat Engine 🚀
### Plataforma Conversacional de Vendas para Produtos Digitais

O **Universal Sales Chat Engine** é uma plataforma moderna, modular e 100% estática para automação de vendas interativas em formato de chat. O sistema permite reproduzir a experiência de um atendimento comercial guiado, onde o visitante navega por mensagens programadas, conhece produtos e bônus, ouve notas de voz do atendente, pode gravar e enviar suas próprias notas de áudio, seleciona pacotes de ofertas e é direcionado para checkouts externos seguros (como Hotmart).

Projetado sob o princípio da **independência total de produtos**: nenhum texto comercial, preço, imagem ou link de checkout fica fixo no código central. O mesmo motor é capaz de executar dezenas de produtos e idiomas diferentes apenas carregando arquivos JSON ou configurações criadas visualmente no painel administrativo.

---

## 🌟 Principais Recursos

- **Chat Conversacional Profissional:** Interface moderna inspirada em apps de mensagens (Messenger, Telegram, Nebula), com balões estilizados, indicador de digitação animado, avatar do atendente e dock responsivo.
- **Motor Universal de Nós (13 Tipos Fundamentais):**
  1. `message`: Mensagem de texto com suporte a Markdown (**negrito**, *itálico*, listas, links com `rel="noopener noreferrer"`).
  2. `image`: Imagem do produto com legenda e carregamento otimizado (`loading="lazy"`).
  3. `video`: Demonstração em vídeo (YouTube sem cookies ou player HTML5).
  4. `audio`: Mensagem de voz do atendente com player interativo, forma de onda animada, scrubber de progresso, controle de volume e fallback inteligente.
  5. `buttons`: Botões de resposta rápida e ramificação de caminhos.
  6. `product`: Card rico de apresentação do produto digital e destaques.
  7. `offer`: Tabela/Grid de pacotes (Esencial, Completo, VIP) com preços transparentes.
  8. `file`: Card para download de amostras gratuitas (ex: PDF de degustação).
  9. `checkout`: Ação direta com selo de segurança e garantia incondicional.
  10. `input`: Coleta amigável de informações não sensíveis (ex: primeiro nome do visitante).
  11. `condition`: Decisão condicional e ramificação baseada nas respostas coletadas.
  12. `delay`: Pausa e intervalo humanizado entre mensagens.
  13. `end`: Encerramento do fluxo com opção de reinício.
- **Suporte Completo a Recursos de Áudio:**
  - **Áudio do Sistema / Atendente:** Player multimídia personalizado com reprodução/pausa, barra de progresso ajustável (scrubber), controle de volume/mudo, tempo decorrido e duração total, além de tratamento de erro para áudios indisponíveis.
  - **Gravação de Áudio do Visitante (MediaRecorder API):** O visitante pode gravar mensagens de voz pelo microfone diretamente no dock do chat.
  - **Consentimento e Privacidade:** O microfone nunca é ativado automaticamente; a permissão é solicitada mediante ação explícita com aviso transparente de privacidade local.
  - **Player de Prévia & Descarte:** O usuário pode ouvir a prévia da gravação antes do envio, pausar, descartar ou enviar.
  - **Ciclo de Vida Limpo:** Todas as tracks de mídia são encerradas (`track.stop()`) e URLs de Blob são revogadas ao finalizar ou descartar.
- **Painel Administrativo Visual (`admin.html`):**
  - **Visão Geral & Métricas:** Monitoramento de sessões locais, cliques em botões, visualizações de ofertas e intenção de checkout.
  - **Gerenciador de Produtos:** Criação, duplicação e exclusão de campanhas digitais.
  - **Configurações Gerais:** Customização de cores, tipografia, velocidade de digitação e mensagens de fallback.
  - **Ofertas & Preços:** Edição de pacotes, valores, moedas (`MXN`, `BRL`, `USD`) e links de checkout.
  - **Editor Visual de Fluxos com Arrastar e Soltar (Drag & Drop):** Exibição das etapas na ordem cronológica real da conversa (Linha do Tempo #1, #2, #3...), paleta de blocos rápidos para arrastar e soltar, botões `+` de inserção rápida entre etapas com auto-link de caminhos, e modelos de funis de alta conversão prontos com 1 clique.
  - **Backups & JSON:** Exportação e importação de backups com validação automática antes da gravação.
- **Múltiplos Produtos por URL:** Selecione qualquer produto via parâmetro `?product=slug` (ex: `index.html?product=cocina-inteligente` ou `index.html?product=produtividade-ninja`).
- **Suporte Multi-idioma:** Preparado para Espanhol (`es-MX`), Português (`pt-BR`) e Inglês (`en-US`).
- **Hospedagem 100% Gratuita no GitHub Pages:** Sem backend obrigatório, sem dependências de compilação pesadas, caminhos estritamente relativos e sem APIs pagas.

---

## 📁 Estrutura do Projeto

```text
chatbot/
│
├── index.html                   # Interface do chat de atendimento e vendas
├── admin.html                   # Painel administrativo visual
├── README.md                    # Documentação do projeto
│
├── assets/
│   ├── images/                  # Logotipos e avatares em SVG vetorial
│   │   ├── logo.svg
│   │   ├── avatar-cocina.svg
│   │   ├── avatar-ninja.svg
│   │   └── default-avatar.svg
│   └── products/                # Capas de ebooks e ilustrações dos bônus
│       ├── cocina-portada.svg
│       ├── menu-30-dias.svg
│       ├── lista-compras.svg
│       ├── guia-sustitutos.svg
│       ├── muestra-5-recetas.svg
│       └── ninja-portada.svg
│
├── css/
│   ├── global.css               # Design system, CSS variables e reset acessível
│   ├── chat.css                 # Layout mobile-first, balões, cards, players de áudio e dock
│   └── admin.css                # Estilização do dashboard e editor visual de nós
│
├── js/
│   ├── app.js                   # Bootstrap do chat, resolução de slug e eventos
│   ├── i18n.js                  # Dicionário de traduções do sistema
│   │
│   ├── chat/
│   │   ├── engine.js            # Máquina de estados conversacional (Core Engine)
│   │   ├── renderer.js          # Renderizador acessível de mensagens, áudio e cards
│   │   ├── interactions.js      # Gerenciador de cliques, teclado, gravação de voz e fallback
│   │   └── navigation.js        # Histórico, navegação e persistência de sessão
│   │
│   ├── admin/
│   │   ├── app.js               # Controlador do painel admin
│   │   ├── dashboard.js         # Métricas e visualização de funil
│   │   ├── product-manager.js   # CRUD e duplicador de produtos
│   │   ├── config-editor.js     # Configuração de temas e branding
│   │   ├── offer-manager.js     # Gerenciamento de preços e pacotes
│   │   └── flow-editor.js       # Editor visual em cards e inspetor de nós
│   │
│   ├── services/
│   │   ├── storage.js           # Gerenciamento de LocalStorage por namespace e resiliência
│   │   ├── analytics.js         # Logger de eventos e cálculo de taxas locais
│   │   ├── checkout.js          # Adaptador seguro para Hotmart e URLs externas
│   │   ├── sound.js             # Sintetizador Web Audio API para notificações discretas
│   │   └── voice-recorder.js    # Serviço de gravação de áudio do visitante via MediaRecorder
│   │
│   └── utils/
│       ├── validation.js        # Validação de esquemas e integridade do grafo
│       └── helpers.js           # Formatadores, sanitizadores de URL, markdown e utilitários
│
├── data/
│   ├── registry.json            # Registro de produtos disponíveis
│   └── products/
│       ├── cocina-inteligente.json    # Produto demonstrativo 1 (es-MX)
│       └── produtividade-ninja.json   # Produto demonstrativo 2 (pt-BR)
│
└── tests/
    ├── test-suite.js            # Bateria automatizada de 27 testes unitários e de integração
    └── runner.html              # Interface web interativa para execução dos testes
```

---

## 🚀 Como Executar Localmente

Como a aplicação utiliza módulos ES6 nativos (`import`/`export`), basta servi-la em um servidor web local simples (navegadores modernos bloqueiam requisições `fetch` via protocolo `file:///`).

### Opção 1: Usando Python 3 (Recomendado)
Abra o terminal na pasta do projeto e execute:
```bash
python3 -m http.server 8000
```
Em seguida, abra no navegador:
- **Chat de Vendas:** [http://localhost:8000/index.html](http://localhost:8000/index.html)
- **Painel Administrativo:** [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- **Bateria de Testes:** [http://localhost:8000/tests/runner.html](http://localhost:8000/tests/runner.html)

### Opção 2: Usando Node.js
```bash
npx serve .
```

---

## 🧪 Testes Automatizados

O projeto inclui uma suíte completa de **27 testes automatizados** cobrindo:
1. **Motor de Conversas:** Interpolação de variáveis, tratamento de chaves ausentes, detecção de nós inexistentes, validação de botões, nós de condição (ramos verdadeiro e falso), histórico de navegação e integridade dos 13 tipos de nós.
2. **Produtos & Multi-tenancy:** Validação de esquemas, validação rigorosa de slugs e isolamento absoluto de armazenamento entre produtos.
3. **Checkout:** Injeção de parâmetros de rastreamento (`sck`), preservação de query parameters e bloqueio rigoroso de protocolos perigosos (`javascript:`).
4. **Áudio:** Validação de nós do tipo `audio` com `src` e `audioUrl`, formatação de duração (MM:SS), inicialização do `VoiceRecorderService`, limites de gravação e liberação de recursos de memória.
5. **Segurança:** Neutralização de vetores de XSS via `escapeHtml()`, sanitização de URLs bloqueando `javascript:`, `data:` e `vbscript:`, proteção contra links maliciosos em Markdown, resiliência contra JSON corrompido no LocalStorage e validação de importação de backups.
6. **Interface & Acessibilidade:** Formatação monetária multi-moeda (`MXN`, `BRL`, `USD`), resolução de traduções i18n para os 3 idiomas suportados e geração de identificadores únicos.

### Executar via Terminal:
```bash
node tests/test-suite.js
```
*Saída esperada: `--- Test Suite Concluída: 27 Passando, 0 Falhas (Total: 27) ---`*

### Executar pelo Navegador:
Acesse `tests/runner.html` para ver a lista de testes em tempo real com detalhes de cada verificação.

---

## 🔒 Segurança e Privacidade

- **Proteção contra XSS:** Conteúdo dinâmico inserido pelos visitantes e nós de mensagens são sanitizados por `escapeHtml` e por renderizador seguro de Markdown.
- **Sanitização de URLs:** Protocolos `javascript:`, `data:` e `vbscript:` são bloqueados em links, botões de checkout e elementos de mídia.
- **Gravação de Áudio Ética e Local:** O microfone nunca é acionado sem intervenção intencional do usuário. Os dados capturados geram um Blob local no navegador, permitindo audição prévia e descarte imediato. Nenhuma gravação é transferida para servidores terceiros sem configuração explícita de backend.
- **Isolamento de Dados:** Cada produto possui namespace exclusivo no `LocalStorage` (`usc_v1_{slug}_...`), impedindo colisão ou contaminação de estado entre campanhas distintas.
- **Conformidade de Checkout:** A plataforma não coleta nem armazena números de cartão ou credenciais bancárias; todo o fluxo de conversão direciona de forma segura para gateways certificados via `rel="noopener noreferrer"`.

---

## 🌐 Publicação no GitHub Pages (Passo a Passo)

A aplicação foi rigorosamente construída com **caminhos relativos** e **zero dependências de servidor**, sendo 100% compatível com a hospedagem estática e gratuita do GitHub Pages.

1. **Crie um repositório no GitHub** (ex: `meu-chat-vendas`).
2. **Suba os arquivos do projeto:**
   ```bash
   git init
   git add .
   git commit -m "feat: Universal Sales Chat Engine release v1.0"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/meu-chat-vendas.git
   git push -u origin main
   ```
3. **Ative o GitHub Pages:**
   - No GitHub, acesse seu repositório e vá em **Settings** > **Pages**.
   - Em **Branch**, selecione `main` e a pasta `/(root)`.
   - Clique em **Save**.
4. **Pronto!** Em cerca de 1 a 2 minutos sua aplicação estará no ar no endereço:
   - `https://SEU-USUARIO.github.io/meu-chat-vendas/index.html`
   - Para um produto específico: `https://SEU-USUARIO.github.io/meu-chat-vendas/index.html?product=cocina-inteligente`
   - Painel administrativo: `https://SEU-USUARIO.github.io/meu-chat-vendas/admin.html`

---

## ⚠️ Limitações da Versão Estática

- **Métricas:** Os contadores do dashboard admin registram as sessões deste dispositivo/navegador no `LocalStorage`. Em uma arquitetura sem backend, para agregar dados globais de múltiplos visitantes utilize adaptadores de webhooks ou scripts como Meta Pixel / Google Analytics no `index.html`.
- **Autenticação:** O painel administrativo é uma ferramenta estática local para o gestor configurar e testar. Não há autenticação de servidor em uma hospedagem 100% estática.
- **Processamento de Pagamento:** Por segurança e conformidade com a LGPD e PCI-DSS, a plataforma delega a transação financeira diretamente ao gateway externo credenciado (Hotmart).

---

## 📄 Licença
Código aberto, modular e livre para uso comercial e adaptações.
