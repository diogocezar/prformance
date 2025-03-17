#!/usr/bin/env node

const {
  calculateDeveloperPerformance,
} = require("../services/developerService");
const log = require("../utils/logger");

/**
 * Script para analisar o mês anterior (do primeiro dia ao último dia)
 */
async function analyzeLastMonth() {
  try {
    // Obter o primeiro dia do mês anterior
    const today = new Date();
    const firstDayOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    // Obter o primeiro dia do mês atual (último dia do mês anterior)
    const firstDayOfThisMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    // Ajustar para o último dia do mês anterior
    const lastDayOfLastMonth = new Date(firstDayOfThisMonth);
    lastDayOfLastMonth.setDate(lastDayOfLastMonth.getDate() - 1);

    // Formatar as datas
    const startDate = firstDayOfLastMonth.toISOString().split("T")[0];
    const endDate = lastDayOfLastMonth.toISOString().split("T")[0];

    log.start(`Analisando mês anterior: ${startDate} até ${endDate}`);

    // Calcular a performance
    const result = await calculateDeveloperPerformance(startDate, endDate);

    // Imprimir o resultado
    console.log(JSON.stringify(result, null, 2));

    log.success(
      `Análise concluída: ${result.developers.length} desenvolvedores analisados`
    );
  } catch (error) {
    log.fatal("Erro ao analisar mês anterior", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Executar o script
analyzeLastMonth();
