// =========== VARIÁVEIS GLOBAIS ===========
let tables = {};
let currentTable = null;
let tableCounter = 1;

// =========== FUNÇÕES PRINCIPAIS ===========

function loadFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;
    
    const file = fileInput.files[0];
    if (!file) return;
    
    const fileNameSpan = document.getElementById('fileName');
    if (fileNameSpan) {
        fileNameSpan.textContent = `Arquivo: ${file.name}`;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const inputData = document.getElementById('inputData');
        if (inputData) {
            inputData.value = e.target.result;
        }
    };
    reader.readAsText(file);
}

function processMultiTableData() {
    const inputData = document.getElementById('inputData');
    if (!inputData) {
        showMessage('Erro: Elemento inputData não encontrado!', 'error');
        return;
    }
    
    const text = inputData.value;
    if (!text.trim()) {
        showMessage('Erro: Nenhum dado para processar!', 'error');
        return;
    }

    try {
        tables = {};
        tableCounter = 1;
        
        const lines = text.split('\n');
        let i = 0;
        let tableCount = 0;
        
        while (i < lines.length) {
            // Pular linhas em branco
            while (i < lines.length && lines[i].trim() === '') i++;
            if (i >= lines.length) break;
            
            // VARIÁVEIS PARA O NOME DA TABELA
            let tableName = null;
            let tableDisplayName = null;
            
            // Verificar 3 formas de obter o nome da tabela:
            // 1. Nome da tabela em linha separada (formato antigo)
            const possibleTableName = lines[i].trim();
            if (possibleTableName && /^[A-Z0-9_]+$/.test(possibleTableName) && possibleTableName.length < 30) {
                tableName = possibleTableName.toLowerCase();
                tableDisplayName = possibleTableName;
                i++; // Avançar para próxima linha
            }
            
            // Procurar linha com traços (---)
            let dashLineIndex = -1;
            let searchPos = i;
            
            while (searchPos < lines.length) {
                if (lines[searchPos].includes('---')) {
                    dashLineIndex = searchPos;
                    break;
                }
                searchPos++;
            }
            
            if (dashLineIndex === -1) break; // Não encontrou mais tabelas
            
            // Encontrar linha do cabeçalho (linha antes dos traços)
            let headerLineIndex = dashLineIndex - 1;
            while (headerLineIndex >= 0 && lines[headerLineIndex].trim() === '') {
                headerLineIndex--;
            }
            
            if (headerLineIndex < 0) {
                i = dashLineIndex + 1;
                continue;
            }
            
            const headerLine = lines[headerLineIndex];
            const dashLine = lines[dashLineIndex];
            
            // Detectar colunas baseado nos traços
            const columns = detectColumns(headerLine, dashLine);
            
            // 2. Verificar se a primeira coluna é chamada "TABELA"
            const primeiraColuna = columns.length > 0 ? columns[0].name : '';
            const primeiraColunaRaw = columns.length > 0 ? headerLine.substring(columns[0].start, columns[0].end).trim() : '';
            
            const temColunaTabela = primeiraColunaRaw.toUpperCase() === 'TABELA' || primeiraColuna === 'TABELA';
            
            // Processar os dados para extrair nomes das tabelas
            const result = processSingleTable(lines, headerLineIndex, dashLineIndex, temColunaTabela);
            
            // 3. Se tem coluna TABELA, extrair nomes únicos dela
            if (temColunaTabela && result && result.data) {
                // Extrair nomes únicos da primeira coluna
                const nomesTabelas = [...new Set(result.data.map(row => {
                    const valor = row[columns[0].name];
                    return valor ? String(valor).trim() : null;
                }).filter(v => v && v !== ''))];
                
                console.log('Nomes de tabela encontrados na primeira coluna:', nomesTabelas);
                
                // Se encontrou nomes, criar tabelas separadas
                if (nomesTabelas.length > 0) {
                    // Para cada nome de tabela, filtrar os dados
                    nomesTabelas.forEach(nome => {
                        // Limpar nome para usar como identificador
                        let cleanName = nome.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
                        if (!cleanName) cleanName = `tabela_${tableCounter}`;
                        
                        // Garantir nome único
                        let finalName = cleanName;
                        let counter = 1;
                        while (tables[finalName]) {
                            finalName = `${cleanName}_${counter}`;
                            counter++;
                        }
                        
                        // Filtrar dados desta tabela
                        const tabelaData = result.data.filter(row => {
                            const valor = row[columns[0].name];
                            return valor && String(valor).trim() === nome;
                        }).map(row => {
                            // Remover a primeira coluna (TABELA) dos dados
                            const { [columns[0].name]: removed, ...rest } = row;
                            return rest;
                        });
                        
                        // Determinar colunas (todas exceto a primeira)
                        const outrasColunas = columns.slice(1).map(c => c.name);
                        
                        if (tabelaData.length > 0) {
                            tables[finalName] = {
                                data: tabelaData,
                                columns: outrasColunas,
                                displayName: nome,
                                rowCount: tabelaData.length
                            };
                            tableCount++;
                        }
                    });
                    
                    // Avançar para próxima tabela
                    i = dashLineIndex + result.consumedLines;
                    continue;
                }
            }
            
            // Se não encontrou nome da tabela na coluna, tentar nas linhas anteriores
            if (!tableName) {
                for (let j = Math.max(0, headerLineIndex - 3); j < headerLineIndex; j++) {
                    const line = lines[j].trim();
                    if (line && line.length < 30 && /^[A-Z0-9_]+$/.test(line)) {
                        tableName = line.toLowerCase();
                        tableDisplayName = line;
                        break;
                    }
                }
            }
            
            // Se ainda não tem nome, usar nome genérico
            if (!tableName) {
                tableName = `tabela_${tableCounter}`;
                tableDisplayName = tableName;
            }
            
            // Garantir nome único
            let baseName = tableName;
            let counter = 1;
            while (tables[tableName]) {
                tableName = `${baseName}_${counter}`;
                counter++;
            }
            
            if (result && result.data && result.data.length > 0) {
                tables[tableName] = {
                    data: result.data,
                    columns: result.columns || [],
                    displayName: tableDisplayName,
                    rowCount: result.data.length
                };
                
                tableCounter++;
                tableCount++;
            }
            
            // Avançar para próxima tabela
            i = dashLineIndex + (result ? result.consumedLines : 1);
        }
        
        // Atualizar interface
        if (tableCount > 0) {
            updateTableTabs();
            const tableNames = Object.keys(tables);
            if (tableNames.length > 0) {
                switchToTable(tableNames[0]);
            }
            
            updateStatusBar(`Sucesso: ${tableCount} tabelas carregadas`, 'success');
            
            const globalRowCount = document.getElementById('globalRowCount');
            if (globalRowCount) {
                globalRowCount.textContent = `${tableCount} tabelas`;
            }
            
            showMessage(`Carregamento concluído! ${tableCount} tabelas encontradas.`, 'success');
        } else {
            showMessage('Nenhuma tabela válida encontrada no arquivo.', 'warning');
        }
        
    } catch (e) {
        showMessage('Erro ao processar dados: ' + e.message, 'error');
        console.error(e);
    }
}

