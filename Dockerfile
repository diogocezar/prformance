FROM node:18-alpine

# Instalar cron e outras dependências necessárias
RUN apk add --no-cache dcron tzdata

# Configurar o timezone
ENV TZ=America/Sao_Paulo

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos do projeto
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Configurar o cron
RUN mkdir -p /var/log/cron
RUN touch /var/log/cron/cron.log

# Adicionar o job ao crontab (segunda-feira às 09:00)
RUN echo "0 9 * * 1 cd /app && npm run send-discord-last-week >> /var/log/cron/cron.log 2>&1" > /etc/crontabs/root

# Criar script de inicialização
RUN echo "#!/bin/sh" > /entrypoint.sh && \
  echo "echo \"Iniciando serviço de agendamento...\"" >> /entrypoint.sh && \
  echo "echo \"Job agendado: enviar ranking da última semana para o Discord todas as segundas-feiras às 09:00\"" >> /entrypoint.sh && \
  echo "crond -f -l 8" >> /entrypoint.sh && \
  chmod +x /entrypoint.sh

# Executar o cron em foreground para manter o container rodando
ENTRYPOINT ["/entrypoint.sh"] 