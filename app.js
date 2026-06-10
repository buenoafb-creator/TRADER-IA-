// ==================== SISTEMA TRADING IA ====================
let trades = [];
let config = { metaPontos: 500, contratos: 5, riscoPercent: 0.5 };

// Carregar dados salvos
function carregarDados() {
    const saved = localStorage.getItem('trading_ia');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            trades = data.trades || [];
            config = data.config || config;
        } catch(e) { console.error(e); }
    }
    document.getElementById('metaPontos').value = config.metaPontos;
    document.getElementById('contratos').value = config.contratos;
    document.getElementById('riscoPercent').value = config.riscoPercent;
    atualizarTabela();
    atualizarProgresso();
    atualizarTotalTrades();
}
function salvarDados() {
    localStorage.setItem('trading_ia', JSON.stringify({ trades, config }));
}

function atualizarTotalTrades() {
    document.getElementById('totalTrades').innerText = trades.length;
}
function atualizarProgresso() {
    const hoje = new Date().toISOString().slice(0,10);
    const pontosHoje = trades.filter(t => t.dataHora && t.dataHora.startsWith(hoje) && t.pontos !== undefined).reduce((acc, t) => acc + (t.pontos || 0), 0);
    const percent = Math.min(100, (pontosHoje / config.metaPontos) * 100);
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('pontosHoje').innerHTML = `${pontosHoje} / ${config.metaPontos} pts`;
}

function atualizarTabela() {
    const tbody = document.getElementById('tabelaTrades');
    if (!tbody) return;
    tbody.innerHTML = '';
    [...trades].reverse().forEach((trade, idx) => {
        const row = tbody.insertRow();
        const dataHora = trade.dataHora ? new Date(trade.dataHora).toLocaleString() : '-';
        const resultado = trade.pontos !== undefined ? (trade.pontos >=0 ? `+${trade.pontos}` : `${trade.pontos}`) : 'aberto';
        const cor = trade.pontos > 0 ? '#10b981' : (trade.pontos < 0 ? '#ef4444' : '#f59e0b');
        row.innerHTML = `
            <td>${dataHora}</td>
            <td>${trade.setup}</td>
            <td>${trade.direcao}</td>
            <td>${trade.entrada}</td>
            <td>${trade.stop}</td>
            <td>${trade.target}</td>
            <td style="color:${cor}">${resultado}</td>
            <td class="acao-botoes"><button onclick="excluirTrade(${trades.length - 1 - idx})"><i class="fas fa-trash"></i></button></td>
        `;
    });
}

window.excluirTrade = function(pos) {
    if(confirm('Excluir este trade?')) {
        trades.splice(pos,1);
        salvarDados();
        atualizarTabela();
        atualizarProgresso();
        atualizarTotalTrades();
    }
};

function adicionarTrade(trade) {
    trades.push(trade);
    salvarDados();
    atualizarTabela();
    atualizarProgresso();
    atualizarTotalTrades();
}

// Modal e form
const modal = document.getElementById('modal');
document.getElementById('novoTradeBtn').onclick = () => modal.style.display = 'flex';
document.querySelector('.close').onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };

document.getElementById('tradeForm').onsubmit = (e) => {
    e.preventDefault();
    const entrada = parseFloat(document.getElementById('entrada').value);
    const stop = parseFloat(document.getElementById('stop').value);
    const target = parseFloat(document.getElementById('target').value);
    let saida = document.getElementById('saida').value;
    let pontos = document.getElementById('pontos').value;
    if(saida && !pontos) {
        const diff = parseFloat(saida) - entrada;
        const direcao = document.getElementById('direcao').value;
        pontos = direcao === 'COMPRA' ? diff : -diff;
        pontos = Math.round(pontos * 100)/100;
    } else if(pontos) pontos = parseFloat(pontos);
    
    const novo = {
        id: Date.now(),
        dataHora: document.getElementById('dataHora').value,
        setup: document.getElementById('setup').value,
        direcao: document.getElementById('direcao').value,
        entrada, stop, target,
        saida: saida ? parseFloat(saida) : null,
        pontos: pontos || null,
        contexto: document.getElementById('contexto').value,
        emocao: parseInt(document.getElementById('emocao').value),
    };
    adicionarTrade(novo);
    modal.style.display = 'none';
    e.target.reset();
    document.getElementById('pontos').value = '';
};

// Análise IA simples
document.getElementById('analisarIaBtn')?.addEventListener('click', () => {
    const finalizados = trades.filter(t => t.pontos !== undefined && t.pontos !== null);
    if(finalizados.length === 0) {
        document.getElementById('insightsArea').innerHTML = '❌ Sem trades finalizados para análise.';
        return;
    }
    const vitorias = finalizados.filter(t => t.pontos > 0).length;
    const winRate = (vitorias/finalizados.length*100).toFixed(1);
    const totalGanho = finalizados.filter(t=>t.pontos>0).reduce((a,b)=>a+b.pontos,0);
    const totalPerda = finalizados.filter(t=>t.pontos<0).reduce((a,b)=>a+Math.abs(b.pontos),0);
    const profitFactor = totalPerda ? (totalGanho/totalPerda).toFixed(2) : '∞';
    let msg = `📊 <strong>${finalizados.length}</strong> trades finalizados.<br>✅ Win rate: <strong>${winRate}%</strong><br>💰 Profit Factor: <strong>${profitFactor}</strong><br>`;
    if(winRate > 60 && profitFactor > 1.5) msg += '🎯 Excelente! Continue focando nos setups Tier 1.';
    else if(winRate < 50) msg += '⚠️ Win rate baixo. Revise seus setups e só opere OB+FVG.';
    else msg += '📈 Bom caminho. Tente melhorar R/R para 1:2.';
    document.getElementById('insightsArea').innerHTML = msg;
});

