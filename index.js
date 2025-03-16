require("dotenv").config();
const { Octokit } = require("octokit");

// Configuração do Octokit com o token do GitHub
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Organização do GitHub
const org = process.env.GITHUB_ORG;

// Pesos para cálculo do score
const WEIGHTS = {
  commits: 2,
  pull_requests_opened: 5,
  pull_requests_reviewed: 3,
  issues_opened: 1,
  issues_closed: 4,
  pr_comments: 2,
  branches_created: 1,
};

// Configuração de concorrência
const MAX_CONCURRENT_REPOS = 10; // Número máximo de repositórios processados simultaneamente
const MAX_CONCURRENT_REQUESTS = 5; // Número máximo de requisições por repositório

/**
 * Função principal que busca os dados e calcula os scores
 * @param {string} startDate - Data de início no formato YYYY-MM-DD
 * @param {string} endDate - Data de fim no formato YYYY-MM-DD
 * @returns {Object} - JSON com os resultados
 */
async function calculateDeveloperPerformance(startDate, endDate) {
  try {
    // Validar datas
    if (!startDate || !endDate) {
      throw new Error("As datas de início e fim são obrigatórias");
    }

    // Formatar datas para o formato ISO
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Formato de data inválido. Use YYYY-MM-DD");
    }

    if (start > end) {
      throw new Error("A data de início deve ser anterior à data de fim");
    }

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    console.log(`Buscando dados de ${startDate} até ${endDate}...`);

    // Buscar repositórios da organização
    const repos = await getOrganizationRepos();
    console.log(
      `Encontrados ${repos.length} repositórios na organização ${org}`
    );

    // Objeto para armazenar as contribuições de cada desenvolvedor
    const developers = {};

    // Processar repositórios em paralelo com limite de concorrência
    await processRepositoriesInBatches(repos, startIso, endIso, developers);

    // Calcular o score para cada desenvolvedor
    calculateScores(developers);

    // Ordenar desenvolvedores pelo score
    const sortedDevelopers = Object.values(developers)
      .sort((a, b) => b.score - a.score)
      .map((dev) => ({
        username: dev.username,
        score: dev.score,
        contributions: {
          commits: {
            number: dev.contributions.commits.length,
            items: dev.contributions.commits,
          },
          pull_requests_opened: {
            number: dev.contributions.pull_requests_opened.length,
            items: dev.contributions.pull_requests_opened,
          },
          pull_requests_reviewed: {
            number: dev.contributions.pull_requests_reviewed.length,
            items: dev.contributions.pull_requests_reviewed,
          },
          issues_opened: {
            number: dev.contributions.issues_opened.length,
            items: dev.contributions.issues_opened,
          },
          issues_closed: {
            number: dev.contributions.issues_closed.length,
            items: dev.contributions.issues_closed,
          },
          pr_comments: {
            number: dev.contributions.pr_comments.length,
            items: dev.contributions.pr_comments,
          },
          branches_created: {
            number: dev.contributions.branches_created.length,
            items: dev.contributions.branches_created,
          },
        },
      }));

    // Retornar o resultado no formato especificado
    return {
      range: {
        start: startDate,
        end: endDate,
      },
      developers: sortedDevelopers,
    };
  } catch (error) {
    console.error("Erro ao calcular performance:", error.message);
    throw error;
  }
}

/**
 * Processa repositórios em lotes para limitar a concorrência
 * @param {Array} repos - Lista de repositórios
 * @param {string} startIso - Data de início em formato ISO
 * @param {string} endIso - Data de fim em formato ISO
 * @param {Object} developers - Objeto para armazenar dados dos desenvolvedores
 */
async function processRepositoriesInBatches(
  repos,
  startIso,
  endIso,
  developers
) {
  // Dividir os repositórios em lotes para processamento
  for (let i = 0; i < repos.length; i += MAX_CONCURRENT_REPOS) {
    const batch = repos.slice(i, i + MAX_CONCURRENT_REPOS);
    console.log(
      `Processando lote de ${batch.length} repositórios (${i + 1}-${Math.min(
        i + MAX_CONCURRENT_REPOS,
        repos.length
      )} de ${repos.length})...`
    );

    // Processar cada lote de repositórios em paralelo
    await Promise.all(
      batch.map((repo) =>
        processRepository(repo.name, startIso, endIso, developers)
      )
    );
  }
}

