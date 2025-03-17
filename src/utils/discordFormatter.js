/**
 * Formata os dados de performance para envio pelo Discord
 */
const formatDiscordMessage = (data) => {
  if (!data || !data.developers || data.developers.length === 0) {
    return "🔍 **Ops! Parece que ninguém trabalhou nesse período!** 🏝️\nTodos estavam de férias ou foi só um bug? 🤔";
  }

  const { startDate, endDate, developers } = data;

  // Limitar a 25 desenvolvedores para evitar mensagens muito longas no Discord
  const topDevelopers = developers.slice(0, 25);

  // Gerar títulos divertidos para o ranking
  const rankingTitles = [
    "🏆 **HALL DA FAMA DOS DEVS** 🏆",
    "🚀 **SUPERSTARS DO CÓDIGO** 🚀",
    "⭐ **NINJAS DO COMMIT** ⭐",
    "🔥 **OS MESTRES DO PULL REQUEST** 🔥",
    "💻 **SUPER DEVS EM AÇÃO** 💻",
  ];

  // Escolher um título aleatoriamente
  const randomTitle =
    rankingTitles[Math.floor(Math.random() * rankingTitles.length)];

  // Criar o cabeçalho da mensagem
  let message = `# ${randomTitle}\n\n`;
  message += `## 📊 Ranking de Performance (${startDate} a ${endDate}) 📊\n\n`;

  // Adicionar uma mensagem introdutória divertida
  const introMessages = [
    "🎭 Senhoras e senhores, preparem-se para o show dos campeões do código!",
    "🎪 Bem-vindos à arena onde os verdadeiros heróis do Git brilham!",
    "🎯 A batalha foi intensa, os commits foram muitos, e aqui estão os vitoriosos!",
    "🧙‍♂️ Os magos do teclado trabalharam duro e aqui está o resultado da magia!",
    "🦸‍♀️ Qual super dev saiu na frente? Descubra agora!",
  ];

  // Escolher uma mensagem introdutória aleatoriamente
  const randomIntro =
    introMessages[Math.floor(Math.random() * introMessages.length)];
  message += `${randomIntro}\n\n`;

  // Adicionar cada desenvolvedor ao ranking
  topDevelopers.forEach((dev, index) => {
    const { username, score, contributions } = dev;

    // Emoji com base na posição
    let positionEmoji = "";
    if (index === 0) positionEmoji = "🥇";
    else if (index === 1) positionEmoji = "🥈";
    else if (index === 2) positionEmoji = "🥉";
    else if (index < 10) positionEmoji = "🏅";
    else positionEmoji = "🔹";

    // Emoji para mostrar o tipo de desenvolvedor com base no score
    let devTypeEmoji = "";
    if (score > 200) devTypeEmoji = "🦄"; // Unicórnio raro
    else if (score > 150) devTypeEmoji = "🐉"; // Dragão poderoso
    else if (score > 100) devTypeEmoji = "🦊"; // Raposa astuta
    else if (score > 50) devTypeEmoji = "🐯"; // Tigre forte
    else devTypeEmoji = "🐢"; // Tartaruga persistente

    // Formatando cada linha do ranking com emoji e markdown
    message += `### ${positionEmoji} #${
      index + 1
    }: **${username}** ${devTypeEmoji}\n`;
    message += `> 🌟 **Score:** ${score} pontos\n\n`;

    // Criar o resumo das contribuições como lista
    message += "**Contribuições:**\n";

    const contributionsList = [];

    if (contributions.commits.number > 0) {
      contributionsList.push(
        `• 📝 **Commits:** ${contributions.commits.number}`
      );
    }

    if (contributions.pull_requests_opened.number > 0) {
      contributionsList.push(
        `• 🔀 **PRs abertos:** ${contributions.pull_requests_opened.number}`
      );
    }

    if (contributions.pull_requests_reviewed.number > 0) {
      contributionsList.push(
        `• 👀 **PRs revisados:** ${contributions.pull_requests_reviewed.number}`
      );
    }

    if (contributions.issues_opened.number > 0) {
      contributionsList.push(
        `• 🐛 **Issues abertas:** ${contributions.issues_opened.number}`
      );
    }

    if (contributions.issues_closed.number > 0) {
      contributionsList.push(
        `• ✅ **Issues fechadas:** ${contributions.issues_closed.number}`
      );
    }

    if (contributions.pr_comments.number > 0) {
      contributionsList.push(
        `• 💬 **Comentários:** ${contributions.pr_comments.number}`
      );
    }

    if (contributions.branches_created.number > 0) {
      contributionsList.push(
        `• 🌿 **Branches:** ${contributions.branches_created.number}`
      );
    }

    message += contributionsList.join("\n");
    message += "\n\n";

    // Adicionar um comentário divertido para os 3 primeiros
    if (index === 0) {
      message += `> 🏆 *"O código deste dev é tão limpo que até o Sonar fica com inveja!"*\n\n`;
    } else if (index === 1) {
      message += `> 🥈 *"Quase lá! Da próxima vez traga mais café e você chega no topo!"*\n\n`;
    } else if (index === 2) {
      message += `> 🥉 *"Bronze é o novo ouro, continue debugando que você chega lá!"*\n\n`;
    }

    // Adicionar um separador entre os devs
    message += "---\n\n";
  });

  // Adicionar nota de rodapé
  if (developers.length > 25) {
    message += `*... e mais ${
      developers.length - 25
    } desenvolvedores ficaram fora do pódio desta vez. Continuem codando!* 💪\n\n`;
  }

  // Adicionar mensagem de conclusão divertida
  const outroMessages = [
    "🎉 **Parabéns a todos que participaram!** 🎉 Lembrem-se: um bom código é como uma boa piada - deve ser limpo, funcional e fazer sentido para os outros!",
    "⏰ **A corrida nunca termina!** ⏰ Quem será o próximo a dominar a arte do Git e subir no ranking? Fiquem ligados!",
    "🧘‍♂️ **Código não é só sobre números!** 🧘‍♀️ Mas não vamos negar que é bem legal ver seu nome no topo do ranking, né?",
    "🚀 **Muito código foi escrito, muito café foi consumido!** ☕ Continuem assim e o próximo ranking promete surpresas!",
  ];

  // Escolher uma mensagem de conclusão aleatoriamente
  const randomOutro =
    outroMessages[Math.floor(Math.random() * outroMessages.length)];
  message += `${randomOutro}\n\n`;

  message += `*Gerado automaticamente pelo PR Performance Tracker* 🤖`;

  return message;
};

module.exports = {
  formatDiscordMessage,
};
