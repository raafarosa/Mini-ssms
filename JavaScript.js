// =========== VARIÁVEIS GLOBAIS ===========
let tables = {};
let currentTable = null;
let tableCounter = 1;

// =========== FUNÇÕES PRINCIPAIS ===========

function loadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    document.getElementById('fileName').textContent = `Arquivo: ${file.name}`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('inputData').value = e.target.result;
    };
    reader.readAsText(file);
}

function processMultiTableData() {
    const text = document.getElementById('inputData').value;
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
            while (i < lines.length && lines[i].trim() === '') i++;
            if (i >= lines.length) break;
            
            let tableName = null;
            let tableDisplayName = null;
            
            const possibleTableName = lines[i].trim();
            if (possibleTableName && /^[A-Z0-9_]+$/.test(possibleTableName) && possibleTableName.length < 30) {
                tableName = possibleTableName.toLowerCase();
                tableDisplayName = possibleTableName;
                i++;
            }
            
            let dashLineIndex = -1;
            let searchPos = i;
            
            while (searchPos < lines.length) {
                if (lines[searchPos].includes('---')) {
                    dashLineIndex = searchPos;
                    break;
                }
                searchPos++;
            }
            
            if (dashLineIndex === -1) break;
            
            let headerLineIndex = dashLineIndex - 1;
            while (headerLineIndex >= 0 && lines[headerLineIndex].trim() === '') {
                headerLineIndex--;
            }
            
            if (headerLineIndex < 0) {
                i = dashLineIndex + 1;
                continue;
            }
            
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
            
            if (!tableName) {
                tableName = `tabela_${tableCounter}`;
                tableDisplayName = tableName;
            }
            
            let baseName = tableName;
            let counter = 1;
            while (tables[tableName]) {
                tableName = `${baseName}_${counter}`;
                counter++;
            }
            
            const result = processSingleTable(lines, headerLineIndex, dashLineIndex);
            
            if (result && result.data.length > 0) {
                tables[tableName] = {
                    data: result.data,
                    columns: result.columns,
                    displayName: tableDisplayName,
                    rowCount: result.data.length
                };
                
                tableCounter++;
                tableCount++;
            }
            
            i = dashLineIndex + result.consumedLines;
        }
        
        if (tableCount > 0) {
            updateTableTabs();
            const tableNames = Object.keys(tables);
            if (tableNames.length > 0) {
                switchToTable(tableNames[0]);
            }
            
            updateStatusBar(`Sucesso: ${tableCount} tabelas carregadas`, 'success');
            document.getElementById('globalRowCount').textContent = `${tableCount} tabelas`;
            
            showMessage(`Carregamento concluído! ${tableCount} tabelas encontradas.`, 'success');
        } else {
            showMessage('Nenhuma tabela válida encontrada no arquivo.', 'warning');
        }
        
    } catch (e) {
        showMessage('Erro ao processar dados: ' + e.message, 'error');
    }
}

function processSingleTable(lines, headerIndex, dashIndex) {
    try {
        const headerLine = lines[headerIndex];
        const dashLine = lines[dashIndex];
        
        const columns = detectColumns(headerLine, dashLine);
        
        const data = [];
        let i = dashIndex + 1;
        
        while (i < lines.length) {
            const line = lines[i];
            
            if (line.trim() === '' || line.includes('linhas afetadas')) {
                i++;
                break;
            }
            
            const row = {};
            let hasData = false;
            
            columns.forEach(col => {
                let value = line.substring(col.start, col.end).replace(/\s+$/, '');
                if (value === '') {
                    row[col.name] = null;
                } else {
                    row[col.name] = value;
                    hasData = true;
                }
            });
            
            if (hasData) {
                data.push(row);
            }
            
            i++;
        }
        
        return {
            data: data,
            columns: columns.map(c => c.name),
            consumedLines: i - dashIndex
        };
        
    } catch (e) {
        return { data: [], columns: [], consumedLines: 1 };
    }
}

