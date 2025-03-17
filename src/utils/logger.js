const pino = require("pino");

// Configuração do Pino com emojis para diferentes níveis de log
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  customLevels: {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return "warn";
    if (res.statusCode >= 500 || err) return "error";
    return "info";
  },
});

// Mapeamento de emojis para cada nível de log
const emojis = {
  fatal: "💀", // Caveira para erros fatais
  error: "❌", // X vermelho para erros
  warn: "⚠️", // Aviso para warnings
  info: "📝", // Nota para informações
  debug: "🔍", // Lupa para debug
  trace: "🔬", // Microscópio para trace
  http: "🌐", // Globo para requisições HTTP
  success: "✅", // Check verde para sucesso
  start: "🚀", // Foguete para início de processos
  end: "🏁", // Bandeira para fim de processos
  config: "⚙️", // Engrenagem para configurações
  github: "🐙", // Polvo (logo do GitHub) para operações do GitHub
  db: "💾", // Disquete para operações de banco de dados
  api: "🔌", // Plugue para operações de API
  auth: "🔑", // Chave para autenticação
  user: "👤", // Silhueta para operações de usuário
  dev: "👨‍💻", // Desenvolvedor para operações de desenvolvimento
  perf: "📊", // Gráfico para métricas de performance
};

// Função auxiliar para adicionar emojis aos logs
const log = {
  fatal: (msg, obj = {}) => logger.fatal({ ...obj }, `${emojis.fatal} ${msg}`),
  error: (msg, obj = {}) => logger.error({ ...obj }, `${emojis.error} ${msg}`),
  warn: (msg, obj = {}) => logger.warn({ ...obj }, `${emojis.warn} ${msg}`),
  info: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.info} ${msg}`),
  debug: (msg, obj = {}) => logger.debug({ ...obj }, `${emojis.debug} ${msg}`),
  trace: (msg, obj = {}) => logger.trace({ ...obj }, `${emojis.trace} ${msg}`),
  http: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.http} ${msg}`),
  success: (msg, obj = {}) =>
    logger.info({ ...obj }, `${emojis.success} ${msg}`),
  start: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.start} ${msg}`),
  end: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.end} ${msg}`),
  config: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.config} ${msg}`),
  github: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.github} ${msg}`),
  db: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.db} ${msg}`),
  api: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.api} ${msg}`),
  auth: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.auth} ${msg}`),
  user: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.user} ${msg}`),
  dev: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.dev} ${msg}`),
  perf: (msg, obj = {}) => logger.info({ ...obj }, `${emojis.perf} ${msg}`),
};

module.exports = log;
