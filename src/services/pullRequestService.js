const octokit = require("../utils/githubClient");
const config = require("../config");
const log = require("../utils/logger");

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
        `Encontrados ${filteredPRs.length} pull requests relevantes na página ${
          page - 1
        } para ${repo}`
      );
    }

    log.success(
      `Total de ${pullRequests.length} pull requests encontrados para ${repo}`
    );
    return pullRequests;
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
    log.github(`Buscando reviews de pull requests para ${repo}`);
    const allReviews = [];

    // Processar PRs em lotes para evitar muitas requisições simultâneas
    for (let i = 0; i < pullRequests.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = pullRequests.slice(i, i + MAX_CONCURRENT_REQUESTS);
      log.debug(
        `Processando lote ${
          Math.floor(i / MAX_CONCURRENT_REQUESTS) + 1
        }/${Math.ceil(
          pullRequests.length / MAX_CONCURRENT_REQUESTS
        )} de reviews`
      );

      const reviewsPromises = batch.map(async (pr) => {
        try {
          const { data: reviews } = await octokit.rest.pulls.listReviews({
            owner: org,
            repo,
            pull_number: pr.number,
          });

          // Filtrar reviews pelo período
          const filteredReviews = reviews.filter((review) => {
            const submittedAt = new Date(review.submitted_at);
            const sinceDate = new Date(since);
            const untilDate = new Date(until);
            return submittedAt >= sinceDate && submittedAt <= untilDate;
          });

          // Adicionar informações do PR a cada review
          return filteredReviews.map((review) => {
            review.pull_request_url = pr.html_url;
            review.pull_request_title = pr.title;
            review.repository = repo;
            return review;
          });
        } catch (error) {
          log.warn(`Erro ao buscar reviews para PR #${pr.number} em ${repo}`, {
            error: error.message,
          });
          return [];
        }
      });

      const reviewsResults = await Promise.all(reviewsPromises);
      reviewsResults.forEach((reviews) => {
        allReviews.push(...reviews);
      });
    }

    log.success(
      `Total de ${allReviews.length} reviews encontradas para ${repo}`
    );
    return allReviews;
  } catch (error) {
    log.error(`Erro ao buscar reviews para ${repo}`, {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

/**
 * Busca os comentários em pull requests
 * @param {string} repo - Nome do repositório
 * @param {Array} pullRequests - Lista de pull requests
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de comentários
 */
async function getPullRequestComments(repo, pullRequests, since, until) {
  try {
    log.github(`Buscando comentários em pull requests para ${repo}`);
    const allComments = [];

    // Processar PRs em lotes para evitar muitas requisições simultâneas
    for (let i = 0; i < pullRequests.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = pullRequests.slice(i, i + MAX_CONCURRENT_REQUESTS);
      log.debug(
        `Processando lote ${
          Math.floor(i / MAX_CONCURRENT_REQUESTS) + 1
        }/${Math.ceil(
          pullRequests.length / MAX_CONCURRENT_REQUESTS
        )} de comentários`
      );

      const commentsPromises = batch.map(async (pr) => {
        try {
          // Buscar comentários de issue (comentários gerais no PR)
          const { data: issueComments } =
            await octokit.rest.issues.listComments({
              owner: org,
              repo,
              issue_number: pr.number,
            });

          // Buscar comentários de review (comentários em linhas específicas)
          const { data: reviewComments } =
            await octokit.rest.pulls.listReviewComments({
              owner: org,
              repo,
              pull_number: pr.number,
            });

          // Combinar todos os comentários
          const allPrComments = [...issueComments, ...reviewComments];

          // Filtrar comentários pelo período
          const filteredComments = allPrComments.filter((comment) => {
            const createdAt = new Date(comment.created_at);
            const sinceDate = new Date(since);
            const untilDate = new Date(until);
            return createdAt >= sinceDate && createdAt <= untilDate;
          });

          // Adicionar informações do PR a cada comentário
          return filteredComments.map((comment) => {
            comment.pull_request_url = pr.html_url;
            comment.pull_request_title = pr.title;
            comment.repository = repo;
            return comment;
          });
        } catch (error) {
          log.warn(
            `Erro ao buscar comentários para PR #${pr.number} em ${repo}`,
            {
              error: error.message,
            }
          );
          return [];
        }
      });

      const commentsResults = await Promise.all(commentsPromises);
      commentsResults.forEach((comments) => {
        allComments.push(...comments);
      });
    }

    log.success(
      `Total de ${allComments.length} comentários encontrados para ${repo}`
    );
    return allComments;
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
