# Testes da API PRFormance

Este diretório contém arquivos para testar a API PRFormance.

## Arquivos HTTP

Os arquivos `.http` são compatíveis com extensões como REST Client para VS Code, permitindo testar as APIs diretamente do editor.

### Como usar

1. Instale a extensão REST Client no VS Code:
   - Nome: REST Client
   - ID: humao.rest-client
   - Link: https://marketplace.visualstudio.com/items?itemName=humao.rest-client

2. Abra o arquivo `performance.http`

3. Clique em "Send Request" acima de cada requisição para executá-la

### Variáveis de ambiente

O arquivo `http-client.env.json` contém variáveis de ambiente para diferentes ambientes:

- `development`: Para testes locais (http://localhost:3000)
- `production`: Para testes em produção

Para selecionar um ambiente:
1. Abra o arquivo `.http`
2. Clique no botão "No Environment" na barra de status do VS Code (canto inferior direito)
3. Selecione "development" ou "production"

### Requisições disponíveis

- **Página inicial**: Testa a rota raiz da API
- **Obter performance dos desenvolvedores**: Testa a rota principal com datas fixas
- **Mês atual**: Testa a rota com o mês atual (usando funções de data)
- **Mês anterior**: Testa a rota com o mês anterior
- **Erro (sem datas)**: Testa o comportamento de erro quando não são fornecidas datas
- **Erro (data inválida)**: Testa o comportamento de erro quando é fornecida uma data inválida 