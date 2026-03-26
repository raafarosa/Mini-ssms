# Mini SSMS - Analisador de Múltiplas Tabelas RPT

![Version](https://img.shields.io/badge/version-2.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)

Uma ferramenta web inspirada no SQL Server Management Studio (SSMS) para análise de dados a partir de arquivos `.rpt`. Permite carregar múltiplas tabelas, visualizá-las em abas e executar consultas SQL diretamente no navegador.

## 🚀 Funcionalidades

- **Upload de arquivos .rpt** - Carregue seus relatórios diretamente
- **Múltiplas tabelas** - Detecta automaticamente vários resultados no mesmo arquivo
- **Detecção inteligente** - Reconhece nomes de tabelas antes dos cabeçalhos
- **Abas de resultados** - Cada tabela em uma aba com contagem de linhas
- **Editor SQL** - Execute consultas como SELECT, WHERE, JOIN, etc.
- **Execução parcial** - Execute apenas o trecho selecionado do SQL
- **Listagem de estrutura** - Veja colunas e tipos disponíveis
- **Exportação Excel** - Exporte qualquer tabela para .xlsx
- **Atalho F5** - Execute consultas rapidamente
- **Gerar inserts** - Gere inserts das informações tratadas

## 🖥️ Como usar

### 1. Carregar arquivo
- Clique em "Selecionar Arquivo RPT" ou cole o conteúdo diretamente na área de texto
- Arquivos podem conter múltiplos resultados SELECT

### 2. Processar dados
- Clique em "Processar Múltiplas Tabelas"
- O sistema vai detectar automaticamente cada tabela e criar abas

### 3. Visualizar tabelas
- Clique nas abas para alternar entre diferentes tabelas
- Cada aba mostra o nome da tabela e quantidade de linhas
- Use o "×" para fechar tabelas não necessárias

### 4. Executar consultas
```sql
-- Consultar tabela específica
SELECT * FROM nome_tabela

-- Filtrar dados
SELECT * FROM clientes WHERE cidade = 'São Paulo'

-- JOIN entre tabelas
SELECT * FROM pedidos p 
JOIN clientes c ON p.cliente_id = c.id

-- Selecionar colunas específicas
SELECT nome, idade, salario FROM funcionarios
```

### 5. Exportar resultados
- Clique em "Exportar Tabela Atual" para gerar um arquivo Excel

## 📋 Exemplo de formato .rpt suportado

O sistema reconhece dois formatos principais:

### Formato 1: Nome da tabela em linha separada
```
ECONT
EXDTMOV                 EXCTADB     EXCTACR     ...
----------------------- ----------- ----------- ...
2026-03-13 00:00:00     123         456         ...
```

### Formato 2: Comando SELECT antes dos dados
```sql
select * from clientes

ID  NOME           CIDADE
--- ------------- ----------
1   João Silva    São Paulo
2   Maria Santos  Rio de Janeiro
```

## 🛠️ Tecnologias utilizadas

- **[AlaSQL](https://github.com/alasql/alasql)** - Banco de dados SQL em JavaScript
- **[SheetJS](https://sheetjs.com/)** - Exportação para Excel
- **HTML5/CSS3** - Interface inspirada no SSMS (tema escuro)
---