/**
 * Processa um único repositório buscando todas as contribuições
 * @param {string} repoName - Nome do repositório
 * @param {string} startIso - Data de início em formato ISO
 * @param {string} endIso - Data de fim em formato ISO
 * @param {Object} developers - Objeto para armazenar dados dos desenvolvedores
 */
async function processRepository(repoName, startIso, endIso, developers) {
  try {
    console.log(`Processando repositório: ${repoName}`);

    // Buscar todos os dados em paralelo
    const [commits, pullRequests, issues, branches] = await Promise.all([
      getCommits(repoName, startIso, endIso),
      getPullRequests(repoName, startIso, endIso),
      getIssues(repoName, startIso, endIso),
      getBranches(repoName, startIso, endIso),
    ]);

    // Buscar reviews e comentários após ter os PRs
    const [reviews, prComments] = await Promise.all([
      getPullRequestReviews(repoName, pullRequests, startIso, endIso),
      getPullRequestComments(repoName, pullRequests, startIso, endIso),
    ]);

    // Processar os dados obtidos
    processCommits(repoName, commits, developers);
    processPullRequests(repoName, pullRequests, developers);
    processReviews(repoName, reviews, developers);
    processIssues(repoName, issues, developers);
    processPRComments(repoName, prComments, developers);
    processBranches(repoName, branches, developers);

    console.log(`Concluído repositório: ${repoName}`);
  } catch (error) {
    console.error(`Erro ao processar repositório ${repoName}:`, error.message);
  }
}

/**
 * Busca os repositórios da organização
 * @returns {Array} - Lista de repositórios
 */
async function getOrganizationRepos() {
  try {
    const repos = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const { data } = await octokit.rest.repos.listForOrg({
        org,
        per_page: 100,
        page,
      });

      repos.push(...data);
      hasNextPage = data.length === 100;
      page++;
    }

    return repos;
  } catch (error) {
    console.error("Erro ao buscar repositórios:", error.message);
    return [];
  }
}

/**
 * Busca os commits de um repositório
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de commits
 */
async function getCommits(repo, since, until) {
  try {
    const commits = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const { data } = await octokit.rest.repos.listCommits({
        owner: org,
        repo,
        since,
        until,
        per_page: 100,
        page,
      });

      commits.push(...data);
      hasNextPage = data.length === 100;
      page++;
    }

    return commits;
  } catch (error) {
    console.error(`Erro ao buscar commits para ${repo}:`, error.message);
    return [];
  }
}

/**
 * Busca os pull requests de um repositório
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de pull requests
 */
async function getPullRequests(repo, since, until) {
  try {
    const pullRequests = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const { data } = await octokit.rest.pulls.list({
        owner: org,
        repo,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: 100,
        page,
      });

      // Filtrar PRs pelo período
      const filteredPRs = data.filter((pr) => {
        const createdAt = new Date(pr.created_at);
        return createdAt >= new Date(since) && createdAt <= new Date(until);
      });

      if (filteredPRs.length === 0) {
        hasNextPage = false;
      } else {
        pullRequests.push(...filteredPRs);
        hasNextPage = data.length === 100;
        page++;
      }
    }

    return pullRequests;
  } catch (error) {
    console.error(`Erro ao buscar pull requests para ${repo}:`, error.message);
    return [];
  }
}

/**
 * Busca as reviews de pull requests de um repositório
 * @param {string} repo - Nome do repositório
 * @param {Array} pullRequests - Lista de PRs já obtida
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de reviews
 */
async function getPullRequestReviews(repo, pullRequests, since, until) {
  try {
    const reviews = [];

    // Processar PRs em lotes para limitar concorrência
    for (let i = 0; i < pullRequests.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = pullRequests.slice(i, i + MAX_CONCURRENT_REQUESTS);

      // Buscar reviews para cada PR em paralelo
      const batchReviews = await Promise.all(
        batch.map((pr) => getReviewsForPR(repo, pr, since, until))
      );

      // Adicionar todas as reviews encontradas
      batchReviews.forEach((prReviews) => {
        reviews.push(...prReviews);
      });
    }

    return reviews;
  } catch (error) {
    console.error(`Erro ao buscar reviews para ${repo}:`, error.message);
    return [];
  }
}

