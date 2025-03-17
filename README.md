# PRFormance

Uma POC (Proof of Concept) para medir a performance dos desenvolvedores de uma organização no GitHub.

## Objetivo

O sistema analisa as contribuições dos colaboradores dentro de um período definido e gera um score baseado nas seguintes métricas:
- Commits enviados
- Pull Requests abertas
- Pull Requests revisadas (Code Reviews)
- Issues abertas
- Issues concluídas
- Comentários em PRs
- Branches criadas

Cada uma dessas ações tem um peso específico para calcular o score do desenvolvedor.

## Fórmula do Score

- Commits enviados: +2 pontos cada
- Pull Requests abertas: +5 pontos cada
- Pull Requests revisadas (Code Reviews): +3 pontos cada
- Issues abertas: +1 ponto cada
- Issues concluídas: +4 pontos cada
- Comentários em PRs: +2 pontos cada
- Branches criadas: +1 ponto cada

## Requisitos

- Node.js (versão 14 ou superior)
- Token de acesso ao GitHub com permissões para acessar os repositórios da organização

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/prformance.git
cd prformance
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
```
GITHUB_TOKEN=seu_token_do_github
GITHUB_ORG=nome_da_sua_organizacao
PORT=3000 # Opcional, padrão é 3000
```

Você pode copiar o arquivo `.env.example` e ajustar conforme necessário:
```bash
cp .env.example .env
```

### Configurações Avançadas

Além das configurações básicas, você pode personalizar o comportamento do sistema através das seguintes variáveis de ambiente:

#### Configurações do Servidor
- `PORT`: Porta em que o servidor será executado (padrão: 3000)

#### Configurações de Cache
- `CACHE_EXPIRATION_TIME`: Tempo de expiração do cache em milissegundos (padrão: 3600000, ou seja, 1 hora)
- `ENABLE_CACHE`: Habilitar ou desabilitar o cache para requisições à API do GitHub (padrão: true)

#### Configurações de Limites de Taxa (Rate Limit)
- `RATE_LIMIT_CHECK_INTERVAL`: Intervalo mínimo entre verificações de limite de taxa em milissegundos (padrão: 60000, ou seja, 1 minuto)
- `RATE_LIMIT_MAX_WAIT_TIME`: Tempo máximo de espera para reset de limite de taxa em milissegundos (padrão: 300000, ou seja, 5 minutos)
- `RATE_LIMIT_BATCH_SIZE`: Tamanho do lote para processamento de branches (padrão: 5)
- `RATE_LIMIT_BATCH_INTERVAL`: Intervalo entre lotes em milissegundos (padrão: 1000, ou seja, 1 segundo)

Estas configurações ajudam a lidar com os limites de taxa da API do GitHub e otimizar o desempenho do sistema.

## Lidando com Limites de Taxa da API do GitHub

A API do GitHub possui limites de taxa (rate limits) que restringem o número de requisições que podem ser feitas em um determinado período. Para usuários não autenticados, o limite é de 60 requisições por hora. Para usuários autenticados com um token pessoal, o limite é de 5.000 requisições por hora.

Este projeto implementa várias estratégias para lidar com esses limites:

1. **Sistema de Cache**: Armazena resultados de requisições para reduzir o número de chamadas à API.
   - Configure o tempo de expiração do cache com `CACHE_EXPIRATION_TIME`
   - Habilite ou desabilite o cache com `ENABLE_CACHE`

2. **Verificação de Limites de Taxa**: Verifica proativamente os limites de taxa antes de fazer requisições.
   - O sistema consulta a API de limites de taxa do GitHub em intervalos configuráveis
   - Configure o intervalo de verificação com `RATE_LIMIT_CHECK_INTERVAL`

3. **Processamento em Lotes**: Processa dados em lotes menores para evitar atingir os limites rapidamente.
   - Configure o tamanho do lote com `RATE_LIMIT_BATCH_SIZE`
   - Configure o intervalo entre lotes com `RATE_LIMIT_BATCH_INTERVAL`

4. **Espera Automática**: Quando os limites são atingidos, o sistema aguarda automaticamente até que sejam resetados.
   - Configure o tempo máximo de espera com `RATE_LIMIT_MAX_WAIT_TIME`

Se você encontrar o erro "Request quota exhausted for request GET /orgs/{org}/repos", isso significa que você atingiu o limite de requisições. Algumas soluções:

- Verifique se você configurou corretamente o token do GitHub no arquivo `.env`
- Aumente os valores de cache para reduzir o número de requisições
- Reduza o escopo da análise (menos repositórios ou período menor)
- Aguarde até que o limite seja resetado (geralmente 1 hora)

## Uso

### Como API REST

Execute o servidor:

```bash
npm start
# ou
npm run server
```

Para desenvolvimento com reinicialização automática:

```bash
npm run dev
```

#### Endpoints disponíveis:

