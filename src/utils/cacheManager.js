const config = require("../config");
const log = require("./logger");

/**
 * Gerenciador de cache para armazenar resultados de requisições
 */
class CacheManager {
  constructor() {
    this.cache = {};
    this.lastUpdated = {};
    this.expirationTime = config.cache.expirationTime;
    this.enabled = config.cache.enabled;

    log.config("Cache manager inicializado", {
      enabled: this.enabled,
      expirationTime: `${this.expirationTime / 1000} segundos`,
    });
  }

  /**
   * Obtém um item do cache
   * @param {string} key - Chave do item
   * @returns {any|null} - Item do cache ou null se não existir ou estiver expirado
   */
  get(key) {
    if (!this.enabled) {
      return null;
    }

    const now = Date.now();
    if (this.cache[key] && now - this.lastUpdated[key] < this.expirationTime) {
      const itemCount = Array.isArray(this.cache[key])
        ? this.cache[key].length
        : 1;
      log.debug(`Cache hit para ${key} (${itemCount} itens)`);
      return this.cache[key];
    }

    log.debug(`Cache miss para ${key}`);
    return null;
  }

  /**
   * Armazena um item no cache
   * @param {string} key - Chave do item
   * @param {any} value - Valor a ser armazenado
   */
  set(key, value) {
    if (!this.enabled) {
      return;
    }

    this.cache[key] = value;
    this.lastUpdated[key] = Date.now();
    const itemCount = Array.isArray(value) ? value.length : 1;
    log.debug(`Cache set para ${key} (${itemCount} itens)`);
  }

  /**
   * Limpa o cache
   */
  clear() {
    this.cache = {};
    this.lastUpdated = {};
    log.info("Cache limpo");
  }

  /**
   * Limpa um item específico do cache
   * @param {string} key - Chave do item
   */
  clearItem(key) {
    delete this.cache[key];
    delete this.lastUpdated[key];
    log.debug(`Cache limpo para ${key}`);
  }

  /**
   * Executa uma função com cache
   * @param {string} key - Chave do cache
   * @param {Function} fn - Função a ser executada se não houver cache
   * @returns {Promise<any>} - Resultado da função ou do cache
   */
  async withCache(key, fn) {
    const cachedResult = this.get(key);
    if (cachedResult !== null) {
      return cachedResult;
    }

    const result = await fn();
    this.set(key, result);
    return result;
  }
}

// Criar e exportar uma instância única
const cacheManager = new CacheManager();
module.exports = cacheManager;
