Crie um projeto em Node.js que funcione como uma POC para medir a performance dos desenvolvedores de uma organização no GitHub.

Objetivo

O sistema deve analisar as contribuições dos colaboradores dentro de um período definido e gerar um score baseado nas seguintes métricas:
	•	Commits enviados
	•	Pull Requests abertas
	•	Pull Requests revisadas (Code Reviews)
	•	Issues abertas
	•	Issues concluídas

Cada uma dessas ações terá um peso específico para calcular o score do desenvolvedor.

⸻

Requisitos da POC
	•	Entrada: Um intervalo de datas (exemplo: 2024-01-01 a 2024-02-01).
	•	Saída: Um JSON com a lista de desenvolvedores, ordenada pelo score, incluindo detalhes de suas contribuições.
	•	O sistema deve se conectar ao GitHub utilizando variáveis de ambiente (.env) para armazenar tokens de acesso.
	•	Não é necessário frontend.
	•	Não é necessário autenticação de usuário.

⸻

Fórmula do Score

Cada tipo de contribuição terá um peso específico na pontuação.
	•	Commits enviados: +2 pontos cada
	•	Pull Requests abertas: +5 pontos cada
	•	Pull Requests revisadas (Code Reviews): +3 pontos cada
	•	Issues abertas: +1 ponto cada
	•	Issues concluídas: +4 pontos cada

Cálculo do Score Total

Para cada desenvolvedor, o score será calculado como:

Score = (Commits * 2) + (PRs Abertas * 5) + (PRs Revisadas * 3) + (Issues Abertas * 1) + (Issues Concluídas * 4)

Formato esperado do JSON de saída
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
        "commits": 10,
        "pull_requests_opened": 4,
        "pull_requests_reviewed": 6,
        "issues_opened": 2,
        "issues_closed": 3
      }
    },
    {
      "username": "dev2",
      "score": 98,
      "contributions": {
        "commits": 7,
        "pull_requests_opened": 3,
        "pull_requests_reviewed": 5,
        "issues_opened": 1,
        "issues_closed": 2
      }
    }
  ]
}
```

Passos para a implementação
	1.	Criar um script em Node.js para buscar dados via GitHub API.
	2.	Utilizar dotenv para gerenciar as credenciais da API.
	3.	Implementar a fórmula do score baseada nas contribuições.
	4.	Ordenar os resultados pelo score total.
	5.	Retornar os dados no formato JSON.


  ---

  Preciso que você melhore a performance do script, ele demora muito pois tem vários repositórios que precisa analisar.

  - Faça as chamadas de forma assíncrona;

---

Para cada ítem do json, retorne um link para que eu possa acessar as ocorrências.

Por exemplo:

```json
    {
      "username": "EnioAmarantes",
      "score": 4,
      "contributions": {
        "commits": {
          "number": 2,
          "items": [
            "url-commit-1",
            "url-commit-2"
          ]
        }
      }
    }
```

---

Vamos adicionar mais algumas métricas:

1. Comentários em PRs (+2);
2. Branches criadas (+1);

---


- Separe as funções que estão em index.js em arquivos;
- Melhore a organização de código;
- Crie um servidor em Express para retornar o json, mediante ao envio do range de datas;

---

1. Commits revertidos (-2);
2. PR mergeada sem solicitações de mudanças (+5)