const { Octokit } = require("octokit");
const config = require("../config");

// Criar e exportar uma instância do Octokit
const octokit = new Octokit({
  auth: config.github.token,
});

// Exportar o cliente antes de usar o logger
module.exports = octokit;

// Registrar informações após exportar (para evitar referência circular)
try {
  const log = require("./logger");

  log.github("Inicializando cliente GitHub", {
    organization: config.github.organization,
    tokenProvided: !!config.github.token,
  });

  log.success("Cliente GitHub inicializado com sucesso");
} catch (error) {
  console.log("🐙 Cliente GitHub inicializado com sucesso");
}