function processSingleTable(lines, headerIndex, dashIndex, removerPrimeiraColuna = false) {
    try {
        if (!lines || lines.length === 0 || headerIndex < 0 || dashIndex < 0) {
            return { data: [], columns: [], consumedLines: 1 };
        }
        
        const headerLine = lines[headerIndex] || '';
        const dashLine = lines[dashIndex] || '';
        
        if (!headerLine || !dashLine) {
            return { data: [], columns: [], consumedLines: 1 };
        }
        
        const columns = detectColumns(headerLine, dashLine);
        
        const data = [];
        let i = dashIndex + 1;
        
        // Encontrar onde termina esta tabela
        let fimTabelaIndex = -1;
        
        for (let j = dashIndex + 1; j < lines.length; j++) {
            const line = lines[j];
            
            if (line.includes('linhas afetadas')) {
                fimTabelaIndex = j - 1;
                break;
            }
            
            if (line.includes('---') && j > dashIndex + 5) {
                if (j > 0 && lines[j-1].trim() !== '') {
                    fimTabelaIndex = j - 1;
                    break;
                }
            }
            
            if (line.toLowerCase().startsWith('select ') && j > dashIndex + 5) {
                fimTabelaIndex = j - 1;
                break;
            }
        }
        
        if (fimTabelaIndex === -1) {
            fimTabelaIndex = lines.length - 1;
        }
        
        i = dashIndex + 1;
        while (i <= fimTabelaIndex) {
            const line = lines[i];
            
            if (line.includes('linhas afetadas')) {
                i++;
                continue;
            }
            
            if (line.trim() === '') {
                i++;
                continue;
            }
            
            const row = {};
            let hasData = false;
            
            columns.forEach(col => {
                if (col && col.start !== undefined && col.end !== undefined) {
                    const endPos = Math.min(col.end, line.length);
                    let value = line.substring(col.start, endPos).replace(/\s+$/, '');
                    
                    if (value === '') {
                        row[col.name] = null;
                    } else {
                        row[col.name] = value;
                        hasData = true;
                    }
                }
            });
            
            if (hasData && Object.keys(row).length > 0) {
                data.push(row);
            }
            
            i++;
        }
        
        return {
            data: data,
            columns: columns.map(c => c.name).filter(Boolean),
            consumedLines: (fimTabelaIndex - dashIndex) + 1
        };
        
    } catch (e) {
        console.error('Erro ao processar tabela:', e);
        return { data: [], columns: [], consumedLines: 1 };
    }
}

