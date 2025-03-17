const config = require("../config");
const repositoryService = require("./repositoryService");
const commitService = require("./commitService");
const pullRequestService = require("./pullRequestService");
const issueService = require("./issueService");
const branchService = require("./branchService");
const log = require("../utils/logger");

const MAX_CONCURRENT_REPOS = config.concurrency.maxConcurrentRepos;
const WEIGHTS = config.weights;

/**
 * Função principal que busca os dados e calcula os scores
 * @param {string} startDate - Data de início no formato YYYY-MM-DD
 * @param {string} endDate - Data de fim no formato YYYY-MM-DD
 * @returns {Promise<Object>} - JSON com os resultados
 */
async function calculateDeveloperPerformance(startDate, endDate) {
  try {
    log.start("Iniciando cálculo de performance dos desenvolvedores");

    // Validar datas
    if (!startDate || !endDate) {
      log.error("Datas de início e fim não fornecidas");
      throw new Error("As datas de início e fim são obrigatórias");
    }

    // Formatar datas para o formato ISO
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      log.error("Formato de data inválido", { startDate, endDate });
      throw new Error("Formato de data inválido. Use YYYY-MM-DD");
    }

    // Converter para ISO
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    log.info(`Período de análise: ${startDate} a ${endDate}`, {
      startIso,
      endIso,
    });

    // Buscar repositórios da organização
    log.info(
      `Buscando repositórios da organização ${config.github.organization}`
    );
    const repos = await repositoryService.getRepositories();
    log.success(`Encontrados ${repos.length} repositórios`);

    // Objeto para armazenar os dados dos desenvolvedores
    const developers = {};

    // Processar repositórios em lotes
    log.info(`Processando repositórios em lotes de ${MAX_CONCURRENT_REPOS}`);
    await processRepositoriesInBatches(repos, startIso, endIso, developers);

    // Calcular scores
    log.info("Calculando scores dos desenvolvedores");
    const developersArray = calculateScores(developers);
    log.success(
      `Scores calculados para ${developersArray.length} desenvolvedores`
    );

    // Retornar resultado
    return {
      range: {
        start: startDate,
        end: endDate,
      },
      developers: developersArray,
    };
  } catch (error) {
    log.error("Erro ao calcular performance dos desenvolvedores", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Processa repositórios em lotes para evitar sobrecarga
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
  // Processar repositórios em lotes
  for (let i = 0; i < repos.length; i += MAX_CONCURRENT_REPOS) {
    const batch = repos.slice(i, i + MAX_CONCURRENT_REPOS);
    log.info(
      `Processando lote ${Math.floor(i / MAX_CONCURRENT_REPOS) + 1}/${Math.ceil(
        repos.length / MAX_CONCURRENT_REPOS
      )}`,
      {
        batchSize: batch.length,
        totalRepos: repos.length,
        progress: `${i}/${repos.length}`,
      }
    );

    // Processar repositórios em paralelo
    await Promise.all(
      batch.map((repo) => processRepository(repo, startIso, endIso, developers))
    );
  }
}

/**
 * Processa um repositório individual
 * @param {string} repoName - Nome do repositório
 * @param {string} startIso - Data de início em formato ISO
 * @param {string} endIso - Data de fim em formato ISO
 * @param {Object} developers - Objeto para armazenar dados dos desenvolvedores
 */
async function processRepository(repoName, startIso, endIso, developers) {
  try {
    log.github(`Processando repositório: ${repoName}`);

    // Buscar dados em paralelo
    const [commits, pullRequests, issues, branches] = await Promise.all([
      commitService.getCommits(repoName, startIso, endIso),
      pullRequestService.getPullRequests(repoName, startIso, endIso),
      issueService.getIssues(repoName, startIso, endIso),
      branchService.getBranches(repoName, startIso, endIso),
    ]);

    log.debug(`Dados coletados para ${repoName}`, {
      commits: commits.length,
      pullRequests: pullRequests.length,
      issues: issues.length,
      branches: branches.length,
    });

    // Buscar reviews e comentários após ter os PRs
    const [reviews, prComments] = await Promise.all([
      pullRequestService.getPullRequestReviews(
        repoName,
        pullRequests,
        startIso,
        endIso
      ),
      pullRequestService.getPullRequestComments(
        repoName,
        pullRequests,
        startIso,
        endIso
      ),
    ]);

    log.debug(`Dados adicionais coletados para ${repoName}`, {
      reviews: reviews.length,
      prComments: prComments.length,
    });

    // Processar os dados obtidos
    processCommits(repoName, commits, developers);
    processPullRequests(repoName, pullRequests, developers);
    processReviews(repoName, reviews, developers);
    processIssues(repoName, issues, developers);
    processPRComments(repoName, prComments, developers);
    processBranches(repoName, branches, developers);

    log.success(`Repositório ${repoName} processado com sucesso`);
  } catch (error) {
    log.error(`Erro ao processar repositório ${repoName}`, {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Processa os commits e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} commits - Lista de commits
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processCommits(repo, commits, developers) {
  log.debug(`Processando ${commits.length} commits do repositório ${repo}`);

  let commitsProcessed = 0;

  for (const commit of commits) {
    const username = commit.author?.login;
    if (!username) {
      log.debug(`Commit ${commit.sha.substring(0, 7)} sem autor identificado`);
      continue;
    }

    if (!developers[username]) {
      log.debug(`Novo desenvolvedor encontrado: ${username} (via commit)`);
      initializeDeveloper(developers, username);
    }

    // Adicionar informações do commit
    const commitInfo = {
      url: commit.html_url,
      sha: commit.sha,
      message: commit.commit.message,
      repository: repo,
      date: commit.commit.author.date,
    };

    log.debug(
      `Adicionando commit ${commit.sha.substring(0, 7)} para ${username}`
    );
    developers[username].contributions.commits.items.push(commitInfo);
    developers[username].contributions.commits.number++;
    commitsProcessed++;
  }

  log.success(`Processados ${commitsProcessed} commits para ${repo}`);
}

/**
 * Processa os pull requests e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} pullRequests - Lista de pull requests
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processPullRequests(repo, pullRequests, developers) {
  log.debug(
    `Processando ${pullRequests.length} pull requests do repositório ${repo}`
  );

  let prsProcessed = 0;

  for (const pr of pullRequests) {
    const username = pr.user?.login;
    if (!username) {
      log.debug(`PR #${pr.number} sem autor identificado`);
      continue;
    }

    if (!developers[username]) {
      log.debug(`Novo desenvolvedor encontrado: ${username} (via PR)`);
      initializeDeveloper(developers, username);
    }

    // Adicionar informações do PR
    const prInfo = {
      url: pr.html_url,
      number: pr.number,
      title: pr.title,
      repository: repo,
      state: pr.merged_at ? "merged" : pr.state,
      created_at: pr.created_at,
    };

    log.debug(`Adicionando PR #${pr.number} para ${username}`);
    developers[username].contributions.pull_requests_opened.items.push(prInfo);
    developers[username].contributions.pull_requests_opened.number++;
    prsProcessed++;
  }

  log.success(`Processados ${prsProcessed} pull requests para ${repo}`);
}

/**
 * Processa as reviews de pull requests e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} reviews - Lista de reviews
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processReviews(repo, reviews, developers) {
  log.debug(`Processando ${reviews.length} reviews do repositório ${repo}`);

  let reviewsProcessed = 0;

  for (const review of reviews) {
    const username = review.user?.login;
    if (!username) {
      log.debug(
        `Review para PR #${review.pull_request_url
          .split("/")
          .pop()} sem autor identificado`
      );
      continue;
    }

    if (!developers[username]) {
      log.debug(`Novo desenvolvedor encontrado: ${username} (via review)`);
      initializeDeveloper(developers, username);
    }

    // Extrair número e título do PR da URL
    const prNumber = review.pull_request_url.split("/").pop();
    const prTitle = review.pull_request_title || `PR #${prNumber}`;

    // Adicionar informações da review
    const reviewInfo = {
      url: review.html_url,
      pr_url: review.pull_request_url,
      pr_number: parseInt(prNumber),
      pr_title: prTitle,
      repository: repo,
      state: review.state,
      submitted_at: review.submitted_at,
    };

    log.debug(`Adicionando review para PR #${prNumber} por ${username}`);
    developers[username].contributions.pull_requests_reviewed.items.push(
      reviewInfo
    );
    developers[username].contributions.pull_requests_reviewed.number++;
    reviewsProcessed++;
  }

  log.success(`Processadas ${reviewsProcessed} reviews para ${repo}`);
}

/**
 * Processa as issues e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} issues - Lista de issues
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processIssues(repo, issues, developers) {
  log.debug(`Processando ${issues.length} issues do repositório ${repo}`);

  let issuesOpenedProcessed = 0;
  let issuesClosedProcessed = 0;

  for (const issue of issues) {
    // Ignorar pull requests (que também são issues na API do GitHub)
    if (issue.pull_request) {
      continue;
    }

    // Processar issues abertas
    const creatorUsername = issue.user?.login;
    if (creatorUsername) {
      if (!developers[creatorUsername]) {
        log.debug(
          `Novo desenvolvedor encontrado: ${creatorUsername} (via issue)`
        );
        initializeDeveloper(developers, creatorUsername);
      }

      // Adicionar informações da issue aberta
      const issueOpenedInfo = {
        url: issue.html_url,
        number: issue.number,
        title: issue.title,
        repository: repo,
        state: issue.state,
        created_at: issue.created_at,
      };

      log.debug(
        `Adicionando issue #${issue.number} aberta por ${creatorUsername}`
      );
      developers[creatorUsername].contributions.issues_opened.items.push(
        issueOpenedInfo
      );
      developers[creatorUsername].contributions.issues_opened.number++;
      issuesOpenedProcessed++;
    }

    // Processar issues fechadas
    if (issue.state === "closed" && issue.closed_by) {
      const closerUsername = issue.closed_by.login;
      if (closerUsername) {
        if (!developers[closerUsername]) {
          log.debug(
            `Novo desenvolvedor encontrado: ${closerUsername} (via issue fechada)`
          );
          initializeDeveloper(developers, closerUsername);
        }

        // Adicionar informações da issue fechada
        const issueClosedInfo = {
          url: issue.html_url,
          number: issue.number,
          title: issue.title,
          repository: repo,
          closed_at: issue.closed_at,
        };

        log.debug(
          `Adicionando issue #${issue.number} fechada por ${closerUsername}`
        );
        developers[closerUsername].contributions.issues_closed.items.push(
          issueClosedInfo
        );
        developers[closerUsername].contributions.issues_closed.number++;
        issuesClosedProcessed++;
      }
    }
  }

  log.success(
    `Processadas ${issuesOpenedProcessed} issues abertas e ${issuesClosedProcessed} issues fechadas para ${repo}`
  );
}

/**
 * Processa os comentários em PRs e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} comments - Lista de comentários
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processPRComments(repo, comments, developers) {
  log.debug(
    `Processando ${comments.length} comentários em PRs do repositório ${repo}`
  );

  let commentsProcessed = 0;

  for (const comment of comments) {
    const username = comment.user?.login;
    if (!username) {
      log.debug(`Comentário em PR sem autor identificado`);
      continue;
    }

    if (!developers[username]) {
      log.debug(`Novo desenvolvedor encontrado: ${username} (via comentário)`);
      initializeDeveloper(developers, username);
    }

    // Extrair número e título do PR da URL
    const prUrl = comment.pull_request_url || comment.html_url.split("#")[0];
    const prNumber = prUrl.split("/").pop();
    const prTitle = comment.pull_request_title || `PR #${prNumber}`;

    // Adicionar informações do comentário
    const commentInfo = {
      url: comment.html_url,
      pr_url: prUrl,
      pr_number: parseInt(prNumber),
      pr_title: prTitle,
      repository: repo,
      body: comment.body,
      created_at: comment.created_at,
    };

    log.debug(`Adicionando comentário em PR #${prNumber} por ${username}`);
    developers[username].contributions.pr_comments.items.push(commentInfo);
    developers[username].contributions.pr_comments.number++;
    commentsProcessed++;
  }

  log.success(
    `Processados ${commentsProcessed} comentários em PRs para ${repo}`
  );
}

/**
 * Processa as branches e atualiza o objeto de desenvolvedores
 * @param {string} repo - Nome do repositório
 * @param {Array} branches - Lista de branches
 * @param {Object} developers - Objeto de desenvolvedores
 */
function processBranches(repo, branches, developers) {
  log.debug(`Processando ${branches.length} branches do repositório ${repo}`);

  let branchesProcessed = 0;

  for (const branch of branches) {
    const username = branch.author;
    if (!username) {
      log.debug(`Branch ${branch.name} sem autor identificado`);
      continue;
    }

    if (!developers[username]) {
      log.debug(`Novo desenvolvedor encontrado: ${username} (via branch)`);
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

    log.debug(`Adicionando branch ${branch.name} para ${username}`);
    developers[username].contributions.branches_created.items.push(branchInfo);
    developers[username].contributions.branches_created.number++;
    branchesProcessed++;
  }

  log.success(`Processadas ${branchesProcessed} branches para ${repo}`);
}

/**
 * Calcula os scores dos desenvolvedores
 * @param {Object} developers - Objeto com dados dos desenvolvedores
 * @returns {Array} - Array de desenvolvedores ordenado por score
 */
function calculateScores(developers) {
  const developersArray = Object.keys(developers).map((username) => {
    const dev = developers[username];

    // Calcular score
    const score =
      dev.contributions.commits.number * WEIGHTS.commits +
      dev.contributions.pull_requests_opened.number *
        WEIGHTS.pull_requests_opened +
      dev.contributions.pull_requests_reviewed.number *
        WEIGHTS.pull_requests_reviewed +
      dev.contributions.issues_opened.number * WEIGHTS.issues_opened +
      dev.contributions.issues_closed.number * WEIGHTS.issues_closed +
      dev.contributions.pr_comments.number * WEIGHTS.pr_comments +
      dev.contributions.branches_created.number * WEIGHTS.branches_created;

    log.debug(`Score calculado para ${username}: ${score}`, {
      commits: dev.contributions.commits.number * WEIGHTS.commits,
      prs_opened:
        dev.contributions.pull_requests_opened.number *
        WEIGHTS.pull_requests_opened,
      prs_reviewed:
        dev.contributions.pull_requests_reviewed.number *
        WEIGHTS.pull_requests_reviewed,
      issues_opened:
        dev.contributions.issues_opened.number * WEIGHTS.issues_opened,
      issues_closed:
        dev.contributions.issues_closed.number * WEIGHTS.issues_closed,
      pr_comments: dev.contributions.pr_comments.number * WEIGHTS.pr_comments,
      branches:
        dev.contributions.branches_created.number * WEIGHTS.branches_created,
    });

    return {
      username,
      score,
      contributions: dev.contributions,
    };
  });

  // Ordenar por score (decrescente)
  return developersArray.sort((a, b) => b.score - a.score);
}

/**
 * Inicializa a estrutura de dados para um novo desenvolvedor
 * @param {Object} developers - Objeto para armazenar dados dos desenvolvedores
 * @param {string} username - Nome de usuário do desenvolvedor
 */
function initializeDeveloper(developers, username) {
  log.debug(`Inicializando dados para desenvolvedor: ${username}`);
  developers[username] = {
    username,
    contributions: {
      commits: {
        number: 0,
        items: [],
      },
      pull_requests_opened: {
        number: 0,
        items: [],
      },
      pull_requests_reviewed: {
        number: 0,
        items: [],
      },
      issues_opened: {
        number: 0,
        items: [],
      },
      issues_closed: {
        number: 0,
        items: [],
      },
      pr_comments: {
        number: 0,
        items: [],
      },
      branches_created: {
        number: 0,
        items: [],
      },
    },
  };
}

module.exports = {
  calculateDeveloperPerformance,
  initializeDeveloper,
  // Exportar funções de processamento para uso em outros serviços
  processCommits,
  processPullRequests,
  processReviews,
  processIssues,
  processPRComments,
  processBranches,
};
