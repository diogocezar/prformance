/**
 * Formata os dados de performance para envio pelo Discord
 * Limitado a 2000 caracteres
 */
const formatDiscordMessage = (data) => {
  if (!data || !data.developers || data.developers.length === 0) {
    return "🔍 **Nenhum desenvolvedor encontrado no período!**";
  }

  const { startDate, endDate, developers } = data;

  // Limitar a apenas 10 desenvolvedores para manter a mensagem curta
  const topDevelopers = developers.slice(0, 10);

  // Título mais compacto (H1)
  let message = `# 🏆 Ranking de Performance\n`;
  message += `## ${startDate} a ${endDate}\n\n`;

  // Introdução curta e aleatória
  const introMessages = [
    "🎭 Senhoras e senhores, preparem-se para o show dos campeões do código!",
    "🎪 Bem-vindos à arena onde os verdadeiros heróis do Git brilham!",
    "🎯 A batalha foi intensa, os commits foram muitos, e aqui estão os vitoriosos!",
    "🧙‍♂️ Os magos do teclado trabalharam duro e aqui está o resultado da magia!",
    "🦸‍♀️ Qual super dev saiu na frente? Descubra agora!",
  ];
  message += `${
    introMessages[Math.floor(Math.random() * introMessages.length)]
  }\n\n`;

  // Adicionar cada desenvolvedor ao ranking de forma compacta
  topDevelopers.forEach((dev, index) => {
    const { username, score, contributions } = dev;

    // Emoji com base na posição (apenas para os 3 primeiros)
    let positionEmoji = "";
    if (index === 0) positionEmoji = "🥇";
    else if (index === 1) positionEmoji = "🥈";
    else if (index === 2) positionEmoji = "🥉";
    else positionEmoji = "🔸";

    // Formatando cada linha do ranking com H3 para os medalhistas e texto bold para os demais
    if (index < 3) {
      message += `### ${positionEmoji} ${
        index + 1
      }. ${username} (${score} pts)\n`;
    } else {
      message += `**${positionEmoji} ${
        index + 1
      }. ${username} (${score} pts)**\n`;
    }

    // Criar resumo simplificado das contribuições
    const contribLines = [];

    if (contributions.commits.number > 0) {
      contribLines.push(`📝 ${contributions.commits.number} commits`);
    }

    if (contributions.pull_requests_opened.number > 0) {
      contribLines.push(`🔀 ${contributions.pull_requests_opened.number} PRs`);
    }

    if (contributions.pull_requests_reviewed.number > 0) {
      contribLines.push(
        `👀 ${contributions.pull_requests_reviewed.number} reviews`
      );
    }

    // Juntar em uma única linha para economizar espaço
    if (contribLines.length > 0) {
      message += `${contribLines.join(" | ")}\n`;
    }

    // Mais contribuições em uma segunda linha
    const moreContribs = [];

    if (contributions.issues_opened.number > 0) {
      moreContribs.push(`🐛 ${contributions.issues_opened.number} issues`);
    }

    if (contributions.issues_closed.number > 0) {
      moreContribs.push(`✅ ${contributions.issues_closed.number} fechadas`);
    }

    if (contributions.pr_comments.number > 0) {
      moreContribs.push(`💬 ${contributions.pr_comments.number} comentários`);
    }

    if (moreContribs.length > 0) {
      message += `${moreContribs.join(" | ")}\n`;
    }

    // Separador simples para economizar espaço
    message += "\n";
  });

  // Adicionar nota de rodapé compacta
  if (developers.length > 10) {
    message += `_...e mais ${
      developers.length - 10
    } devs. Continue codando!_ 💪\n\n`;
  }

  // Mensagem de conclusão curta mas divertida
  const outroMessages = [
    "🎉 **Parabéns a todos!** Até o próximo ranking!",
    "⏰ **A corrida continua!** Quem será o próximo campeão?",
    "🚀 **Código, café e persistência!** Nos vemos na próxima!",
  ];

  message += `${
    outroMessages[Math.floor(Math.random() * outroMessages.length)]
  }\n`;

  // Verificar tamanho da mensagem e truncar se necessário
  if (message.length > 1950) {
    // deixando margem de segurança
    message = message.substring(0, 1950) + "...\n(mensagem truncada)";
  }

  return message;
};

module.exports = {
  formatDiscordMessage,
};
