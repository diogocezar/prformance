const octokit = require("./githubClient");
const log = require("./logger");
const config = require("../config");

/**
 * Classe para gerenciar os limites de taxa da API do GitHub
 */
class RateLimitHandler {
  constructor() {
    this.rateLimits = {
      core: {
        limit: 5000,
        remaining: 5000,
        reset: Date.now() / 1000 + 3600,
      },
      search: {
        limit: 30,
        remaining: 30,
        reset: Date.now() / 1000 + 60,
      },
    };
    this.lastCheck = 0;
    this.checkInterval = config.rateLimit.checkInterval;
    this.maxWaitTime = config.rateLimit.maxWaitTime;
  }

  /**
   * Verifica os limites de taxa atuais da API do GitHub
   * @returns {Promise<Object>} - Informações sobre os limites de taxa
   */
  async checkRateLimit() {
    try {
      const now = Date.now();

      // Só verificar novamente se passou o intervalo mínimo
      if (now - this.lastCheck < this.checkInterval) {
        return this.rateLimits;
      }

      const { data } = await octokit.rest.rateLimit.get();
      this.rateLimits = data.resources;
      this.lastCheck = now;

      log.debug("Limites de taxa atualizados", {
        core: {
          limit: this.rateLimits.core.limit,
          remaining: this.rateLimits.core.remaining,
          resetAt: new Date(this.rateLimits.core.reset * 1000).toISOString(),
        },
        search: {
          limit: this.rateLimits.search.limit,
          remaining: this.rateLimits.search.remaining,
          resetAt: new Date(this.rateLimits.search.reset * 1000).toISOString(),
        },
      });

      return this.rateLimits;
    } catch (error) {
      log.error("Erro ao verificar limites de taxa", {
        error: error.message,
        stack: error.stack,
      });
      return this.rateLimits;
    }
  }

  /**
   * Verifica se ainda há requisições disponíveis para o tipo especificado
   * @param {string} type - Tipo de limite (core, search, etc.)
   * @returns {Promise<boolean>} - true se há requisições disponíveis, false caso contrário
   */
  async hasRemainingRequests(type = "core") {
    const limits = await this.checkRateLimit();
    return limits[type]?.remaining > 0;
  }

  /**
   * Calcula o tempo de espera até que o limite seja resetado
   * @param {string} type - Tipo de limite (core, search, etc.)
   * @returns {Promise<number>} - Tempo de espera em milissegundos
   */
  async getWaitTime(type = "core") {
    const limits = await this.checkRateLimit();
    const resetTime = limits[type]?.reset || 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, resetTime - now) * 1000;
  }

  /**
   * Executa uma função com verificação de limite de taxa
   * @param {Function} fn - Função a ser executada
   * @param {string} type - Tipo de limite (core, search, etc.)
   * @param {Array} args - Argumentos para a função
   * @returns {Promise<any>} - Resultado da função
   */
  async executeWithRateLimit(fn, type = "core", ...args) {
    if (!(await this.hasRemainingRequests(type))) {
      const waitTime = await this.getWaitTime(type);
      log.warn(
        `Limite de requisições atingido. Aguardando ${Math.ceil(
          waitTime / 1000
        )} segundos.`
      );

      // Se o tempo de espera for muito longo, lançar erro
      if (waitTime > this.maxWaitTime) {
        throw new Error(
          `Limite de requisições atingido. Tempo de espera muito longo: ${Math.ceil(
            waitTime / 1000
          )} segundos.`
        );
      }

      // Aguardar até que o limite seja resetado
      await new Promise((resolve) => setTimeout(resolve, waitTime + 1000)); // +1s de margem
    }

    try {
      return await fn(...args);
    } catch (error) {
      // Verificar se o erro é de limite de taxa
      if (
        error.status === 403 &&
        error.message.includes("API rate limit exceeded")
      ) {
        const waitTime = await this.getWaitTime(type);
        log.warn(
          `Limite de requisições atingido durante execução. Aguardando ${Math.ceil(
            waitTime / 1000
          )} segundos.`
        );

        // Se o tempo de espera for muito longo, lançar erro
        if (waitTime > this.maxWaitTime) {
          throw new Error(
            `Limite de requisições atingido. Tempo de espera muito longo: ${Math.ceil(
              waitTime / 1000
            )} segundos.`
          );
        }

        // Aguardar e tentar novamente
        await new Promise((resolve) => setTimeout(resolve, waitTime + 1000));
        return this.executeWithRateLimit(fn, type, ...args);
      }

      throw error;
    }
  }
}

// Criar e exportar uma instância única
const rateLimitHandler = new RateLimitHandler();
module.exports = rateLimitHandler;
