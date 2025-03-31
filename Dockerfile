FROM node:18-alpine

# Instalar cron e outras dependências necessárias
RUN apk add --no-cache dcron tzdata

# Configurar o timezone
ENV TZ=America/Sao_Paulo

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos do projeto
COPY package*.json ./

# Instalar dependências (só produção)
RUN npm install --production

# Copiar o resto dos arquivos
COPY . .

# Configurar logs e diretórios
RUN mkdir -p /app/logs && touch /app/logs/cron-discord.log

# Criar script para envio semanal
RUN echo '#!/bin/sh' > /app/send-weekly.sh && \
  echo 'END_DATE=$(date +%Y-%m-%d)' >> /app/send-weekly.sh && \
  echo 'TODAY=$(date +%-d 2>/dev/null || date +%d)' >> /app/send-weekly.sh && \
  echo 'MONTH=$(date +%-m 2>/dev/null || date +%m)' >> /app/send-weekly.sh && \
  echo 'YEAR=$(date +%Y)' >> /app/send-weekly.sh && \
  echo 'DAY=$((TODAY - 7))' >> /app/send-weekly.sh && \
  echo 'if [ $DAY -le 0 ]; then' >> /app/send-weekly.sh && \
  echo '  MONTH=$((MONTH - 1))' >> /app/send-weekly.sh && \
  echo '  if [ $MONTH -eq 0 ]; then' >> /app/send-weekly.sh && \
  echo '    MONTH=12' >> /app/send-weekly.sh && \
  echo '    YEAR=$((YEAR - 1))' >> /app/send-weekly.sh && \
  echo '  fi' >> /app/send-weekly.sh && \
  echo '  case $MONTH in' >> /app/send-weekly.sh && \
  echo '    1|3|5|7|8|10|12) DAY=$((DAY + 31));;' >> /app/send-weekly.sh && \
  echo '    4|6|9|11) DAY=$((DAY + 30));;' >> /app/send-weekly.sh && \
  echo '    2) DAY=$((DAY + 28));;' >> /app/send-weekly.sh && \
  echo '  esac' >> /app/send-weekly.sh && \
  echo 'fi' >> /app/send-weekly.sh && \
  echo 'if [ $DAY -lt 10 ]; then START_DAY="0$DAY"; else START_DAY="$DAY"; fi' >> /app/send-weekly.sh && \
  echo 'if [ $MONTH -lt 10 ]; then START_MONTH="0$MONTH"; else START_MONTH="$MONTH"; fi' >> /app/send-weekly.sh && \
  echo 'START_DATE="${YEAR}-${START_MONTH}-${START_DAY}"' >> /app/send-weekly.sh && \
  echo 'echo "Período: $START_DATE a $END_DATE"' >> /app/send-weekly.sh && \
  echo 'cd /app && node src/scripts/send-to-discord.js --startDate="$START_DATE" --endDate="$END_DATE"' >> /app/send-weekly.sh && \
  chmod +x /app/send-weekly.sh

# Adicionar o job ao crontab (segunda-feira às 09:00)
RUN echo "0 9 * * 1 /app/send-weekly.sh > /app/logs/cron-discord.log 2>&1" > /etc/crontabs/root

# Criar script de inicialização simples
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
  echo 'echo "PR Performance Tracker iniciado!"' >> /app/entrypoint.sh && \
  echo 'echo "Job agendado: enviar ranking toda segunda às 09:00"' >> /app/entrypoint.sh && \
  echo 'crond -f -l 8' >> /app/entrypoint.sh && \
  chmod +x /app/entrypoint.sh

# Executar o cron em foreground
CMD ["/bin/sh", "/app/entrypoint.sh"] 