- **GET /** - Página inicial com informações sobre a API
- **GET /api/developers/performance** - Obtém a performance dos desenvolvedores
  - Parâmetros de consulta:
    - `startDate`: Data de início no formato YYYY-MM-DD (obrigatório)
    - `endDate`: Data de fim no formato YYYY-MM-DD (obrigatório)
  - Exemplo: `/api/developers/performance?startDate=2024-01-01&endDate=2024-02-01`
- **GET /visualization** - Interface web para visualização dos dados de performance
  - Parâmetros de consulta (opcionais):
    - `startDate`: Data de início no formato YYYY-MM-DD
    - `endDate`: Data de fim no formato YYYY-MM-DD
  - Exemplo: `/visualization?startDate=2024-01-01&endDate=2024-02-01`
  - Se não forem fornecidos parâmetros, a visualização mostrará os dados do mês atual

### Como CLI

Execute o script passando as datas de início e fim no formato YYYY-MM-DD:

```bash
npm run analyze 2024-01-01 2024-02-01
# ou diretamente
node src/index.js 2024-01-01 2024-02-01
```

### Scripts Pré-configurados

O projeto inclui alguns scripts úteis para análises comuns:

```bash
# Analisar o mês anterior (do primeiro dia ao primeiro dia do mês atual)
npm run last-month

# Analisar o mês atual (do primeiro dia até hoje)
npm run this-month
```

## Testes

O projeto inclui arquivos para testar a API usando a extensão REST Client para VS Code:

1. Instale a extensão REST Client no VS Code
2. Abra os arquivos `.http` na pasta `src/tests`
3. Clique em "Send Request" acima de cada requisição para executá-la

Para mais detalhes, consulte o [README dos testes](src/tests/README.md).

## Estrutura do Projeto

```
prformance/
├── index.js                # Ponto de entrada simplificado
├── src/
│   ├── index.js            # Ponto de entrada principal
│   ├── config.js           # Configurações do aplicativo
│   ├── server.js           # Configuração do servidor Express
│   ├── controllers/        # Controladores da API
│   │   └── developerController.js
│   ├── routes/             # Rotas da API
│   │   └── developerRoutes.js
│   ├── services/           # Serviços de negócio
│   │   ├── branchService.js
│   │   ├── commitService.js
│   │   ├── developerService.js
│   │   ├── issueService.js
│   │   ├── pullRequestService.js
│   │   └── repositoryService.js
│   ├── tests/              # Testes da API
│   │   ├── performance.http # Testes HTTP para a API
│   │   └── http-client.env.json # Configurações de ambiente
│   ├── views/              # Arquivos de visualização
│   │   └── performance.html # Interface web para visualização dos dados
│   └── utils/              # Utilitários
│       └── githubClient.js
```

## Saída

O script gera um JSON com a lista de desenvolvedores, ordenada pelo score, incluindo detalhes de suas contribuições com links para cada item:

```json
{
  "range": {
    "start": "2024-01-01",
    "end": "2024-02-01"
  },
  "developers": [
    {
      "username": "dev1",
      "score": 135,
      "contributions": {
        "commits": {
          "number": 10,
          "items": [
            {
              "url": "https://github.com/org/repo/commit/abc123",
              "sha": "abc123",
              "message": "Fix bug in login",
              "repository": "repo-name",
              "date": "2024-01-15T10:30:00Z"
            },
            // ... outros commits
          ]
        },
        "pull_requests_opened": {
          "number": 4,
          "items": [
            {
              "url": "https://github.com/org/repo/pull/42",
              "number": 42,
              "title": "Add new feature",
              "repository": "repo-name",
              "state": "merged",
              "created_at": "2024-01-10T09:00:00Z"
            },
            // ... outros PRs
          ]
        },
        "pull_requests_reviewed": {
          "number": 6,
          "items": [
            {
              "url": "https://github.com/org/repo/pull/45",
              "pr_url": "https://github.com/org/repo/pull/45",
              "pr_number": 45,
              "pr_title": "Fix security issue",
              "repository": "repo-name",
              "state": "approved",
              "submitted_at": "2024-01-20T14:30:00Z"
            },
            // ... outras reviews
          ]
        },
        "issues_opened": {
          "number": 2,
          "items": [
            {
              "url": "https://github.com/org/repo/issues/50",
              "number": 50,
              "title": "Bug in login page",
              "repository": "repo-name",
              "state": "open",
              "created_at": "2024-01-05T11:20:00Z"
            },
            // ... outras issues abertas
          ]
        },
        "issues_closed": {
          "number": 3,
          "items": [
            {
              "url": "https://github.com/org/repo/issues/48",
              "number": 48,
              "title": "Update documentation",
              "repository": "repo-name",
              "closed_at": "2024-01-25T16:45:00Z"
            },
            // ... outras issues fechadas
          ]
        },
        "pr_comments": {
          "number": 8,
          "items": [
            {
              "url": "https://github.com/org/repo/pull/42#issuecomment-1234567",
              "pr_url": "https://github.com/org/repo/pull/42",
              "pr_number": 42,
              "pr_title": "Add new feature",
              "repository": "repo-name",
              "body": "Ótimo trabalho! Apenas uma sugestão...",
              "created_at": "2024-01-12T14:30:00Z"
            },
            // ... outros comentários
          ]
        },
        "branches_created": {
          "number": 3,
          "items": [
            {
              "name": "feature/login-improvement",
              "repository": "repo-name",
              "created_at": "2024-01-05T09:15:00Z",
              "commit_url": "https://github.com/org/repo/commit/def456",
              "commit_sha": "def456"
            },
            // ... outras branches
          ]
        }
      }
    },
    // ... outros desenvolvedores
  ]
}
```

## Otimização de Performance

O script foi otimizado para lidar com organizações que possuem muitos repositórios:

- Processamento paralelo de repositórios (10 repositórios simultaneamente por padrão)
- Requisições assíncronas para buscar commits, pull requests e issues em paralelo
- Processamento em lotes para reviews de pull requests (5 PRs simultaneamente por padrão)
- Paginação eficiente para buscar todos os dados da API do GitHub

Você pode ajustar os limites de concorrência modificando as constantes no arquivo `src/config.js`.

## Limitações

- O script depende da API do GitHub, que possui limites de taxa (rate limits).
- Para organizações com muitos repositórios e atividades, o script pode levar algum tempo para executar, mesmo com as otimizações.
- O token de acesso ao GitHub deve ter permissões suficientes para acessar os dados necessários.
- A detecção de branches criadas é uma aproximação, pois a API do GitHub não fornece diretamente a data de criação da branch.

## Licença

ISC 