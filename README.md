# Mini SSMS - Analisador de Múltiplas Tabelas RPT

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)

Uma ferramenta web inspirada no SQL Server Management Studio (SSMS) para análise de dados a partir de arquivos `.rpt`. Permite carregar múltiplas tabelas, visualizá-las em abas e executar consultas SQL diretamente no navegador.

## 🚀 Funcionalidades

- **📁 Upload de arquivos .rpt** - Carregue seus relatórios diretamente
- **📊 Múltiplas tabelas** - Detecta automaticamente vários resultados no mesmo arquivo
- **🔍 Detecção inteligente** - Reconhece nomes de tabelas antes dos cabeçalhos
- **📑 Abas de resultados** - Cada tabela em uma aba com contagem de linhas
- **💻 Editor SQL** - Execute consultas como SELECT, WHERE, JOIN, etc.
- **✂️ Execução parcial** - Execute apenas o trecho selecionado do SQL
- **📋 Listagem de estrutura** - Veja colunas e tipos disponíveis
- **📥 Exportação Excel** - Exporte qualquer tabela para .xlsx
- **⌨️ Atalho F5** - Execute consultas rapidamente

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

## ⚙️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/mini-ssms-rpt.git
```

2. Abra o arquivo `index.html` no seu navegador

Ou use diretamente via GitHub Pages (em breve).

## 🎯 Exemplo de uso

```javascript
// O sistema cria automaticamente tabelas como:
// - ECONT (se detectado no arquivo)
// - tabela_1 (nome genérico)
// - clientes_2 (se houver duplicidade)

// Você pode consultar:
SELECT * FROM ECONT WHERE EXCTADB > 100
SELECT COUNT(*) FROM tabela_1
SELECT * FROM clientes_2 ORDER BY nome
```

## 🔧 Configuração

Nenhuma configuração necessária! Basta abrir o HTML e começar a usar.

## 🤝 Contribuindo

Contribuições são sempre bem-vindas!

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

## 📧 Contato

Seu Nome - [@seutwitter](https://twitter.com/seutwitter) - email@exemplo.com

Link do projeto: [https://github.com/seu-usuario/mini-ssms-rpt](https://github.com/seu-usuario/mini-ssms-rpt)

## ✨ Roadmap

- [ ] Suporte a mais formatos de arquivo (.csv, .txt)
- [ ] Gráficos básicos dos resultados
- [ ] Salvar consultas frequentes
- [ ] Temas (claro/escuro)
- [ ] Histórico de consultas

---

**Desenvolvido com ❤️ para facilitar análises de dados em arquivos .rpt**