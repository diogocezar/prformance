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
```

## Uso

Execute o script passando as datas de início e fim no formato YYYY-MM-DD:

```bash
npm start 2024-01-01 2024-02-01
```

Ou diretamente:

```bash
node index.js 2024-01-01 2024-02-01
```

### Scripts Pré-configurados

O projeto inclui alguns scripts úteis para análises comuns:

```bash
# Analisar o mês anterior (do primeiro dia ao primeiro dia do mês atual)
npm run last-month

# Analisar o mês atual (do primeiro dia até hoje)
npm run this-month

# Analisar um período personalizado
npm run analyze 2024-01-01 2024-02-01
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

Você pode ajustar os limites de concorrência modificando as constantes `MAX_CONCURRENT_REPOS` e `MAX_CONCURRENT_REQUESTS` no início do arquivo `index.js`.

## Limitações

- O script depende da API do GitHub, que possui limites de taxa (rate limits).
- Para organizações com muitos repositórios e atividades, o script pode levar algum tempo para executar, mesmo com as otimizações.
- O token de acesso ao GitHub deve ter permissões suficientes para acessar os dados necessários.
- A detecção de branches criadas é uma aproximação, pois a API do GitHub não fornece diretamente a data de criação da branch.

## Licença

ISC 