// Exportar CSV
document.getElementById('exportarCsvBtn')?.addEventListener('click', () => {
    if(!trades.length) return alert('Nenhum trade');
    const headers = ['Data','Setup','Direção','Entrada','Stop','Target','Resultado','Contexto','Emoção'];
    const rows = trades.map(t => [
        t.dataHora, t.setup, t.direcao, t.entrada, t.stop, t.target, t.pontos ?? '', t.contexto || '', t.emocao
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trades_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
});

// Checklist e config
document.getElementById('salvarChecklistBtn')?.addEventListener('click', () => {
    const checks = document.querySelectorAll('.check-item');
    const estado = [...checks].map(c => c.checked);
    localStorage.setItem('checklist_trading', JSON.stringify(estado));
    alert('Checklist salvo!');
});
function carregarChecklist() {
    const saved = localStorage.getItem('checklist_trading');
    if(saved) {
        const estado = JSON.parse(saved);
        document.querySelectorAll('.check-item').forEach((cb, i) => { if(estado[i]) cb.checked = true; });
    }
}
document.getElementById('salvarConfigBtn')?.addEventListener('click', () => {
    config.metaPontos = parseInt(document.getElementById('metaPontos').value);
    config.contratos = parseInt(document.getElementById('contratos').value);
    config.riscoPercent = parseFloat(document.getElementById('riscoPercent').value);
    salvarDados();
    atualizarProgresso();
    alert('Configurações salvas!');
});

// Abas
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// ========== SCANNER DE ORDER BLOCKS (SMC/ICT) ==========
function escanearOBs() {
    const precoAtual = parseFloat(document.getElementById('precoAtual').value);
    if (isNaN(precoAtual)) {
        alert('Digite o preço atual do WIN$');
        return;
    }

    // Lista de OBs pré-definida (simula níveis reais do mercado)
    const obTemplates = [
        { nome: "OB Bearish (4h)", zona: [166150, 166350], tipo: "VENDA", entrada: "166200 - 166250", stop: "166520", target: "165600", rr: "1:2.3" },
        { nome: "OB Bullish (1h)", zona: [164800, 165000], tipo: "COMPRA", entrada: "164900 - 164950", stop: "164600", target: "165800", rr: "1:2.0" },
        { nome: "FVG + OB (15min)", zona: [165400, 165550], tipo: "COMPRA", entrada: "165450 - 165500", stop: "165200", target: "166200", rr: "1:2.5" },
        { nome: "Liquidity Grab (NY)", zona: [167100, 167300], tipo: "VENDA", entrada: "167200 - 167250", stop: "167500", target: "166300", rr: "1:2.2" },
        { nome: "OB Bullish (Diário)", zona: [163800, 164000], tipo: "COMPRA", entrada: "163900 - 163950", stop: "163600", target: "165200", rr: "1:2.1" },
        { nome: "OB Bearish (15m) pós-notícia", zona: [168200, 168400], tipo: "VENDA", entrada: "168300 - 168350", stop: "168600", target: "167200", rr: "1:2.4" }
    ];

    // Filtrar OBs próximos ao preço atual (dentro de 150 pontos para cima/baixo)
    const resultados = obTemplates.filter(ob => {
        const dentro = precoAtual >= ob.zona[0] - 150 && precoAtual <= ob.zona[1] + 150;
        return dentro;
    });

    const container = document.getElementById('resultadosScanner');
    if (resultados.length === 0) {
        container.innerHTML = '<div class="ob-card">⚠️ Nenhum Order Block próximo ao preço atual. Tente outro valor ou aguarde o mercado formar novos OBs.</div>';
        return;
    }

    container.innerHTML = resultados.map(ob => `
        <div class="ob-card">
            <div class="ob-info">
                <h4>${ob.nome} <span class="ob-badge">${ob.tipo}</span></h4>
                <p>🎯 Zona: ${ob.zona[0]} - ${ob.zona[1]}</p>
                <p>📌 Entrada sugerida: <strong>${ob.entrada}</strong></p>
                <p>🛑 Stop: ${ob.stop} &nbsp;|&nbsp; 🎯 Target: ${ob.target}</p>
                <p>📈 R/R estimado: ${ob.rr}</p>
            </div>
            <div class="ob-actions">
                <button onclick="usarEsteOB('${ob.entrada}', '${ob.stop}', '${ob.target}', '${ob.tipo}')">Usar este OB</button>
            </div>
        </div>
    `).join('');
}

// Função para preencher o formulário de trade com os dados do OB escolhido
window.usarEsteOB = function(entrada, stop, target, direcao) {
    // Abrir o modal de novo trade
    const modalEl = document.getElementById('modal');
    modalEl.style.display = 'flex';
    
    // Preencher campos
    // Se a entrada veio como "166200 - 166250", pegamos o primeiro valor
    let entradaValor = entrada.split(' - ')[0];
    document.getElementById('entrada').value = entradaValor;
    document.getElementById('stop').value = stop;
    document.getElementById('target').value = target;
    document.getElementById('direcao').value = direcao;
    document.getElementById('setup').value = 'OB Scanner';
    
    alert(`Pré-preenchido com OB de ${direcao}. Ajuste os valores se necessário e salve o trade.`);
};

// Conectar o botão de escanear
document.getElementById('scannearBtn')?.addEventListener('click', escanearOBs);

// Inicialização
carregarDados();
carregarChecklist();