/**
 * Busca comentários em pull requests de um repositório
 * @param {string} repo - Nome do repositório
 * @param {Array} pullRequests - Lista de PRs já obtida
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de comentários
 */
async function getPullRequestComments(repo, pullRequests, since, until) {
  try {
    const comments = [];

    // Processar PRs em lotes para limitar concorrência
    for (let i = 0; i < pullRequests.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = pullRequests.slice(i, i + MAX_CONCURRENT_REQUESTS);

      // Buscar comentários para cada PR em paralelo
      const batchComments = await Promise.all(
        batch.map((pr) => getCommentsForPR(repo, pr, since, until))
      );

      // Adicionar todos os comentários encontrados
      batchComments.forEach((prComments) => {
        comments.push(...prComments);
      });
    }

    return comments;
  } catch (error) {
    console.error(`Erro ao buscar comentários para ${repo}:`, error.message);
    return [];
  }
}

/**
 * Busca comentários para um PR específico
 * @param {string} repo - Nome do repositório
 * @param {Object} pr - Objeto do PR
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de comentários para o PR
 */
async function getCommentsForPR(repo, pr, since, until) {
  try {
    // Buscar comentários regulares do PR
    const { data: issueComments } = await octokit.rest.issues.listComments({
      owner: org,
      repo,
      issue_number: pr.number,
      per_page: 100,
    });

    // Buscar comentários de revisão do PR
    const { data: reviewComments } =
      await octokit.rest.pulls.listReviewComments({
        owner: org,
        repo,
        pull_number: pr.number,
        per_page: 100,
      });

    // Combinar e filtrar comentários pelo período
    const allComments = [...issueComments, ...reviewComments]
      .filter((comment) => {
        const createdAt = new Date(comment.created_at);
        return createdAt >= new Date(since) && createdAt <= new Date(until);
      })
      .map((comment) => {
        // Adicionar informações do PR ao comentário
        comment.pull_request_url = pr.html_url;
        comment.pull_request_number = pr.number;
        comment.pull_request_title = pr.title;
        return comment;
      });

    return allComments;
  } catch (error) {
    console.error(
      `Erro ao buscar comentários para PR #${pr.number}:`,
      error.message
    );
    return [];
  }
}

/**
 * Busca branches criadas em um repositório no período especificado
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de branches
 */
async function getBranches(repo, since, until) {
  try {
    // Buscar todas as branches
    const { data: branches } = await octokit.rest.repos.listBranches({
      owner: org,
      repo,
      per_page: 100,
    });

    // Para cada branch, precisamos verificar quando foi criada
    // Infelizmente, a API do GitHub não fornece diretamente a data de criação da branch
    // Vamos usar o commit mais antigo da branch como aproximação
    const branchesWithDates = await Promise.all(
      branches.slice(0, 30).map(async (branch) => {
        // Limitando a 30 branches para evitar muitas requisições
        try {
          // Obter o commit mais antigo da branch (aproximação da data de criação)
          const { data: commits } = await octokit.rest.repos.listCommits({
            owner: org,
            repo,
            sha: branch.name,
            per_page: 1,
            page: 1,
          });

          if (commits.length > 0) {
            const createdAt = new Date(commits[0].commit.committer.date);

            // Verificar se a branch foi criada no período especificado
            if (createdAt >= new Date(since) && createdAt <= new Date(until)) {
              return {
                name: branch.name,
                created_at: commits[0].commit.committer.date,
                commit_sha: commits[0].sha,
                commit_url: commits[0].html_url,
                author: commits[0].author ? commits[0].author.login : null,
                repository: repo,
              };
            }
          }
          return null;
        } catch (error) {
          console.error(
            `Erro ao buscar commits para branch ${branch.name}:`,
            error.message
          );
          return null;
        }
      })
    );

    // Filtrar branches nulas (que não foram criadas no período ou deram erro)
    return branchesWithDates.filter((branch) => branch !== null);
  } catch (error) {
    console.error(`Erro ao buscar branches para ${repo}:`, error.message);
    return [];
  }
}

