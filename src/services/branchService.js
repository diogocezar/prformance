const repositoryService = require("./repositoryService");
const log = require("../utils/logger");

/**
 * Busca branches criadas em um repositório no período especificado
 * @param {string} repo - Nome do repositório
 * @param {string} since - Data de início
 * @param {string} until - Data de fim
 * @returns {Promise<Array>} - Lista de branches
 */
async function getBranches(repo, since, until) {
  log.debug(`Buscando branches para ${repo} no período especificado`);
  return await repositoryService.getBranches(repo, since, until);
}

module.exports = {
  getBranches,
};
