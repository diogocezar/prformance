const octokit = require("../utils/githubClient");
const config = require("../config");
const log = require("../utils/logger");
const rateLimitHandler = require("../utils/rateLimitHandler");
const cacheManager = require("../utils/cacheManager");

const org = config.github.organization;

/**
 * Busca os commits de um repositório
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de commits
 */
async function getCommits(repo, since, until) {
  try {
    // Usar o gerenciador de cache
    const cacheKey = `commits_${repo}_${since}_${until}`;
    return await cacheManager.withCache(cacheKey, async () => {
      log.github(`Buscando commits para ${repo} no período especificado`);
      const commits = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        log.debug(`Buscando página ${page} de commits para ${repo}`);
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

        log.debug(
          `Encontrados ${data.length} commits na página ${
            page - 1
          } para ${repo}`
        );
      }

      log.success(
        `Total de ${commits.length} commits encontrados para ${repo}`
      );
      return commits;
    });
  } catch (error) {
    log.error(`Erro ao buscar commits para ${repo}`, {
      error: error.message,
      stack: error.stack,
    });
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
    const commitInfo = {
      url: commit.html_url,
      sha: commit.sha,
      message: commit.commit.message,
      repository: repo,
      date: commit.commit.author.date,
    };

    developers[username].contributions.commits.push(commitInfo);
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

module.exports = {
  getCommits,
  processCommits,
  initializeDeveloper,
};