/**
 * Busca reviews para um PR específico
 * @param {string} repo - Nome do repositório
 * @param {Object} pr - Objeto do PR
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de reviews para o PR
 */
async function getReviewsForPR(repo, pr, since, until) {
  try {
    const { data } = await octokit.rest.pulls.listReviews({
      owner: org,
      repo,
      pull_number: pr.number,
    });

    // Filtrar reviews pelo período e adicionar informações do PR
    return data
      .filter((review) => {
        const submittedAt = new Date(review.submitted_at);
        return submittedAt >= new Date(since) && submittedAt <= new Date(until);
      })
      .map((review) => {
        review.pull_request_url = pr.html_url;
        review.pull_request_number = pr.number;
        review.pull_request_title = pr.title;
        return review;
      });
  } catch (error) {
    console.error(
      `Erro ao buscar reviews para PR #${pr.number}:`,
      error.message
    );
    return [];
  }
}

/**
 * Busca as issues de um repositório
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Array} - Lista de issues
 */
async function getIssues(repo, since, until) {
  try {
    const issues = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const { data } = await octokit.rest.issues.listForRepo({
        owner: org,
        repo,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: 100,
        page,
        since, // GitHub API filtra issues criadas após esta data
      });

      // Filtrar issues pelo período e excluir PRs (que também são considerados issues na API)
      const filteredIssues = data.filter((issue) => {
        const createdAt = new Date(issue.created_at);
        return createdAt <= new Date(until) && !issue.pull_request;
      });

      if (filteredIssues.length === 0) {
        hasNextPage = false;
      } else {
        // Adicionar o nome do repositório a cada issue
        const issuesWithRepo = filteredIssues.map((issue) => {
          issue.repository = repo;
          return issue;
        });

        issues.push(...issuesWithRepo);
        hasNextPage = data.length === 100;
        page++;
      }
    }

    return issues;
  } catch (error) {
    console.error(`Erro ao buscar issues para ${repo}:`, error.message);
    return [];
  }
}

