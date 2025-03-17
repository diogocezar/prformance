#!/usr/bin/env node

/**
 * Script para enviar o ranking de performance para o Discord
 *
 * Uso:
 * node send-to-discord.js --startDate=2024-01-01 --endDate=2024-02-01 [--webhook=URL]
 */

// Importar dependências
require("dotenv").config({ path: `${__dirname}/../../.env` });
const developerService = require("../services/developerService");
const discordFormatter = require("../utils/discordFormatter");
const discordClient = require("../utils/discordClient");
const log = require("../utils/logger");

// Processar argumentos da linha de comando
const args = process.argv.slice(2);
const params = {};

args.forEach((arg) => {
  const [key, value] = arg.split("=");
  if (value) {
    // Se o argumento tem um valor (--chave=valor)
    params[key.replace(/^--/, "")] = value;
  } else {
    // Se o argumento é uma flag sem valor (--flag)
    params[arg.replace(/^--/, "")] = true;
  }
});

// Validar parâmetros obrigatórios
if (!params.startDate || !params.endDate) {
  console.error(`
Erro: Parâmetros de data obrigatórios.

Uso: node send-to-discord.js --startDate=2024-01-01 --endDate=2024-02-01 [--webhook=URL]

Parâmetros:
  --startDate=YYYY-MM-DD   Data de início no formato YYYY-MM-DD (obrigatório)
  --endDate=YYYY-MM-DD     Data de fim no formato YYYY-MM-DD (obrigatório)
  --webhook=URL            URL do webhook do Discord (opcional, usa a configuração do .env se não fornecida)
`);
  process.exit(1);
}

/**
 * Função principal para enviar o ranking para o Discord
 */
async function sendRankingToDiscord() {
  try {
    log.start("Iniciando envio do ranking para o Discord");
    const { startDate, endDate, webhook } = params;

    // Validar formato das datas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      log.error("Formato de data inválido. Use YYYY-MM-DD");
      process.exit(1);
    }

    log.info(
      `Calculando performance para o período: ${startDate} a ${endDate}`
    );

    // Buscar dados de performance
    const performanceData =
      await developerService.calculateDeveloperPerformance(startDate, endDate);

    // Formatar mensagem para o Discord
    const formattedMessage = discordFormatter.formatDiscordMessage({
      ...performanceData,
      startDate,
      endDate,
    });

    // URL do webhook
    const webhookUrl = webhook || process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      log.error(
        "URL do webhook do Discord não configurada. Configure DISCORD_WEBHOOK_URL no .env ou forneça --webhook=URL"
      );
      process.exit(1);
    }

    // Enviar para o Discord
    log.info("Enviando mensagem para o Discord");
    try {
      await discordClient.sendMessage(formattedMessage, webhookUrl);
      log.success("Ranking enviado com sucesso para o Discord!");
    } catch (error) {
      log.error(`Falha ao enviar para o Discord: ${error.message}`);
      throw error;
    }

    process.exit(0);
  } catch (error) {
    log.error("Erro ao enviar ranking para o Discord", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Executar função principal
sendRankingToDiscord();