function detectColumns(headerLine, dashLine) {
    const columns = [];
    
    if (!headerLine || !dashLine) return columns;
    
    let inDash = false;
    let startPos = 0;
    
    for (let i = 0; i <= dashLine.length; i++) {
        const char = dashLine[i];
        
        if (char === '-' && !inDash) {
            inDash = true;
            startPos = i;
        } else if ((char !== '-' || i === dashLine.length) && inDash) {
            inDash = false;
            const endPos = i;
            
            let colName = headerLine.substring(startPos, endPos).trim();
            
            if (!colName) {
                colName = `COL_${columns.length + 1}`;
            }
            
            // Limpar nome para SQL
            colName = colName.replace(/[^a-zA-Z0-9_]/g, '_');
            if (colName.match(/^[0-9]/)) {
                colName = 'C_' + colName;
            }
            
            columns.push({
                start: startPos,
                end: endPos,
                name: colName
            });
        }
    }
    
    return columns;
}

function updateTableTabs() {
    const container = document.getElementById('tableTabsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const tableNames = Object.keys(tables);
    
    if (tableNames.length === 0) {
        container.innerHTML = '<div style="color: #888; padding: 5px;">Nenhuma tabela carregada</div>';
        
        const currentTableInfo = document.getElementById('currentTableInfo');
        if (currentTableInfo) {
            currentTableInfo.innerHTML = 'Nenhuma tabela carregada';
        }
        
        const availableTables = document.getElementById('availableTables');
        if (availableTables) {
            availableTables.textContent = 'nenhuma';
        }
        return;
    }
    
    tableNames.forEach(tableName => {
        const table = tables[tableName];
        if (!table) return;
        
        const tab = document.createElement('div');
        tab.className = 'table-tab' + (currentTable === tableName ? ' active' : '');
        tab.innerHTML = `
            ${table.displayName || tableName} <span class="badge">${table.rowCount || 0}</span>
            <span class="close-btn" onclick="removeTable('${tableName}', event)">×</span>
        `;
        tab.onclick = (e) => {
            if (!e.target.classList.contains('close-btn')) {
                switchToTable(tableName);
            }
        };
        container.appendChild(tab);
    });
    
    const availableTables = document.getElementById('availableTables');
    if (availableTables) {
        availableTables.textContent = tableNames.map(t => tables[t]?.displayName || t).join(', ');
    }
}

function switchToTable(tableName) {
    if (!tables[tableName]) return;
    
    currentTable = tableName;
    const table = tables[tableName];
    
    document.querySelectorAll('.table-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tabs = document.getElementById('tableTabsContainer')?.children;
    if (tabs) {
        const tableNames = Object.keys(tables);
        const index = tableNames.indexOf(tableName);
        if (index >= 0 && tabs[index]) {
            tabs[index].classList.add('active');
        }
    }
    
    const currentTableInfo = document.getElementById('currentTableInfo');
    if (currentTableInfo) {
        currentTableInfo.innerHTML = `
            <strong>Tabela atual:</strong> ${table.displayName || tableName} | 
            <strong>Linhas:</strong> ${table.rowCount || 0} | 
            <strong>Colunas:</strong> ${(table.columns || []).length}
        `;
    }
    
    renderTable(table.data || []);
    
    const sqlEditor = document.getElementById('sqlQuery');
    if (sqlEditor) {
        sqlEditor.value = `SELECT * FROM ${tableName}`;
    }
    
    showMessage(`Tabela "${table.displayName || tableName}" selecionada. ${table.rowCount || 0} linhas, ${(table.columns || []).length} colunas.`, 'info');
}

function removeTable(tableName, event) {
    event.stopPropagation();
    
    if (!tables[tableName]) return;
    
    if (confirm(`Remover tabela "${tables[tableName].displayName || tableName}"?`)) {
        delete tables[tableName];
        
        if (Object.keys(tables).length === 0) {
            currentTable = null;
            
            const output = document.getElementById('output');
            if (output) output.innerHTML = '';
            
            const currentTableInfo = document.getElementById('currentTableInfo');
            if (currentTableInfo) {
                currentTableInfo.innerHTML = 'Nenhuma tabela carregada';
            }
        } else {
            const firstTable = Object.keys(tables)[0];
            switchToTable(firstTable);
        }
        
        updateTableTabs();
        updateStatusBar(`${Object.keys(tables).length} tabelas restantes`, 'info');
    }
}

function executeQuery() {
    const sqlEditor = document.getElementById('sqlQuery');
    if (!sqlEditor) return;
    
    const sql = sqlEditor.value;
    if (!sql.trim()) {
        showMessage('Digite uma consulta SQL.', 'warning');
        return;
    }

    try {
        Object.keys(tables).forEach(tableName => {
            const table = tables[tableName];
            if (!table || !table.data) return;
            
            alasql(`DROP TABLE IF EXISTS ${tableName}`);
            alasql(`CREATE TABLE ${tableName}`);
            
            alasql.tables[tableName].data = table.data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    newRow[key] = row[key] === null ? null : String(row[key]);
                });
                return newRow;
            });
        });
        
        const startTime = performance.now();
        const result = alasql(sql);
        const endTime = performance.now();
        
        if (result && Array.isArray(result)) {
            renderTable(result);
            showMessage(`✅ Query executada em ${(endTime - startTime).toFixed(2)}ms. ${result.length} linhas retornadas.`, 'success');
        } else {
            showMessage('✅ Query executada com sucesso.', 'success');
        }
        
    } catch (e) {
        showMessage('❌ Erro SQL: ' + e.message, 'error');
        console.error('Erro detalhado:', e);
    }
}

