#!/usr/bin/env node

const {
  calculateDeveloperPerformance,
} = require("../services/developerService");
const log = require("../utils/logger");

/**
 * Script para analisar o mês atual (do primeiro dia até hoje)
 */
async function analyzeThisMonth() {
  try {
    // Obter o primeiro dia do mês atual
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Formatar as datas
    const startDate = firstDayOfMonth.toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];

    log.start(`Analisando mês atual: ${startDate} até ${endDate}`);

    // Calcular a performance
    const result = await calculateDeveloperPerformance(startDate, endDate);

    // Imprimir o resultado
    console.log(JSON.stringify(result, null, 2));

    log.success(
      `Análise concluída: ${result.developers.length} desenvolvedores analisados`
    );
  } catch (error) {
    log.fatal("Erro ao analisar mês atual", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Executar o script
analyzeThisMonth();
