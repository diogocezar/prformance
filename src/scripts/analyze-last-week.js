#!/usr/bin/env node

/**
 * Script para analisar a performance da última semana
 *
 * Uso:
 * node analyze-last-week.js
 */

// Importar dependências
require("dotenv").config({ path: `${__dirname}/../../.env` });
const developerService = require("../services/developerService");
const log = require("../utils/logger");

/**
 * Função principal para analisar a performance da última semana
 */
async function analyzeLastWeek() {
  try {
    log.start("Iniciando análise de performance da última semana");

    // Calcular datas (última semana)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 dias atrás

    // Formatar datas para YYYY-MM-DD
    const formattedStartDate = startDate.toISOString().split("T")[0];
    const formattedEndDate = endDate.toISOString().split("T")[0];

    log.info(
      `Calculando performance para o período: ${formattedStartDate} a ${formattedEndDate}`
    );

    // Buscar dados de performance
    const performanceData =
      await developerService.calculateDeveloperPerformance(
        formattedStartDate,
        formattedEndDate
      );

    // Exibir resultados
    log.success("Análise concluída com sucesso!");
    log.info(
      `Total de desenvolvedores analisados: ${performanceData.developers.length}`
    );

    // Exibir ranking
    console.log("\nRanking da última semana:");
    performanceData.developers.slice(0, 10).forEach((dev, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🔸";
      console.log(
        `${medal} ${index + 1}. ${dev.username} - ${dev.score} pontos`
      );
    });

    process.exit(0);
  } catch (error) {
    log.error("Erro ao analisar performance da última semana", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Executar função principal
analyzeLastWeek();
