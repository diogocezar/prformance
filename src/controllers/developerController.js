const developerService = require("../services/developerService");
const log = require("../utils/logger");
const cacheManager = require("../utils/cacheManager");

/**
 * Obtém a performance dos desenvolvedores no período especificado
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} res - Objeto de resposta Express
 * @param {Function} next - Função next do Express
 */
async function getDeveloperPerformance(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    log.debug("Processando requisição de performance", { startDate, endDate });

    // Validar parâmetros
    if (!startDate || !endDate) {
      log.warn("Requisição sem parâmetros obrigatórios", {
        startDate: startDate || "ausente",
        endDate: endDate || "ausente",
      });
      return res.status(400).json({
        error: "Os parâmetros startDate e endDate são obrigatórios",
        example:
          "/api/developers/performance?startDate=2024-01-01&endDate=2024-02-01",
      });
    }

    // Validar formato das datas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      log.warn("Formato de data inválido", { startDate, endDate });
      return res.status(400).json({
        error: "As datas devem estar no formato YYYY-MM-DD",
        example:
          "/api/developers/performance?startDate=2024-01-01&endDate=2024-02-01",
      });
    }

    log.info(
      `Calculando performance para o período: ${startDate} a ${endDate}`
    );

    // Usar o gerenciador de cache para a requisição de performance
    const cacheKey = `performance_${startDate}_${endDate}`;
    const result = await cacheManager.withCache(cacheKey, async () => {
      // Calcular a performance dos desenvolvedores
      return await developerService.calculateDeveloperPerformance(
        startDate,
        endDate
      );
    });

    log.success(
      `Performance calculada com sucesso: ${result.developers.length} desenvolvedores`
    );

    // Retornar o resultado
    return res.json(result);
  } catch (error) {
    log.error("Erro ao obter performance dos desenvolvedores", {
      error: error.message,
      stack: error.stack,
    });

    // Passar o erro para o middleware de tratamento de erros
    return next(error);
  }
}

module.exports = {
  getDeveloperPerformance,
};