function executeSelectedQuery() {
    const textarea = document.getElementById('sqlQuery');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        showMessage('Selecione um trecho da consulta para executar.', 'warning');
        return;
    }
    
    const selectedSQL = textarea.value.substring(start, end).trim();
    if (!selectedSQL) return;
    
    const selectionContent = document.getElementById('selectionContent');
    if (selectionContent) {
        selectionContent.textContent = selectedSQL;
    }
    
    Object.keys(tables).forEach(tableName => {
        const table = tables[tableName];
        if (!table || !table.data) return;
        
        alasql(`DROP TABLE IF EXISTS ${tableName}`);
        alasql(`CREATE TABLE ${tableName}`);
        alasql.tables[tableName].data = table.data;
    });
    
    try {
        const result = alasql(selectedSQL);
        if (result && Array.isArray(result)) {
            renderTable(result);
            showMessage(`✅ Query selecionada executada. ${result.length} linhas retornadas.`, 'success');
        }
    } catch (e) {
        showMessage('❌ Erro: ' + e.message, 'error');
    }
}

function showAllTables() {
    const tableNames = Object.keys(tables);
    if (tableNames.length === 0) {
        showMessage('Nenhuma tabela carregada.', 'warning');
        return;
    }
    
    let msg = '📋 TABELAS DISPONÍVEIS:\n';
    msg += '======================\n\n';
    
    tableNames.forEach(name => {
        const table = tables[name];
        if (table) {
            msg += `📊 ${table.displayName || name}\n`;
            msg += `   📍 Linhas: ${table.rowCount || 0}\n`;
            msg += `   📍 Colunas: ${(table.columns || []).length}\n`;
            msg += `   📍 Campos: ${(table.columns || []).slice(0, 8).join(', ')}${(table.columns || []).length > 8 ? '...' : ''}\n\n`;
        }
    });
    
    showMessage(msg, 'info');
}

