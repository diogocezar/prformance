/**
 * Cliente para envio de mensagens para o Discord via webhooks
 */

const axios = require("axios");
const config = require("../config");
const log = require("./logger");

/**
 * Envia uma mensagem para o Discord usando um webhook
 * @param {string} content Conteúdo da mensagem
 * @param {string} webhookUrl URL do webhook (opcional, usa a configuração global se não fornecida)
 * @returns {Promise<object>} Resposta do Discord
 */
async function sendMessage(content, webhookUrl = config.discord.webhookUrl) {
  if (!webhookUrl) {
    throw new Error("URL do webhook do Discord não configurada");
  }

  try {
    // Preparar o payload do webhook
    const payload = {
      content,
      username: config.discord.username,
      avatar_url: config.discord.avatarUrl,
      allowed_mentions: { parse: [] }, // Não notificar ninguém
    };

    // Enviar para o Discord
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    log.success("Mensagem enviada com sucesso para o Discord");
    return response.data;
  } catch (error) {
    log.error("Erro ao enviar mensagem para o Discord", {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

module.exports = {
  sendMessage,
};
