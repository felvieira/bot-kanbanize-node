# Instruções para Configuração do Projeto

Este projeto utiliza a integração com o Telegram Bot API e a API do Kanbanize para registrar o tempo de trabalho em cartões específicos. Antes de executar o projeto, você precisará configurar as seguintes credenciais:

## Obtendo o Bot Token do Telegram

1. Abra o Telegram e pesquise por **BotFather**.
2. Inicie uma conversa com o **BotFather**.
3. Use o comando `/newbot` para criar um novo bot.
4. Siga as instruções para escolher um nome e um username para o seu bot.
5. O **BotFather** irá gerar um Bot Token para o seu bot. Copie esse token.

## Obtendo o Chat ID do Telegram

1. Adicione o bot recém-criado ao seu Telegram.
2. Envie uma mensagem para o bot.
3. Vá para o seguinte URL no seu navegador: `https://api.telegram.org/bot<YourBotToken>/getUpdates`, substituindo `<YourBotToken>` pelo token do seu bot.
4. Você receberá um JSON contendo informações sobre as mensagens enviadas para o seu bot. Procure pelo campo `chat` dentro de `message` para encontrar o `id`. Esse é o seu Chat ID.

## Obtendo a API Key e o User ID do Kanbanize

1. Faça login na sua conta do Kanbanize.
2. Clique no seu nome de usuário no canto superior direito e selecione "API & Webhooks".
3. Role para baixo até encontrar a seção "API Access" e copie a sua API Key.
4. Selecione "Users" no menu principal.
5. Encontre o seu usuário na lista e copie o User ID associado a ele.

## Configurando o Projeto

1. Clone este repositório para o seu ambiente local.
2. Crie um arquivo `.env` na raiz do projeto.
3. Adicione as seguintes linhas ao arquivo `.env`:

BOT_TOKEN=<seu_bot_token_aqui>
CHAT_ID=<seu_chat_id_aqui>
API_KEY=<sua_api_key_do_kanbanize_aqui>
USER_ID=<seu_user_id_do_kanbanize_aqui>


4. Substitua `<seu_bot_token_aqui>` pelo Bot Token do Telegram.
5. Substitua `<seu_chat_id_aqui>` pelo Chat ID do Telegram.
6. Substitua `<sua_api_key_do_kanbanize_aqui>` pela API Key do Kanbanize.
7. Substitua `<seu_user_id_do_kanbanize_aqui>` pelo User ID do Kanbanize.

## Executando o Projeto

Após configurar as credenciais no arquivo `.env`, você pode executar o projeto normalmente.

Isso iniciará o seu bot Telegram e permitirá que ele interaja com o seu Chat ID. Além disso, ele será capaz de registrar o tempo de trabalho no Kanbanize.


## Deploy no Heroku

### Instalação do Heroku CLI

#### Windows

1. **Download:** Baixe o instalador do Heroku CLI para Windows do site oficial [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install).
2. **Instalação:** Execute o arquivo baixado e siga as instruções na tela para instalar o Heroku CLI.

#### macOS

1. **Abrir Terminal:** Encontre o Terminal em `Aplicações > Utilitários` ou busque por ele usando o Spotlight.
2. **Instalar Homebrew:** Se ainda não tiver o Homebrew instalado, execute o seguinte comando no Terminal:
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
3. **Instalar o Heroku CLI usando o Homebrew:**
    ```bash
    brew tap heroku/brew && brew install heroku
    ```

#### Linux

1. **Usando Snap (recomendado para distros que suportam Snap):**
    ```bash
    sudo snap install --classic heroku
    ```
2. **Instalação Manual:**
    ```bash
    curl https://cli-assets.heroku.com/install.sh | sh
    ```

### Verificar a Instalação

Verifique se o Heroku CLI foi instalado corretamente:
```bash
heroku --version
```

### Login no Heroku

1. **Login via browser:**
    ```bash
    heroku login
    ```
2. **Login via terminal (sem GUI):**
    ```bash
    heroku login -i
    ```

### Criar e Configurar a Aplicação

1. **Criar uma nova aplicação no Heroku:**
    ```bash
    heroku create nome-da-sua-aplicacao
    ```
2. **Configurar variáveis de ambiente:**
    ```bash
    heroku config:set BOT_TOKEN=seu_token_de_bot_aqui API_KEY=sua_api_key_aqui USER_ID=seu_user_id CHAT_ID=seu_chat_id
    ```

### Deploy da Aplicação

1. **Empurre o código para o Heroku:**
    ```bash
    git push heroku master
    ```

### Ativar o Worker

Por padrão, o Heroku não inicia automaticamente o worker. Ative-o com:
```bash
heroku ps:scale worker=1
```

### Verificar os Logs

Para verificar se tudo está funcionando como esperado, visualize os logs:
```bash
heroku logs --tail
```
