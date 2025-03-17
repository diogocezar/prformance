const octokit = require("../utils/githubClient");
const config = require("../config");
const log = require("../utils/logger");

const org = config.github.organization;

/**
 * Busca os repositórios da organização
 * @returns {Promise<Array>} - Lista de repositórios
 */
async function getRepositories() {
  try {
    log.github(`Buscando repositórios da organização ${org}`);
    const repos = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      log.debug(`Buscando página ${page} de repositórios`);
      const { data } = await octokit.rest.repos.listForOrg({
        org,
        per_page: 100,
        page,
      });

      repos.push(...data);
      hasNextPage = data.length === 100;
      page++;

      log.debug(
        `Encontrados ${data.length} repositórios na página ${page - 1}`
      );
    }

    log.success(`Total de ${repos.length} repositórios encontrados`);
    return repos.map((repo) => repo.name);
  } catch (error) {
    log.error("Erro ao buscar repositórios", {
      error: error.message,
      stack: error.stack,
      organization: org,
    });
    return [];
  }
}

/**
 * Busca branches criadas em um repositório no período especificado
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de branches
 */
async function getBranches(repo, since, until) {
  try {
    log.github(`Buscando branches do repositório ${repo}`);

    // Buscar todas as branches
    const { data: branches } = await octokit.rest.repos.listBranches({
      owner: org,
      repo,
      per_page: 100,
    });

    log.debug(`Encontradas ${branches.length} branches em ${repo}`);

    // Para cada branch, precisamos verificar quando foi criada
    // Infelizmente, a API do GitHub não fornece diretamente a data de criação da branch
    // Vamos usar o commit mais antigo da branch como aproximação
    const branchLimit = 30; // Limitando a 30 branches para evitar muitas requisições
    const branchesToProcess = branches.slice(0, branchLimit);

    if (branches.length > branchLimit) {
      log.warn(
        `Limitando análise a ${branchLimit} branches de ${branches.length} em ${repo}`
      );
    }

    const branchesWithDates = await Promise.all(
      branchesToProcess.map(async (branch) => {
        try {
          log.debug(
            `Verificando data de criação da branch ${branch.name} em ${repo}`
          );

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
            const sinceDate = new Date(since);
            const untilDate = new Date(until);

            // Verificar se a branch foi criada no período especificado
            if (createdAt >= sinceDate && createdAt <= untilDate) {
              log.debug(
                `Branch ${
                  branch.name
                } criada no período especificado: ${createdAt.toISOString()}`
              );
              return {
                name: branch.name,
                created_at: commits[0].commit.committer.date,
                commit_sha: commits[0].sha,
                commit_url: commits[0].html_url,
                author: commits[0].author ? commits[0].author.login : null,
                repository: repo,
              };
            } else {
              log.debug(
                `Branch ${
                  branch.name
                } fora do período: ${createdAt.toISOString()}`
              );
            }
          } else {
            log.debug(`Nenhum commit encontrado para branch ${branch.name}`);
          }
          return null;
        } catch (error) {
          log.error(`Erro ao buscar commits para branch ${branch.name}`, {
            error: error.message,
            repository: repo,
          });
          return null;
        }
      })
    );

    // Filtrar branches nulas (que não foram criadas no período ou deram erro)
    const filteredBranches = branchesWithDates.filter(
      (branch) => branch !== null
    );
    log.success(
      `Encontradas ${filteredBranches.length} branches criadas no período em ${repo}`
    );

    return filteredBranches;
  } catch (error) {
    log.error(`Erro ao buscar branches para ${repo}`, {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

module.exports = {
  getRepositories,
  getBranches,
};
