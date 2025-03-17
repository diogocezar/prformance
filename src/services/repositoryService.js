const octokit = require("../utils/githubClient");
const config = require("../config");
const log = require("../utils/logger");
const rateLimitHandler = require("../utils/rateLimitHandler");
const cacheManager = require("../utils/cacheManager");

const org = config.github.organization;

/**
 * Busca os repositórios da organização
 * @returns {Promise<Array>} - Lista de repositórios
 */
async function getRepositories() {
  try {
    // Usar o gerenciador de cache
    return await cacheManager.withCache("repositories", async () => {
      log.github(`Buscando repositórios da organização ${org}`);

      // Usar o gerenciador de limites de taxa para executar a função
      const fetchRepos = async () => {
        const repos = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
          log.debug(`Buscando página ${page} de repositórios`);

          // Verificar limite de taxa antes de cada requisição
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

          // Se houver mais páginas, verificar o limite de taxa antes de continuar
          if (hasNextPage) {
            const hasRemaining = await rateLimitHandler.hasRemainingRequests(
              "core"
            );
            if (!hasRemaining) {
              const waitTime = await rateLimitHandler.getWaitTime("core");
              log.warn(
                `Limite de requisições atingido ao buscar repositórios. Aguardando ${Math.ceil(
                  waitTime / 1000
                )} segundos.`
              );
              await new Promise((resolve) =>
                setTimeout(resolve, waitTime + 1000)
              );
            }
          }
        }

        return repos.map((repo) => repo.name);
      };

      const repos = await rateLimitHandler.executeWithRateLimit(fetchRepos);
      log.success(`Total de ${repos.length} repositórios encontrados`);
      return repos;
    });
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
    // Usar o gerenciador de cache
    const cacheKey = `branches_${repo}_${since}_${until}`;
    return await cacheManager.withCache(cacheKey, async () => {
      log.github(`Buscando branches do repositório ${repo}`);

      // Usar o gerenciador de limites de taxa para executar a função
      const fetchBranches = async () => {
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

        // Processar branches em lotes para evitar muitas requisições simultâneas
        const batchSize = config.rateLimit.batchSize;
        const batchInterval = config.rateLimit.batchInterval;
        const branchesWithDates = [];

        for (let i = 0; i < branchesToProcess.length; i += batchSize) {
          const batch = branchesToProcess.slice(i, i + batchSize);

          // Processar lote de branches
          const batchResults = await Promise.all(
            batch.map(async (branch) => {
              try {
                log.debug(
                  `Verificando data de criação da branch ${branch.name} em ${repo}`
                );

                // Verificar limite de taxa antes de cada requisição
                const hasRemaining =
                  await rateLimitHandler.hasRemainingRequests("core");
                if (!hasRemaining) {
                  const waitTime = await rateLimitHandler.getWaitTime("core");
                  log.warn(
                    `Limite de requisições atingido ao buscar commits. Aguardando ${Math.ceil(
                      waitTime / 1000
                    )} segundos.`
                  );
                  await new Promise((resolve) =>
                    setTimeout(resolve, waitTime + 1000)
                  );
                }

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
                      author: commits[0].author
                        ? commits[0].author.login
                        : null,
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
                  log.debug(
                    `Nenhum commit encontrado para branch ${branch.name}`
                  );
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

          // Adicionar resultados do lote
          branchesWithDates.push(...batchResults);

          // Aguardar um pouco entre lotes para evitar sobrecarga
          if (i + batchSize < branchesToProcess.length) {
            await new Promise((resolve) => setTimeout(resolve, batchInterval));
          }
        }

        // Filtrar branches nulas (que não foram criadas no período ou deram erro)
        const filteredBranches = branchesWithDates.filter(
          (branch) => branch !== null
        );

        log.success(
          `Encontradas ${filteredBranches.length} branches criadas no período em ${repo}`
        );

        return filteredBranches;
      };

      const branches = await rateLimitHandler.executeWithRateLimit(
        fetchBranches
      );
      log.success(
        `Encontradas ${branches.length} branches criadas no período em ${repo}`
      );
      return branches;
    });
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