function diagnosticarConsulta() {
    if (!currentTable || !tables[currentTable]) {
        showMessage('Selecione uma tabela primeiro.', 'warning');
        return;
    }
    
    const table = tables[currentTable];
    const campo = prompt('Digite o nome do campo para diagnosticar:');
    if (!campo) return;
    
    if (!table.columns.includes(campo)) {
        let msg = `❌ Campo '${campo}' não encontrado!\n\n`;
        msg += `Campos disponíveis:\n${table.columns.join(', ')}`;
        showMessage(msg, 'error');
        return;
    }
    
    const valores = table.data.map(row => row[campo]).filter(v => v !== null);
    const valoresUnicos = [...new Set(valores)];
    
    let msg = `📊 DIAGNÓSTICO DO CAMPO '${campo}'\n`;
    msg += `================================\n\n`;
    msg += `Total de registros: ${table.data.length}\n`;
    msg += `Registros com valor não-nulo: ${valores.length}\n`;
    msg += `Valores únicos: ${valoresUnicos.length}\n\n`;
    
    msg += `Primeiros 20 valores únicos:\n`;
    valoresUnicos.slice(0, 20).forEach(v => {
        msg += `  "${v}" (length: ${String(v).length})\n`;
    });
    
    showMessage(msg, 'info');
}

function buscarManual() {
    if (!currentTable || !tables[currentTable]) {
        showMessage('Selecione uma tabela primeiro.', 'warning');
        return;
    }
    
    const table = tables[currentTable];
    const campo = prompt('Digite o nome do campo para buscar:');
    if (!campo) return;
    
    if (!table.columns.includes(campo)) {
        showMessage(`Campo '${campo}' não encontrado.`, 'error');
        return;
    }
    
    const valor = prompt(`Digite o valor para buscar no campo '${campo}':`);
    if (!valor) return;
    
    const resultados = table.data.filter(row => {
        const rowValue = row[campo];
        if (rowValue === null || rowValue === undefined) return false;
        return String(rowValue).trim().toLowerCase() === valor.trim().toLowerCase();
    });
    
    if (resultados.length > 0) {
        renderTable(resultados);
        showMessage(`✅ Encontrados ${resultados.length} registros com '${campo}' = '${valor}'`, 'success');
    } else {
        showMessage(`❌ Nenhum registro encontrado com '${campo}' = '${valor}'`, 'warning');
        
        const valoresProximos = table.data
            .map(row => row[campo])
            .filter(v => v !== null && String(v).toLowerCase().includes(valor.toLowerCase()))
            .slice(0, 10);
        
        if (valoresProximos.length > 0) {
            let msg = `Valores similares encontrados:\n`;
            valoresProximos.forEach(v => msg += `  "${v}"\n`);
            showMessage(msg, 'info');
        }
    }
}

function downloadCurrentExcel() {
    if (!currentTable || !tables[currentTable]) {
        showMessage('Selecione uma tabela primeiro.', 'warning');
        return;
    }
    
    try {
        const data = tables[currentTable].data;
        if (!data || data.length === 0) {
            showMessage('Tabela sem dados para exportar.', 'warning');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, tables[currentTable].displayName || currentTable);
        XLSX.writeFile(wb, `${tables[currentTable].displayName || currentTable}.xlsx`);
        
        showMessage(`✅ Tabela exportada com sucesso!`, 'success');
    } catch (e) {
        showMessage('Erro ao exportar: ' + e.message, 'error');
    }
}

