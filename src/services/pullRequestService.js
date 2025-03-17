const octokit = require("../utils/githubClient");
const config = require("../config");
const log = require("../utils/logger");
const rateLimitHandler = require("../utils/rateLimitHandler");
const cacheManager = require("../utils/cacheManager");

const org = config.github.organization;
const MAX_CONCURRENT_REQUESTS = config.concurrency.maxConcurrentRequests;

/**
 * Busca os pull requests de um repositório
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de pull requests
 */
async function getPullRequests(repo, since, until) {
  try {
    // Usar o gerenciador de cache
    const cacheKey = `pull_requests_${repo}_${since}_${until}`;
    return await cacheManager.withCache(cacheKey, async () => {
      log.github(`Buscando pull requests para ${repo} no período especificado`);
      const pullRequests = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        log.debug(`Buscando página ${page} de pull requests para ${repo}`);
        const { data } = await octokit.rest.pulls.list({
          owner: org,
          repo,
          state: "all",
          per_page: 100,
          page,
        });

        // Filtrar PRs pelo período
        const filteredPRs = data.filter((pr) => {
          const createdAt = new Date(pr.created_at);
          const sinceDate = new Date(since);
          const untilDate = new Date(until);
          return createdAt >= sinceDate && createdAt <= untilDate;
        });

        pullRequests.push(...filteredPRs);
        hasNextPage = data.length === 100;
        page++;

        log.debug(
          `Encontrados ${
            filteredPRs.length
          } pull requests relevantes na página ${page - 1} para ${repo}`
        );
      }

      log.success(
        `Total de ${pullRequests.length} pull requests encontrados para ${repo}`
      );
      return pullRequests;
    });
  } catch (error) {
    log.error(`Erro ao buscar pull requests para ${repo}`, {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

/**
 * Busca as reviews de pull requests
 * @param {string} repo - Nome do repositório
 * @param {Array} pullRequests - Lista de pull requests
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de reviews
 */
async function getPullRequestReviews(repo, pullRequests, since, until) {
  try {
    // Usar o gerenciador de cache
    const cacheKey = `pull_request_reviews_${repo}_${since}_${until}`;
    return await cacheManager.withCache(cacheKey, async () => {
      log.github(`Buscando reviews de pull requests para ${repo}`);
      const reviews = [];

      // Processar em lotes para evitar exceder o limite de requisições
      log.debug(
        `Processando ${pullRequests.length} PRs em lotes de ${MAX_CONCURRENT_REQUESTS}`
      );
      for (let i = 0; i < pullRequests.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = pullRequests.slice(i, i + MAX_CONCURRENT_REQUESTS);
        log.debug(
          `Processando lote ${i / MAX_CONCURRENT_REQUESTS + 1} (${
            batch.length
          } PRs)`
        );

        const batchPromises = batch.map(async (pr) => {
          try {
            const { data } = await octokit.rest.pulls.listReviews({
              owner: org,
              repo,
              pull_number: pr.number,
            });

            // Filtrar reviews pelo período
            const filteredReviews = data.filter((review) => {
              const submittedAt = new Date(review.submitted_at);
              const sinceDate = new Date(since);
              const untilDate = new Date(until);
              return (
                submittedAt >= sinceDate &&
                submittedAt <= untilDate &&
                review.state !== "COMMENTED" // Ignorar comentários simples
              );
            });

            // Adicionar informações do PR às reviews
            return filteredReviews.map((review) => ({
              ...review,
              pr_number: pr.number,
              pr_title: pr.title,
              pr_url: pr.html_url,
            }));
          } catch (error) {
            log.error(
              `Erro ao buscar reviews para PR #${pr.number} em ${repo}`,
              {
                error: error.message,
              }
            );
            return [];
          }
        });

        const batchResults = await Promise.all(batchPromises);
        reviews.push(...batchResults.flat());
      }

      log.success(
        `Total de ${reviews.length} reviews encontradas para ${repo}`
      );
      return reviews;
    });
  } catch (error) {
    log.error(`Erro ao buscar reviews para ${repo}`, {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

/**
 * Busca os comentários de pull requests
 * @param {string} repo - Nome do repositório
 * @param {Array} pullRequests - Lista de pull requests
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de comentários
 */
async function getPullRequestComments(repo, pullRequests, since, until) {
  try {
    // Usar o gerenciador de cache
    const cacheKey = `pull_request_comments_${repo}_${since}_${until}`;
    return await cacheManager.withCache(cacheKey, async () => {
      log.github(`Buscando comentários de pull requests para ${repo}`);
      const allComments = [];

      // Processar em lotes para evitar exceder o limite de requisições
      log.debug(
        `Processando ${pullRequests.length} PRs em lotes de ${MAX_CONCURRENT_REQUESTS}`
      );
      for (let i = 0; i < pullRequests.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = pullRequests.slice(i, i + MAX_CONCURRENT_REQUESTS);
        log.debug(
          `Processando lote ${i / MAX_CONCURRENT_REQUESTS + 1} (${
            batch.length
          } PRs)`
        );

        const batchPromises = batch.map(async (pr) => {
          try {
            // Buscar comentários de issue (comentários gerais no PR)
            const issueComments = await octokit.rest.issues.listComments({
              owner: org,
              repo,
              issue_number: pr.number,
            });

            // Buscar comentários de review (comentários em linhas específicas)
            const reviewComments = await octokit.rest.pulls.listReviewComments({
              owner: org,
              repo,
              pull_number: pr.number,
            });

            // Combinar os dois tipos de comentários
            const comments = [...issueComments.data, ...reviewComments.data];

            // Filtrar comentários pelo período
            const filteredComments = comments.filter((comment) => {
              const createdAt = new Date(comment.created_at);
              const sinceDate = new Date(since);
              const untilDate = new Date(until);
              return createdAt >= sinceDate && createdAt <= untilDate;
            });

            // Adicionar informações do PR aos comentários
            return filteredComments.map((comment) => ({
              ...comment,
              pr_number: pr.number,
              pr_title: pr.title,
              pr_url: pr.html_url,
            }));
          } catch (error) {
            log.error(
              `Erro ao buscar comentários para PR #${pr.number} em ${repo}`,
              {
                error: error.message,
              }
            );
            return [];
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allComments.push(...batchResults.flat());
      }

      log.success(
        `Total de ${allComments.length} comentários encontrados para ${repo}`
      );
      return allComments;
    });
  } catch (error) {
    log.error(`Erro ao buscar comentários para ${repo}`, {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

module.exports = {
  getPullRequests,
  getPullRequestReviews,
  getPullRequestComments,
};
