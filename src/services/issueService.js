const octokit = require("../utils/githubClient");
const config = require("../config");
const log = require("../utils/logger");

const org = config.github.organization;

/**
 * Busca as issues de um repositório
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de issues
 */
async function getIssues(repo, since, until) {
  try {
    log.github(`Buscando issues para ${repo} no período especificado`);
    const issues = [];
    let page = 1;
    let hasNextPage = true;

    // Buscar issues abertas no período
    while (hasNextPage) {
      log.debug(`Buscando página ${page} de issues para ${repo}`);
      const { data } = await octokit.rest.issues.listForRepo({
        owner: org,
        repo,
        state: "all",
        since, // Issues atualizadas desde esta data
        per_page: 100,
        page,
      });

      // Filtrar issues que foram criadas ou fechadas no período
      const filteredIssues = data.filter((issue) => {
        const createdAt = new Date(issue.created_at);
        const closedAt = issue.closed_at ? new Date(issue.closed_at) : null;
        const sinceDate = new Date(since);
        const untilDate = new Date(until);

        return (
          (createdAt >= sinceDate && createdAt <= untilDate) || // Criada no período
          (closedAt && closedAt >= sinceDate && closedAt <= untilDate) // Fechada no período
        );
      });

      issues.push(...filteredIssues);
      hasNextPage = data.length === 100;
      page++;

      log.debug(
        `Encontradas ${filteredIssues.length} issues relevantes na página ${
          page - 1
        } para ${repo}`
      );
    }

    // Para cada issue fechada, buscar quem a fechou
    for (const issue of issues.filter((i) => i.state === "closed")) {
      try {
        // Buscar eventos da issue para encontrar quem a fechou
        const { data: events } = await octokit.rest.issues.listEvents({
          owner: org,
          repo,
          issue_number: issue.number,
        });

        // Encontrar o evento de fechamento
        const closeEvent = events.find(
          (event) => event.event === "closed" && event.actor
        );

        if (closeEvent) {
          issue.closed_by = closeEvent.actor;
        }
      } catch (error) {
        log.warn(
          `Erro ao buscar eventos da issue #${issue.number} em ${repo}`,
          {
            error: error.message,
          }
        );
      }
    }

    log.success(`Total de ${issues.length} issues encontradas para ${repo}`);
    return issues;
  } catch (error) {
    log.error(`Erro ao buscar issues para ${repo}`, {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

module.exports = {
  getIssues,
};