function clearAllData() {
    tables = {};
    currentTable = null;
    tableCounter = 1;
    
    const inputData = document.getElementById('inputData');
    if (inputData) inputData.value = '';
    
    const fileName = document.getElementById('fileName');
    if (fileName) fileName.textContent = 'Nenhum arquivo selecionado';
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    const output = document.getElementById('output');
    if (output) output.innerHTML = '';
    
    const tableTabsContainer = document.getElementById('tableTabsContainer');
    if (tableTabsContainer) {
        tableTabsContainer.innerHTML = '<div style="color: #888; padding: 5px;">Nenhuma tabela carregada</div>';
    }
    
    const currentTableInfo = document.getElementById('currentTableInfo');
    if (currentTableInfo) {
        currentTableInfo.innerHTML = 'Nenhuma tabela carregada';
    }
    
    const availableTables = document.getElementById('availableTables');
    if (availableTables) {
        availableTables.textContent = 'nenhuma';
    }
    
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
        statusBar.innerHTML = '<span>Pronto</span><span class="row-count">0 tabelas</span>';
    }
    
    const globalRowCount = document.getElementById('globalRowCount');
    if (globalRowCount) {
        globalRowCount.textContent = '0 tabelas';
    }
    
    const messageArea = document.getElementById('messageArea');
    if (messageArea) {
        messageArea.innerHTML = 'Mensagens\n---------------\n✅ Dados limpos.';
    }
    
    showMessage('Todos os dados foram removidos.', 'info');
}

function showResultActions() {
    const resultActions = document.getElementById('resultActions');
    if (resultActions) {
        resultActions.style.display = 'block';
    }
}

function hideResultActions() {
    const resultActions = document.getElementById('resultActions');
    if (resultActions) {
        resultActions.style.display = 'none';
    }
}

function generateInserts() {
    const tableNameInput = document.getElementById('insertTableName');
    if (!tableNameInput) return;
    
    const tableName = tableNameInput.value.trim();
    if (!tableName) {
        showMessage('Digite o nome da tabela destino.', 'warning');
        return;
    }

    // Obter os dados atuais da tabela exibida
    const table = document.getElementById('output');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    if (rows.length === 0) {
        showMessage('Nenhum dado para gerar INSERTs.', 'warning');
        return;
    }

    // Obter colunas do cabeçalho
    const headers = table.querySelectorAll('thead th');
    const columns = Array.from(headers).map(th => th.textContent.trim());
    
    if (columns.length === 0) {
        showMessage('Não foi possível determinar as colunas.', 'error');
        return;
    }

    // Gerar INSERTs
    let inserts = [];
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length !== columns.length) return;
        
        let values = [];
        cells.forEach(cell => {
            let value = cell.textContent.trim();
            if (cell.classList.contains('null-value') || value === 'NULL') {
                values.push('NULL');
            } else {
                // Escapar aspas simples e envolver em aspas
                value = value.replace(/'/g, "''");
                values.push(`'${value}'`);
            }
        });
        
        const insert = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
        inserts.push(insert);
    });

    if (inserts.length === 0) {
        showMessage('Nenhum INSERT gerado.', 'warning');
        return;
    }

    // Mostrar os INSERTs em uma nova aba ou modal
    showInsertsModal(inserts);
    showMessage(`✅ ${inserts.length} comandos INSERT gerados.`, 'success');
}

function showInsertsModal(inserts) {
    // Criar modal para mostrar os INSERTs
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#1e1e1e';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.maxHeight = '80%';
    modalContent.style.overflow = 'auto';
    modalContent.style.color = '#fff';

    const title = document.createElement('h3');
    title.textContent = 'Comandos INSERT Gerados';
    title.style.marginBottom = '10px';

    const textarea = document.createElement('textarea');
    textarea.value = inserts.join('\n');
    textarea.style.width = '100%';
    textarea.style.height = '400px';
    textarea.style.backgroundColor = '#2d2d30';
    textarea.style.color = '#fff';
    textarea.style.border = '1px solid #3e3e42';
    textarea.style.padding = '10px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.resize = 'vertical';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px';
    buttonContainer.style.textAlign = 'right';

    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copiar';
    copyButton.style.marginRight = '10px';
    copyButton.onclick = () => {
        textarea.select();
        document.execCommand('copy');
        showMessage('INSERTs copiados para a área de transferência.', 'success');
    };

    const executeButton = document.createElement('button');
    executeButton.textContent = 'Executar no AlaSQL';
    executeButton.style.marginRight = '10px';
    executeButton.onclick = () => {
        try {
            inserts.forEach(insert => alasql(insert));
            showMessage('INSERTs executados com sucesso no AlaSQL.', 'success');
            modal.remove();
        } catch (e) {
            showMessage('Erro ao executar INSERTs: ' + e.message, 'error');
        }
    };

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Fechar';
    closeButton.onclick = () => modal.remove();

    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(executeButton);
    buttonContainer.appendChild(closeButton);

    modalContent.appendChild(title);
    modalContent.appendChild(textarea);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
}