function detectColumns(headerLine, dashLine) {
    const columns = [];
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
    container.innerHTML = '';
    
    const tableNames = Object.keys(tables);
    
    if (tableNames.length === 0) {
        container.innerHTML = '<div style="color: #888; padding: 5px;">Nenhuma tabela carregada</div>';
        document.getElementById('currentTableInfo').innerHTML = 'Nenhuma tabela carregada';
        document.getElementById('availableTables').textContent = 'nenhuma';
        return;
    }
    
    tableNames.forEach(tableName => {
        const table = tables[tableName];
        const tab = document.createElement('div');
        tab.className = 'table-tab' + (currentTable === tableName ? ' active' : '');
        tab.innerHTML = `
            ${table.displayName} <span class="badge">${table.rowCount}</span>
            <span class="close-btn" onclick="removeTable('${tableName}', event)">×</span>
        `;
        tab.onclick = (e) => {
            if (!e.target.classList.contains('close-btn')) {
                switchToTable(tableName);
            }
        };
        container.appendChild(tab);
    });
    
    document.getElementById('availableTables').textContent = tableNames.map(t => tables[t].displayName).join(', ');
}

function switchToTable(tableName) {
    if (!tables[tableName]) return;
    
    currentTable = tableName;
    const table = tables[tableName];
    
    document.querySelectorAll('.table-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tabs = document.getElementById('tableTabsContainer').children;
    const tableNames = Object.keys(tables);
    const index = tableNames.indexOf(tableName);
    if (index >= 0 && tabs[index]) {
        tabs[index].classList.add('active');
    }
    
    document.getElementById('currentTableInfo').innerHTML = `
        <strong>Tabela atual:</strong> ${table.displayName} | 
        <strong>Linhas:</strong> ${table.rowCount} | 
        <strong>Colunas:</strong> ${table.columns.length}
    `;
    
    renderTable(table.data);
    
    const sqlEditor = document.getElementById('sqlQuery');
    sqlEditor.value = `SELECT * FROM ${tableName}`;
    
    showMessage(`Tabela "${table.displayName}" selecionada. ${table.rowCount} linhas, ${table.columns.length} colunas.`, 'info');
}

function removeTable(tableName, event) {
    event.stopPropagation();
    
    if (confirm(`Remover tabela "${tables[tableName].displayName}"?`)) {
        delete tables[tableName];
        
        if (Object.keys(tables).length === 0) {
            currentTable = null;
            document.getElementById('output').innerHTML = '';
            document.getElementById('currentTableInfo').innerHTML = 'Nenhuma tabela carregada';
        } else {
            const firstTable = Object.keys(tables)[0];
            switchToTable(firstTable);
        }
        
        updateTableTabs();
        updateStatusBar(`${Object.keys(tables).length} tabelas restantes`, 'info');
    }
}

function executeQuery() {
    const sql = document.getElementById('sqlQuery').value;
    if (!sql.trim()) {
        showMessage('Digite uma consulta SQL.', 'warning');
        return;
    }

    try {
        Object.keys(tables).forEach(tableName => {
            alasql(`DROP TABLE IF EXISTS ${tableName}`);
            alasql(`CREATE TABLE ${tableName}`);
            alasql.tables[tableName].data = tables[tableName].data.map(row => {
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
            showMessage(`Query executada em ${(endTime - startTime).toFixed(2)}ms. ${result.length} linhas retornadas.`, 'success');
        } else {
            showMessage('Query executada com sucesso.', 'success');
        }
        
    } catch (e) {
        showMessage('Erro SQL: ' + e.message, 'error');
    }
}

function executeSelectedQuery() {
    const textarea = document.getElementById('sqlQuery');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        showMessage('Selecione um trecho da consulta para executar.', 'warning');
        return;
    }
    
    const selectedSQL = textarea.value.substring(start, end).trim();
    if (!selectedSQL) return;
    
    document.getElementById('selectionContent').textContent = selectedSQL;
    
    Object.keys(tables).forEach(tableName => {
        alasql(`DROP TABLE IF EXISTS ${tableName}`);
        alasql(`CREATE TABLE ${tableName}`);
        alasql.tables[tableName].data = tables[tableName].data;
    });
    
    try {
        const result = alasql(selectedSQL);
        if (result && Array.isArray(result)) {
            renderTable(result);
            showMessage(`Query selecionada executada. ${result.length} linhas retornadas.`, 'success');
        }
    } catch (e) {
        showMessage('Erro: ' + e.message, 'error');
    }
}

function showAllTables() {
    const tableNames = Object.keys(tables);
    if (tableNames.length === 0) {
        showMessage('Nenhuma tabela carregada.', 'warning');
        return;
    }
    
    let msg = 'Tabelas disponíveis:\n';
    tableNames.forEach(name => {
        const table = tables[name];
        msg += `\n${table.displayName} (${name}): ${table.rowCount} linhas, ${table.columns.length} colunas`;
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
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, tables[currentTable].displayName);
        XLSX.writeFile(wb, `${tables[currentTable].displayName}.xlsx`);
        
        showMessage(`Tabela "${tables[currentTable].displayName}" exportada!`, 'success');
    } catch (e) {
        showMessage('Erro ao exportar: ' + e.message, 'error');
    }
}

function clearAllData() {
    tables = {};
    currentTable = null;
    tableCounter = 1;
    
    document.getElementById('inputData').value = '';
    document.getElementById('fileName').textContent = 'Nenhum arquivo selecionado';
    document.getElementById('fileInput').value = '';
    document.getElementById('output').innerHTML = '';
    document.getElementById('tableTabsContainer').innerHTML = '<div style="color: #888; padding: 5px;">Nenhuma tabela carregada</div>';
    document.getElementById('currentTableInfo').innerHTML = 'Nenhuma tabela carregada';
    document.getElementById('availableTables').textContent = 'nenhuma';
    document.getElementById('statusBar').innerHTML = '<span>Pronto</span><span class="row-count">0 tabelas</span>';
    document.getElementById('globalRowCount').textContent = '0 tabelas';
    document.getElementById('messageArea').innerHTML = 'Mensagens\n---------------\nDados limpos.';
    
    showMessage('Todos os dados foram removidos.', 'info');
}

function renderTable(data) {
    const table = document.getElementById('output');
    table.innerHTML = '';
    
    if (!data || data.length === 0) {
        table.innerHTML = '<tr><td style="text-align:center; padding:20px;">Nenhum resultado</td></tr>';
        return;
    }

    const cols = Object.keys(data[0]);
    
    let html = '<thead><tr>';
    cols.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    data.forEach(row => {
        html += '<tr>';
        cols.forEach(col => {
            let value = row[col];
            if (value === null || value === undefined) {
                html += '<td class="null-value">NULL</td>';
            } else {
                value = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                value = value.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
                html += `<td title="${value}">${value}</td>`;
            }
        });
        html += '</tr>';
    });
    
    table.innerHTML = html + '</tbody>';
}

function showMessage(msg, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    const timestamp = new Date().toLocaleTimeString();
    
    let typeIndicator = '';
    switch(type) {
        case 'error': typeIndicator = 'ERRO'; break;
        case 'success': typeIndicator = 'SUCESSO'; break;
        case 'warning': typeIndicator = 'AVISO'; break;
        default: typeIndicator = 'INFO';
    }
    
    messageArea.innerHTML = `Mensagens (${timestamp})\n---------------\n${typeIndicator}: ${msg}`;
}

function updateStatusBar(msg, type = 'info') {
    const statusBar = document.getElementById('statusBar');
    const rowCount = document.getElementById('globalRowCount').textContent;
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
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'editor') {
        editorTab.style.display = 'block';
        selectionTab.style.display = 'none';
        tabs[0].classList.add('active');
    } else {
        editorTab.style.display = 'none';
        selectionTab.style.display = 'block';
        tabs[1].classList.add('active');
        
        const textarea = document.getElementById('sqlQuery');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        if (start !== end) {
            document.getElementById('selectionContent').textContent = 
                textarea.value.substring(start, end).trim() || 'Selecione um trecho da consulta';
        }
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'F5') {
        e.preventDefault();
        executeQuery();
    }
});