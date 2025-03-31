#!/bin/bash

echo "============================================="
echo "   PR Performance Tracker - Envio Manual     "
echo "============================================="

# Calcular datas localmente (no sistema host)
END_DATE=$(date +%Y-%m-%d)

# Calcular data de 7 dias atrás de forma mais segura
TODAY=$(date +%-d 2>/dev/null || date +%d) # Sem zero à esquerda
MONTH=$(date +%-m 2>/dev/null || date +%m) # Sem zero à esquerda 
YEAR=$(date +%Y)

# Calcular data de 7 dias atrás
DAY=$((TODAY - 7))
if [ $DAY -le 0 ]; then
  MONTH=$((MONTH - 1))
  if [ $MONTH -eq 0 ]; then
    MONTH=12
    YEAR=$((YEAR - 1))
  fi
  
  case $MONTH in
    1|3|5|7|8|10|12) DAY=$((DAY + 31));;
    4|6|9|11) DAY=$((DAY + 30));;
    2) DAY=$((DAY + 28));;
  esac
fi

# Adicionar zero à esquerda para dia e mês
if [ $DAY -lt 10 ]; then 
  START_DAY="0$DAY"
else
  START_DAY="$DAY"
fi

if [ $MONTH -lt 10 ]; then
  START_MONTH="0$MONTH"
else
  START_MONTH="$MONTH"
fi

START_DATE="${YEAR}-${START_MONTH}-${START_DAY}"

echo "📆 Período: $START_DATE a $END_DATE"

# Verifica se o container está rodando
if docker ps | grep -q pr-performance; then
    echo "✅ Container pr-performance está rodando."
    echo "📊 Executando envio manual do ranking para o Discord..."
    docker exec pr-performance sh -c "cd /app && node src/scripts/send-to-discord.js --startDate=\"$START_DATE\" --endDate=\"$END_DATE\""
    echo "🚀 Comando executado! Verifique os logs para mais detalhes."
else
    echo "❌ Container pr-performance não está rodando."
    echo "🔄 Iniciando container temporário para envio..."
    
    # Obtém o diretório raiz do projeto (2 níveis acima)
    ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    
    # Verifica se o arquivo .env existe
    if [ ! -f "$ROOT_DIR/.env" ]; then
        echo "⚠️ Arquivo .env não encontrado. Criando a partir do .env.sample..."
        if [ -f "$ROOT_DIR/.env.sample" ]; then
            cp "$ROOT_DIR/.env.sample" "$ROOT_DIR/.env"
            echo "⚠️ Arquivo .env criado! Por favor, edite-o com suas credenciais."
            exit 1
        else
            echo "❌ Arquivo .env.sample não encontrado. Crie o arquivo .env manualmente."
            exit 1
        fi
    fi
    
    # Muda para o diretório raiz e executa o docker-compose
    cd "$ROOT_DIR"
    
    # Usa o docker-compose para executar apenas uma vez
    echo "📊 Enviando ranking da última semana para o Discord..."
    docker-compose run --rm app sh -c "cd /app && node src/scripts/send-to-discord.js --startDate=\"$START_DATE\" --endDate=\"$END_DATE\""
    
    echo "✅ Envio concluído! O container temporário foi removido."
fi

echo "=============================================" 