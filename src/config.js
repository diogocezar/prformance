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
    maxConcurrentRepos: 30,
    maxConcurrentRequests: 10,
  },

  // Configuração do servidor
  server: {
    port: process.env.PORT || 3000,
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
  });
} catch (error) {
  console.log("⚙️ Configurações carregadas (logger não disponível)");
}
