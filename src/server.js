const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const config = require("./config");
const log = require("./utils/logger");
const pino = require("pino-http")();

// Importar rotas
const developerRoutes = require("./routes/developerRoutes");

// Inicializar o app Express
const app = express();

log.start("Inicializando servidor Express");

// Configurar middlewares
app.use(cors());
log.info("Middleware CORS configurado");

app.use(express.json());
log.info("Middleware JSON configurado");

app.use(morgan("dev"));
log.info("Middleware Morgan configurado");

app.use(pino);
log.info("Middleware Pino HTTP configurado");

// Configurar pasta de arquivos estáticos
app.use(express.static(path.join(__dirname, "views")));
log.info("Pasta de arquivos estáticos configurada");

// Rota raiz
app.get("/", (req, res) => {
  log.http("Requisição recebida na rota raiz");
  res.json({
    message:
      "API PRFormance - Análise de performance de desenvolvedores no GitHub",
    endpoints: {
      developers:
        "/api/developers/performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD",
      visualization: "/visualization",
    },
  });
});

// Rota para a visualização HTML
app.get("/visualization", (req, res) => {
  log.http("Requisição recebida na rota de visualização");
  res.sendFile(path.join(__dirname, "views", "performance.html"));
});

// Configurar rotas
app.use("/api/developers", developerRoutes);
log.info("Rotas de desenvolvedores configuradas");

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  log.error("Erro na aplicação", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Erro interno do servidor" });
});

// Iniciar o servidor
const PORT = config.server.port;
app.listen(PORT, () => {
  log.success(`Servidor rodando na porta ${PORT}`);
  log.info(`Acesse: http://localhost:${PORT}`);
  log.info(`Visualização: http://localhost:${PORT}/visualization`);
});

module.exports = app;
