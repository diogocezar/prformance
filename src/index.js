const {
  calculateDeveloperPerformance,
} = require("./services/developerService");
const config = require("./config");
const log = require("./utils/logger");

/**
 * Função para executar o script a partir da linha de comando
 */
async function main() {
  try {
    // Verificar se os argumentos foram fornecidos
    const args = process.argv.slice(2);

    // Se não houver argumentos, iniciar o servidor
    if (args.length === 0) {
      log.start("Iniciando o servidor...");
      require("./server");
      return;
    }

    // Se houver argumentos, executar o CLI
    if (args.length !== 2) {
      log.error("Argumentos inválidos");
      log.info("Uso: node index.js <data_inicio> <data_fim>");
      log.info("Exemplo: node index.js 2024-01-01 2024-02-01");
      log.info("Ou execute sem argumentos para iniciar o servidor API.");
      process.exit(1);
    }

    const [startDate, endDate] = args;
    log.start(
      `Iniciando análise de performance no período de ${startDate} a ${endDate}`
    );

    const startTime = process.hrtime();
    // Calcular a performance dos desenvolvedores
    const result = await calculateDeveloperPerformance(startDate, endDate);
    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] + endTime[1] / 1e9).toFixed(2);

    log.end(`Análise concluída em ${executionTime} segundos`);
    log.perf(
      `Total de desenvolvedores analisados: ${result.developers.length}`
    );

    // Imprimir o resultado
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    log.fatal("Erro fatal na execução", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Executar a função principal
main();

// Exportar funções para testes
module.exports = {
  calculateDeveloperPerformance,
};