/**
 * Processa os commits e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} commits - Lista de commits
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processCommits(repo, commits, developers) {
  for (const commit of commits) {
    if (!commit.author || !commit.author.login) continue;

    const username = commit.author.login;

    if (!developers[username]) {
      initializeDeveloper(developers, username);
    }

    // Adicionar URL do commit
    const commitUrl = commit.html_url;
    const commitInfo = {
      url: commitUrl,
      sha: commit.sha,
      message: commit.commit.message,
      repository: repo,
      date: commit.commit.author.date,
    };

    developers[username].contributions.commits.push(commitInfo);
  }
}

/**
 * Processa os pull requests e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} pullRequests - Lista de pull requests
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processPullRequests(repo, pullRequests, developers) {
  for (const pr of pullRequests) {
    if (!pr.user || !pr.user.login) continue;

    const username = pr.user.login;

    if (!developers[username]) {
      initializeDeveloper(developers, username);
    }

    // Adicionar URL do PR
    const prInfo = {
      url: pr.html_url,
      number: pr.number,
      title: pr.title,
      repository: repo,
      state: pr.state,
      created_at: pr.created_at,
    };

    developers[username].contributions.pull_requests_opened.push(prInfo);
  }
}

/**
 * Processa as reviews de pull requests e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} reviews - Lista de reviews
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processReviews(repo, reviews, developers) {
  for (const review of reviews) {
    if (!review.user || !review.user.login) continue;

    const username = review.user.login;

    if (!developers[username]) {
      initializeDeveloper(developers, username);
    }

    // Adicionar URL da review
    const reviewInfo = {
      url: review.html_url || review.pull_request_url,
      pr_url: review.pull_request_url,
      pr_number: review.pull_request_number,
      pr_title: review.pull_request_title,
      repository: repo,
      state: review.state,
      submitted_at: review.submitted_at,
    };

    developers[username].contributions.pull_requests_reviewed.push(reviewInfo);
  }
}

/**
 * Processa os comentários em PRs e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} comments - Lista de comentários
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processPRComments(repo, comments, developers) {
  for (const comment of comments) {
    if (!comment.user || !comment.user.login) continue;

    const username = comment.user.login;

    if (!developers[username]) {
      initializeDeveloper(developers, username);
    }

    // Adicionar informações do comentário
    const commentInfo = {
      url: comment.html_url,
      pr_url: comment.pull_request_url,
      pr_number: comment.pull_request_number,
      pr_title: comment.pull_request_title,
      repository: repo,
      body: comment.body
        ? comment.body.substring(0, 100) +
          (comment.body.length > 100 ? "..." : "")
        : "",
      created_at: comment.created_at,
    };

    developers[username].contributions.pr_comments.push(commentInfo);
  }
}

/**
 * Processa as branches criadas e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} branches - Lista de branches
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processBranches(repo, branches, developers) {
  for (const branch of branches) {
    if (!branch.author) continue;

    const username = branch.author;

    if (!developers[username]) {
      initializeDeveloper(developers, username);
    }

    // Adicionar informações da branch
    const branchInfo = {
      name: branch.name,
      repository: repo,
      created_at: branch.created_at,
      commit_url: branch.commit_url,
      commit_sha: branch.commit_sha,
    };

    developers[username].contributions.branches_created.push(branchInfo);
  }
}

/**
 * Processa as issues e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} issues - Lista de issues
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processIssues(repo, issues, developers) {
  for (const issue of issues) {
    if (!issue.user || !issue.user.login) continue;

    const username = issue.user.login;

    if (!developers[username]) {
      initializeDeveloper(developers, username);
    }

    // Adicionar URL da issue aberta
    const issueInfo = {
      url: issue.html_url,
      number: issue.number,
      title: issue.title,
      repository: issue.repository || repo,
      state: issue.state,
      created_at: issue.created_at,
    };

    // Contar issue aberta
    developers[username].contributions.issues_opened.push(issueInfo);

    // Contar issue fechada se o estado for 'closed'
    if (issue.state === "closed" && issue.closed_at) {
      // Verificar se a issue foi fechada pelo mesmo usuário que a abriu
      if (issue.closed_by && issue.closed_by.login === username) {
        const closedIssueInfo = {
          url: issue.html_url,
          number: issue.number,
          title: issue.title,
          repository: issue.repository || repo,
          closed_at: issue.closed_at,
        };

        developers[username].contributions.issues_closed.push(closedIssueInfo);
      }
    }
  }
}

/**
 * Inicializa um desenvolvedor no objeto de desenvolvedores
 * @param {Object} developers - Objeto de desenvolvedores
 * @param {string} username - Nome de usuário do desenvolvedor
 */
function initializeDeveloper(developers, username) {
  developers[username] = {
    username,
    score: 0,
    contributions: {
      commits: [],
      pull_requests_opened: [],
      pull_requests_reviewed: [],
      issues_opened: [],
      issues_closed: [],
      pr_comments: [],
      branches_created: [],
    },
  };
}

/**
 * Calcula o score para cada desenvolvedor
 * @param {Object} developers - Objeto de desenvolvedores
 */
function calculateScores(developers) {
  for (const username in developers) {
    const dev = developers[username];
    const contributions = dev.contributions;

    dev.score =
      contributions.commits.length * WEIGHTS.commits +
      contributions.pull_requests_opened.length * WEIGHTS.pull_requests_opened +
      contributions.pull_requests_reviewed.length *
        WEIGHTS.pull_requests_reviewed +
      contributions.issues_opened.length * WEIGHTS.issues_opened +
      contributions.issues_closed.length * WEIGHTS.issues_closed +
      contributions.pr_comments.length * WEIGHTS.pr_comments +
      contributions.branches_created.length * WEIGHTS.branches_created;
  }
}

/**
 * Função para executar o script a partir da linha de comando
 */
async function main() {
  try {
    // Verificar se os argumentos foram fornecidos
    const args = process.argv.slice(2);

    if (args.length !== 2) {
      console.log("Uso: node index.js <data_inicio> <data_fim>");
      console.log("Exemplo: node index.js 2024-01-01 2024-02-01");
      process.exit(1);
    }

    const [startDate, endDate] = args;

    console.time("Tempo de execução");
    // Calcular a performance dos desenvolvedores
    const result = await calculateDeveloperPerformance(startDate, endDate);
    console.timeEnd("Tempo de execução");

    // Imprimir o resultado
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  main();
}

// Exportar funções para testes
module.exports = {
  calculateDeveloperPerformance,
};
