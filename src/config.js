require("dotenv").config();

const config = {
  // Configuração do GitHub
  github: {
    token: process.env.GITHUB_TOKEN,
    organization: process.env.GITHUB_ORG,
  },

  // Pesos para cálculo do score
  weights: {
    commits: 2,
    pull_requests_opened: 5,
    pull_requests_reviewed: 3,
    issues_opened: 1,
    issues_closed: 4,
    pr_comments: 2,
    branches_created: 1,
  },

  // Configuração de concorrência
  concurrency: {
    maxConcurrentRepos: parseInt(process.env.MAX_CONCURRENT_REPOS || 30),
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || 10),
  },

  // Configuração do servidor
  server: {
    port: process.env.PORT || 3000,
  },

  // Configuração do Discord
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    username: process.env.DISCORD_BOT_USERNAME || "PR Performance Bot",
    avatarUrl: process.env.DISCORD_BOT_AVATAR_URL || "",
  },

  // Configuração de cache e limites de taxa
  cache: {
    // Tempo de expiração do cache em milissegundos (1 hora por padrão)
    expirationTime: parseInt(process.env.CACHE_EXPIRATION_TIME || 3600000),
    // Habilitar cache para requisições à API do GitHub
    enabled: process.env.ENABLE_CACHE !== "false",
  },

  // Configuração de limites de taxa
  rateLimit: {
    // Intervalo mínimo entre verificações de limite de taxa (em milissegundos)
    checkInterval: parseInt(process.env.RATE_LIMIT_CHECK_INTERVAL || 60000),
    // Tempo máximo de espera para reset de limite de taxa (em milissegundos)
    maxWaitTime: parseInt(process.env.RATE_LIMIT_MAX_WAIT_TIME || 300000),
    // Tamanho do lote para processamento de branches
    batchSize: parseInt(process.env.RATE_LIMIT_BATCH_SIZE || 5),
    // Intervalo entre lotes (em milissegundos)
    batchInterval: parseInt(process.env.RATE_LIMIT_BATCH_INTERVAL || 1000),
  },
};

// Exportar a configuração antes de usar o logger
module.exports = config;

// Registrar as configurações após exportar (para evitar referência circular)
try {
  const log = require("./utils/logger");
  log.config("Configurações carregadas", {
    organization: config.github.organization,
    port: config.server.port,
    maxConcurrentRepos: config.concurrency.maxConcurrentRepos,
    maxConcurrentRequests: config.concurrency.maxConcurrentRequests,
    cacheEnabled: config.cache.enabled,
    cacheExpirationTime: `${config.cache.expirationTime / 1000} segundos`,
    rateLimitCheckInterval: `${config.rateLimit.checkInterval / 1000} segundos`,
    rateLimitMaxWaitTime: `${config.rateLimit.maxWaitTime / 1000} segundos`,
    discordWebhookConfigured: !!config.discord.webhookUrl,
  });
} catch (error) {
  console.log("⚙️ Configurações carregadas (logger não disponível)");
}
