const express = require("express");
const developerController = require("../controllers/developerController");
const log = require("../utils/logger");

const router = express.Router();

log.info("Configurando rotas de desenvolvedores");

/**
 * @route   GET /api/developers/performance
 * @desc    Obtém a performance dos desenvolvedores no período especificado
 * @access  Public
 * @query   {string} startDate - Data de início no formato YYYY-MM-DD
 * @query   {string} endDate - Data de fim no formato YYYY-MM-DD
 */
router.get("/performance", (req, res, next) => {
  log.http("Requisição recebida: GET /api/developers/performance", {
    query: req.query,
    ip: req.ip,
  });
  developerController.getDeveloperPerformance(req, res, next);
});

log.success("Rotas de desenvolvedores configuradas com sucesso");

module.exports = router;