function renderTable(data) {
    const table = document.getElementById('output');
    if (!table) return;
    
    table.innerHTML = '';
    
    if (!data || data.length === 0) {
        table.innerHTML = '<tr><td style="text-align:center; padding:20px;">Nenhum resultado</td></tr>';
        hideResultActions();
        return;
    }

    const cols = Object.keys(data[0] || {});
    if (cols.length === 0) {
        hideResultActions();
        return;
    }
    
    let html = '<thead><tr>';
    cols.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    const maxLinhas = 1000;
    const linhasParaMostrar = data.slice(0, maxLinhas);
    
    linhasParaMostrar.forEach(row => {
        html += '<tr>';
        cols.forEach(col => {
            let value = row[col];
            if (value === null || value === undefined) {
                html += '<td class="null-value">NULL</td>';
            } else {
                value = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += `<td title="${value}">${value}</td>`;
            }
        });
        html += '</tr>';
    });
    
    table.innerHTML = html + '</tbody>';
    
    if (data.length > maxLinhas) {
        const footer = document.createElement('div');
        footer.style.padding = '10px';
        footer.style.textAlign = 'center';
        footer.style.color = '#888';
        footer.style.fontSize = '11px';
        footer.style.borderTop = '1px solid #3e3e42';
        footer.textContent = `Mostrando ${maxLinhas} de ${data.length} linhas. Use consultas SQL para filtrar.`;
        table.parentElement.appendChild(footer);
    }

    showResultActions();
}

function showMessage(msg, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    if (!messageArea) return;
    
    const timestamp = new Date().toLocaleTimeString();
    
    let typeIndicator = '';
    let emoji = '';
    switch(type) {
        case 'error': 
            typeIndicator = 'ERRO'; 
            emoji = '❌';
            break;
        case 'success': 
            typeIndicator = 'SUCESSO'; 
            emoji = '✅';
            break;
        case 'warning': 
            typeIndicator = 'AVISO'; 
            emoji = '⚠️';
            break;
        default: 
            typeIndicator = 'INFO';
            emoji = 'ℹ️';
    }
    
    messageArea.innerHTML = `Mensagens (${timestamp})\n---------------\n${emoji} ${typeIndicator}: ${msg}`;
}

function updateStatusBar(msg, type = 'info') {
    const statusBar = document.getElementById('statusBar');
    if (!statusBar) return;
    
    const globalRowCount = document.getElementById('globalRowCount');
    const rowCount = globalRowCount ? globalRowCount.textContent : '0 tabelas';
    
    statusBar.innerHTML = `<span>${msg}</span><span class="row-count">${rowCount}</span>`;
    
    statusBar.className = 'status-bar';
    if (type === 'error') {
        statusBar.classList.add('status-error');
    } else if (type === 'success') {
        statusBar.classList.add('status-success');
    }
}

function switchQueryTab(tab) {
    const editorTab = document.getElementById('editorTab');
    const selectionTab = document.getElementById('selectionTab');
    const tabs = document.querySelectorAll('.query-tab');
    
    if (!editorTab || !selectionTab) return;
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'editor') {
        editorTab.style.display = 'block';
        selectionTab.style.display = 'none';
        if (tabs[0]) tabs[0].classList.add('active');
    } else {
        editorTab.style.display = 'none';
        selectionTab.style.display = 'block';
        if (tabs[1]) tabs[1].classList.add('active');
        
        const textarea = document.getElementById('sqlQuery');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            const selectionContent = document.getElementById('selectionContent');
            if (selectionContent) {
                if (start !== end) {
                    selectionContent.textContent = textarea.value.substring(start, end).trim() || 'Selecione um trecho da consulta';
                }
            }
        }
    }
}

// Atalho de teclado
document.addEventListener('keydown', function(e) {
    if (e.key === 'F5') {
        e.preventDefault();
        executeQuery();
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mini SSMS - Sistema pronto');
});