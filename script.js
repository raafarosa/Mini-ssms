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
            
            // Detectar nome da tabela (linha com texto maiúsculo antes dos dados)
            let tableName = null;
            let tableDisplayName = null;
            
            // Verificar se a linha atual parece um nome de tabela (maiúsculas, sem espaços)
            const possibleTableName = lines[i].trim();
            if (possibleTableName && /^[A-Z0-9_]+$/.test(possibleTableName) && possibleTableName.length < 30) {
                tableName = possibleTableName.toLowerCase();
                tableDisplayName = possibleTableName;
                i++; // Avançar para próxima linha após o nome da tabela
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
            
            // Se não encontrou nome da tabela, procurar nas linhas anteriores ao cabeçalho
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
            
            // Processar os dados desta tabela
            const result = processSingleTable(lines, headerLineIndex, dashLineIndex);
            
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

function processSingleTable(lines, headerIndex, dashIndex) {
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
        
        // Primeiro, vamos encontrar onde termina esta tabela
        let fimTabelaIndex = -1;
        
        // Procurar pelo próximo bloco de tabela
        for (let j = dashIndex + 1; j < lines.length; j++) {
            const line = lines[j];
            
            // Se encontrar "linhas afetadas", este é o fim
            if (line.includes('linhas afetadas')) {
                fimTabelaIndex = j - 1; // Termina antes da linha "linhas afetadas"
                break;
            }
            
            // Se encontrar uma linha com traços E já passamos algumas linhas
            if (line.includes('---') && j > dashIndex + 5) {
                // Verificar se a linha anterior parece um cabeçalho
                if (j > 0 && lines[j-1].trim() !== '') {
                    fimTabelaIndex = j - 1; // Termina antes dos traços
                    break;
                }
            }
            
            // Se encontrar "SELECT" em nova linha (próxima consulta)
            if (line.toLowerCase().startsWith('select ') && j > dashIndex + 5) {
                fimTabelaIndex = j - 1;
                break;
            }
        }
        
        // Se não encontrou fim, vai até o final do arquivo
        if (fimTabelaIndex === -1) {
            fimTabelaIndex = lines.length - 1;
        }
        
        console.log(`processSingleTable: processando linhas ${dashIndex + 1} até ${fimTabelaIndex}`);
        
        // Agora processa as linhas até o fim identificado
        i = dashIndex + 1;
        while (i <= fimTabelaIndex) {
            const line = lines[i];
            
            // Pular linhas que são claramente não-dados
            if (line.includes('linhas afetadas')) {
                i++;
                continue;
            }
            
            // Se a linha está em branco, apenas pula
            if (line.trim() === '') {
                i++;
                continue;
            }
            
            // Processar linha de dados
            const row = {};
            let hasData = false;
            
            columns.forEach(col => {
                if (col && col.start !== undefined && col.end !== undefined) {
                    // Garantir que não ultrapasse o tamanho da linha
                    const endPos = Math.min(col.end, line.length);
                    let value = line.substring(col.start, endPos);
                    
                    // Importante: NÃO fazer trim completo para preservar zeros à esquerda
                    // Apenas remove espaços do final, mantém espaços do início
                    value = value.replace(/\s+$/, '');
                    
                    if (value === '') {
                        row[col.name] = null;
                    } else {
                        row[col.name] = value;
                        hasData = true;
                    }
                }
            });
            
            // Só adiciona se realmente tem dados
            if (hasData && Object.keys(row).length > 0) {
                data.push(row);
            }
            
            i++;
        }
        
        console.log(`processSingleTable: processou ${data.length} registros`);
        
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
    
    // Atualizar abas
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
    
    // Atualizar info
    const currentTableInfo = document.getElementById('currentTableInfo');
    if (currentTableInfo) {
        currentTableInfo.innerHTML = `
            <strong>Tabela atual:</strong> ${table.displayName || tableName} | 
            <strong>Linhas:</strong> ${table.rowCount || 0} | 
            <strong>Colunas:</strong> ${(table.columns || []).length}
        `;
    }
    
    // Mostrar dados
    renderTable(table.data || []);
    
    // Atualizar sugestão de query
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

// =========== NOVA VERSÃO DA EXECUÇÃO DE CONSULTAS ===========

function executeQuery() {
    const sqlEditor = document.getElementById('sqlQuery');
    if (!sqlEditor) return;
    
    const sql = sqlEditor.value.trim();
    if (!sql) {
        showMessage('Digite uma consulta SQL.', 'warning');
        return;
    }

    // Se for uma consulta SELECT simples, podemos tentar processar manualmente
    if (sql.toUpperCase().startsWith('SELECT * FROM')) {
        executeSimpleSelect(sql);
    } else {
        executeComplexQuery(sql);
    }
}

function executeSimpleSelect(sql) {
    try {
        // Extrair o nome da tabela
        const match = sql.match(/SELECT\s+\*\s+FROM\s+(\w+)/i);
        if (!match) {
            executeComplexQuery(sql);
            return;
        }
        
        const tableName = match[1];
        const table = tables[tableName];
        
        if (!table) {
            showMessage(`Tabela '${tableName}' não encontrada.`, 'error');
            return;
        }
        
        // Verificar se tem WHERE
        let filteredData = table.data;
        
        if (sql.toUpperCase().includes('WHERE')) {
            const wherePart = sql.split('WHERE')[1].trim();
            filteredData = applyWhereFilter(table.data, wherePart);
        }
        
        renderTable(filteredData);
        showMessage(`✅ Consulta executada. ${filteredData.length} linhas retornadas.`, 'success');
        
    } catch (e) {
        console.error('Erro no executeSimpleSelect:', e);
        executeComplexQuery(sql);
    }
}

function applyWhereFilter(data, whereClause) {
    try {
        // Parse simples do WHERE
        // Ex: rtsistema = '050'
        const match = whereClause.match(/(\w+)\s*=\s*'([^']*)'/);
        if (!match) return data;
        
        const field = match[1];
        const value = match[2];
        
        console.log(`Filtrando: ${field} = '${value}'`);
        
        // Filtrar os dados
        const results = data.filter(row => {
            const rowValue = row[field];
            if (rowValue === null || rowValue === undefined) return false;
            
            // Converter para string e comparar de várias formas
            const rowValueStr = String(rowValue).trim();
            const searchValue = value.trim();
            
            return rowValueStr === searchValue;
        });
        
        console.log(`Encontrados ${results.length} resultados`);
        return results;
        
    } catch (e) {
        console.error('Erro no filtro:', e);
        return data;
    }
}

function executeComplexQuery(sql) {
    try {
        // Registrar todas as tabelas no AlaSQL
        Object.keys(tables).forEach(tableName => {
            const table = tables[tableName];
            if (!table || !table.data) return;
            
            alasql(`DROP TABLE IF EXISTS ${tableName}`);
            alasql(`CREATE TABLE ${tableName}`);
            
            // Converter dados garantindo que tudo seja string
            alasql.tables[tableName].data = table.data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    if (row[key] === null || row[key] === undefined) {
                        newRow[key] = null;
                    } else {
                        newRow[key] = String(row[key]);
                    }
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

// =========== NOVA FUNÇÃO DE DIAGNÓSTICO ===========

function diagnosticarConsulta() {
    if (!currentTable || !tables[currentTable]) {
        showMessage('Selecione uma tabela primeiro.', 'warning');
        return;
    }
    
    const table = tables[currentTable];
    const campo = prompt('Digite o nome do campo para diagnosticar (ex: rtsistema):');
    if (!campo) return;
    
    const valor = prompt(`Digite o valor que você está procurando no campo '${campo}':`);
    if (!valor) return;
    
    // Verificar se o campo existe
    if (!table.columns.includes(campo)) {
        let msg = `❌ Campo '${campo}' não encontrado!\n\n`;
        msg += `Campos disponíveis:\n${table.columns.join(', ')}`;
        showMessage(msg, 'error');
        return;
    }
    
    // Coletar amostra dos valores
    const valores = table.data.map(row => row[campo]).filter(v => v !== null);
    const valoresUnicos = [...new Set(valores)];
    
    let msg = `📊 DIAGNÓSTICO DO CAMPO '${campo}'\n`;
    msg += `================================\n\n`;
    msg += `Total de registros: ${table.data.length}\n`;
    msg += `Registros com valor não-nulo: ${valores.length}\n`;
    msg += `Valores únicos: ${valoresUnicos.length}\n\n`;
    
    // Mostrar primeiros 20 valores únicos
    msg += `Primeiros 20 valores únicos (como estão armazenados):\n`;
    valoresUnicos.slice(0, 20).forEach(v => {
        msg += `  "${v}" (length: ${String(v).length})\n`;
    });
    
    // Verificar se o valor procurado existe
    const valorProcurado = valor;
    const encontrado = valores.some(v => String(v).trim() === valorProcurado.trim());
    
    msg += `\n🔍 Buscando por '${valorProcurado}': ${encontrado ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}\n`;
    
    if (!encontrado) {
        msg += `\n💡 Sugestões:\n`;
        msg += `- Tente: SELECT * FROM ${currentTable} WHERE ${campo} LIKE '%${valorProcurado}%'\n`;
        msg += `- Verifique se há espaços extras nos dados\n`;
        msg += `- Confirme se o campo realmente tem este valor\n`;
    }
    
    showMessage(msg, 'info');
}

// =========== NOVA FUNÇÃO DE BUSCA MANUAL ===========

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
    
    // Busca manual nos dados
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
        
        // Mostrar valores próximos como sugestão
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

function renderTable(data) {
    const table = document.getElementById('output');
    if (!table) return;
    
    table.innerHTML = '';
    
    if (!data || data.length === 0) {
        table.innerHTML = '<tr><td style="text-align:center; padding:20px;">Nenhum resultado</td></tr>';
        return;
    }

    const cols = Object.keys(data[0] || {});
    if (cols.length === 0) return;
    
    let html = '<thead><tr>';
    cols.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Limitar a exibição para 1000 linhas por vez (performance)
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
    
    // Mostrar mensagem se houver mais linhas
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