/**
 * ASSET.JS - Versione SPA Operativa
 * Rendering dei dati tecnici, sentiment e Risk Terminal
 */

// Stato globale del terminale nella pagina
let currentRiskMode = 'auto'; 

async function loadAssetData(ticker) {
    const grid = document.getElementById('asset-feed-grid');
    const hero = document.getElementById('asset-hero');

    // Reset e Spinner
    grid.innerHTML = '<div class="state-msg"><div class="spinner"></div></div>';
    hero.innerHTML = '';

    try {
        const { data: insights, error } = await db
            .from('market_insights')
            .select(`*, assets (*), content_feed (*, sources (*))`)
            .eq('asset_ticker', ticker)
            .order('id', { ascending: false });

        if (error) throw error;
        
        if (!insights || insights.length === 0) {
            hero.innerHTML = `<div class="state-msg">Nessun dato trovato per ${ticker}.</div>`;
            grid.innerHTML = '';
            return;
        }

        const asset = insights[0].assets;
        const lastInsight = insights[0]; 

        // 1. Render Hero base (Identità + Sentiment Matrix)
        renderHero(hero, asset, lastInsight);

        // 2. Render Grid Storica
        grid.innerHTML = '';
        document.getElementById('asset-count').textContent = `${insights.length} insight${insights.length !== 1 ? 's' : ''}`;
        
        insights.forEach((insight, i) => {
            const card = buildCard(insight, i); 
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Errore Asset SPA:", err);
        grid.innerHTML = `<div class="state-msg">Errore nel caricamento dei dati.</div>`;
    }
}

function renderHero(container, asset, insight) {
    container.innerHTML = `
        <div class="asset-hero-content" style="background: white; padding: 40px; border: 1.5px solid var(--border); border-radius: var(--radius-lg); display: grid; grid-template-columns: 1fr 280px 380px; gap: 40px; align-items: start;">
            
            <div class="hero-info">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span class="suggestion-ticker" style="font-size: 14px; background: var(--text-primary); color: white; padding: 4px 10px; border-radius: 4px;">${asset.ticker}</span>
                    <div id="live-asset-badge" style="display:none; font-size:10px; font-weight:800; color:var(--bullish); background:var(--bullish-bg); padding:4px 8px; border-radius:4px; text-transform:uppercase;">
                        <i class="fas fa-circle-notch fa-spin"></i> In Position
                    </div>
                </div>
                <h1 style="font-family: var(--font-display); font-size: 42px; font-weight: 900; margin: 0 0 16px; color: var(--text-primary); line-height: 1.1;">${asset.name_full}</h1>
                
                <div class="mt5-specs-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); text-transform: uppercase;">
                    
                    <span class="spec-item" title="Prezzo attuale di mercato (Ask/Last)">
                        <strong style="color: var(--text-secondary);">Prezzo:</strong> <span id="hero-live-price">--</span> 
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="Dimensione minima dell'ordine consentita dal broker">
                        <strong style="color: var(--text-secondary);">Min Lot:</strong> <span id="hero-live-volmin">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="Dimensione massima dell'ordine consentita per singola operazione">
                        <strong style="color: var(--text-secondary);">Max Lot:</strong> <span id="hero-live-volmax">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="Differenza tra prezzo Bid e Ask in punti">
                        <strong style="color: var(--text-secondary);">Spread:</strong> <span id="hero-live-spread">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="Valore monetario di un singolo tick (variazione minima) per 1 lotto intero">
                        <strong style="color: var(--text-secondary);">Tick Val:</strong> <span id="hero-live-tick">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="La variazione minima di prezzo possibile per questo asset">
                        <strong style="color: var(--text-secondary);">Tick Size:</strong> <span id="hero-live-ticksize">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="Quantità di asset sottostante controllata da 1 lotto (es. 100 per Oro, 100.000 per Forex)">
                        <strong style="color: var(--text-secondary);">Contract:</strong> <span id="hero-live-contract">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="Interesse pagato o ricevuto per mantenere una posizione Buy aperta durante la notte">
                        <strong style="color: var(--text-secondary);">Swap L:</strong> <span id="hero-live-swapl">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>

                    <span class="spec-item" title="Interesse pagato o ricevuto per mantenere una posizione Sell aperta durante la notte">
                        <strong style="color: var(--text-secondary);">Swap S:</strong> <span id="hero-live-swaps">--</span>
                        <i class="fas fa-question-circle" style="font-size: 9px; cursor: help;"></i>
                    </span>
                </div>
            </div>

            <div class="sentiment-matrix" style="border-left: 1.5px solid var(--border); padding-left: 30px; display: flex; flex-direction: column; gap: 15px;">
                <h4 style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: var(--text-muted); text-transform: uppercase;">Market Sentiment</h4>
                ${renderSentimentRow('Short Term', insight.sentiment_short)}
                ${renderSentimentRow('Medium Term', insight.sentiment_medium)}
                ${renderSentimentRow('Long Term', insight.sentiment_long)}
            </div>

            <div id="risk-terminal-slot">
                <div class="state-msg"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    loadRiskTerminal(asset);
}

async function loadRiskTerminal(asset) {
    const slot = document.getElementById('risk-terminal-slot');
    try {
        const response = await fetch('components/asset-strategy.html');
        slot.innerHTML = await response.text();
        initTerminalLogic(asset);
    } catch (err) {
        slot.innerHTML = `<div class="state-msg">Errore terminale.</div>`;
    }
}

/**
 * LOGICA OPERATIVA DEL TERMINALE
 */

function setRiskMode(mode) {
    currentRiskMode = mode;
    document.getElementById('group-risk').style.display = mode === 'auto' ? 'block' : 'none';
    document.getElementById('group-lots').style.display = mode === 'manual' ? 'block' : 'none';
    
    // Toggle classi bottoni
    document.getElementById('btn-auto').classList.toggle('active-tgl', mode === 'auto');
    document.getElementById('btn-manual').classList.toggle('active-tgl', mode === 'manual');

    if (window.lastMT5Data) updateAssetCalculations(window.lastMT5Data);
}

function initTerminalLogic(asset) {
    const inputs = ['in-risk-pc', 'in-lots', 'in-sl-price', 'in-entry-price'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
            if (window.lastMT5Data) updateAssetCalculations(window.lastMT5Data);
        });
    });
    
    if (window.lastMT5Data) updateAssetCalculations(window.lastMT5Data);
}

function updateAssetCalculations(mt5Data) {
    const asset = mt5Data.current_asset;
    const account = mt5Data.account;
    const trades = mt5Data.trades;

    if (!asset || !account) return;

    // Aggiornamento etichette live nella Hero
    const updateEl = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    updateEl('hero-live-price', asset.price);
    updateEl('hero-live-volmin', asset.volume_min);
    updateEl('hero-live-volmax', asset.volume_max || '--');
    updateEl('hero-live-spread', asset.spread);
    updateEl('hero-live-tick', asset.tick_value.toFixed(2));
    updateEl('hero-live-ticksize', asset.tick_size);
    updateEl('hero-live-contract', asset.contract_size);
    updateEl('hero-live-swapl', asset.swap_long);
    updateEl('hero-live-swaps', asset.swap_short);

    // Calcolo HEAT (Esposizione totale)
    let totalOpenRiskCash = 0;
    trades.forEach(t => {
        if (t.sl > 0) {
            const dist = Math.abs(t.price_open - t.sl);
            const points = dist / (asset.tick_size || 0.01);
            totalOpenRiskCash += (points * asset.tick_value * t.volume); 
        }
    });
    
    // Salviamo questo dato nella window per poterlo usare in runRiskMath
    window.currentOpenRiskCash = totalOpenRiskCash;

    const openRiskPc = (totalOpenRiskCash / account.balance) * 100; // Meglio usare Balance
    const meter = document.getElementById('exposure-meter');
    if(meter) {
        meter.innerText = `HEAT: ${openRiskPc.toFixed(1)}%`;
        meter.style.color = openRiskPc > 5 ? 'var(--bearish)' : (openRiskPc > 2 ? '#f39c12' : 'var(--bullish)');
    }

    runRiskMath(account, asset);
}

/**
 * LOGICA MATEMATICA RISK TERMINAL
 */
function runRiskMath(account, asset) {
    const slPrice = parseFloat(document.getElementById('in-sl-price')?.value) || 0;
    const entryInputEl = document.getElementById('in-entry-price');
    const lotsInputEl = document.getElementById('in-lots');
    
    const livePrice = asset.price || 0;
    if (entryInputEl && !entryInputEl.value && livePrice > 0) {
        entryInputEl.value = livePrice;
    }
    const entryPrice = parseFloat(entryInputEl?.value) || livePrice || 0;

    // --- Rilevamento Direzione ---
    const dirBadge = document.getElementById('trade-direction-badge');
    if (dirBadge) {
        if (slPrice === 0) {
            dirBadge.innerText = "INSERISCI S.L. PER DIREZIONE";
            dirBadge.style.background = "var(--bg-subtle)";
        } else if (slPrice < entryPrice) {
            dirBadge.innerText = "⬆️ LONG (BUY)";
            dirBadge.style.background = "var(--bullish-bg)";
            dirBadge.style.color = "var(--bullish)";
        } else if (slPrice > entryPrice) {
            dirBadge.innerText = "⬇️ SHORT (SELL)";
            dirBadge.style.background = "var(--bearish-bg)";
            dirBadge.style.color = "var(--bearish)";
        }
    }

    const tickValue = asset.tick_value || 0;
    const tickSize = asset.tick_size || 0.00001;
    const volMin = asset.volume_min || 0.01;
    const volStep = asset.volume_step || 0.01;
    const contractSize = asset.contract_size || 1;
    const accLeverage = account.leverage || 50;

    if (entryPrice === 0 || slPrice === 0) return;

    const distance = Math.abs(entryPrice - slPrice);
    const points = distance / tickSize;

    let lots, riskPc, riskCash;
    let isImpossible = false;

    if (currentRiskMode === 'auto') {
        const requestedRiskPc = parseFloat(document.getElementById('in-risk-pc').value) || 0;
        const requestedRiskCash = account.balance * (requestedRiskPc / 100);

        // Calcolo teorico lotti
        lots = requestedRiskCash / (points * tickValue);
        
        // Verifica se i lotti teorici sono sotto il minimo del broker
        if (lots < volMin && requestedRiskPc > 0) {
            isImpossible = true;
            lots = volMin; // Forziamo al minimo per mostrare il rischio reale
        } else {
            lots = Math.floor(lots / volStep) * volStep;
        }

        riskCash = lots * points * tickValue;
        riskPc = (riskCash / account.balance) * 100;
    } else {
        lots = parseFloat(lotsInputEl.value) || 0;
        if (lots < volMin) { lots = volMin; lotsInputEl.value = volMin; }
        lots = Math.round(lots / volStep) * volStep;
        riskCash = lots * points * tickValue;
        riskPc = (riskCash / account.balance) * 100;
    }

    // --- LOGICA DI BLOCCO E WARNING ---
    const outRiskResEl = document.getElementById('out-risk-res');
    if (outRiskResEl) {
        if (isImpossible) {
            outRiskResEl.innerHTML = `<span style="color:var(--bearish); font-weight:900;">${riskPc.toFixed(2)}%</span><br>
            <span style="font-size:7px; color:var(--bearish); display:block; line-height:1; margin-top:2px;">⚠️ S.L. TROPPO AMPIO PER 0.01 LOTTI</span>`;
            document.getElementById('out-cash').style.color = 'var(--bearish)';
        } else {
            outRiskResEl.innerText = `${riskPc.toFixed(2)} %`;
            outRiskResEl.style.color = 'var(--text-muted)';
            document.getElementById('out-cash').style.color = 'var(--bearish)';
        }
    }

    // Calcolo Leva e Margine (Cap a 1:50)
    let finalLeverage = accLeverage; 
    if (asset.margin_calc_1_lot && asset.margin_calc_1_lot > 0) {
        const theoreticalAssetLeva = (entryPrice * contractSize) / asset.margin_calc_1_lot;
        finalLeverage = Math.min(theoreticalAssetLeva, accLeverage);
    }

    const marginReq = (lots * contractSize * entryPrice) / finalLeverage;
    
    // Aggiornamento UI
    if(document.getElementById('out-cash')) document.getElementById('out-cash').innerText = `$ ${riskCash.toFixed(2)}`;
    if(document.getElementById('out-lots')) document.getElementById('out-lots').innerText = lots.toFixed(2);
    
    const outMarginEl = document.getElementById('out-margin');
    if (outMarginEl) {
        outMarginEl.innerText = `$ ${marginReq.toFixed(2)}`;
        outMarginEl.style.color = marginReq > (account.margin_free || 0) ? 'var(--bearish)' : 'inherit';
    }

    // Scenario Peggiore (Global Risk)
    const openTradesWorstCase = window.currentWorstCasePnLCash || 0;
    const totalApocalypsePnL = openTradesWorstCase - riskCash;
    const projectedBalance = account.balance + totalApocalypsePnL;

    if (document.getElementById('out-open-risk')) {
        const el = document.getElementById('out-open-risk');
        el.innerText = openTradesWorstCase >= 0 ? `+$ ${openTradesWorstCase.toFixed(2)}` : `-$ ${Math.abs(openTradesWorstCase).toFixed(2)}`;
        el.style.color = openTradesWorstCase >= 0 ? 'var(--bullish)' : 'var(--bearish)';
    }
    if (document.getElementById('out-projected-balance')) {
        const el = document.getElementById('out-projected-balance');
        el.innerText = `$ ${projectedBalance.toFixed(2)}`;
        el.style.color = projectedBalance >= account.balance ? 'var(--bullish)' : (projectedBalance < 0 ? 'var(--bearish)' : 'var(--text-primary)');
    }
}

function renderSentimentRow(label, sentiment) {
    const s = (sentiment || 'UNKNOWN').toUpperCase();
    let color = 'var(--text-muted)';
    let bg = 'var(--bg-subtle)';
    if (s === 'BULLISH') { color = 'var(--bullish)'; bg = 'var(--bullish-bg)'; }
    if (s === 'BEARISH') { color = 'var(--bearish)'; bg = 'var(--bearish-bg)'; }
    return `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${label}</span>
            <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: ${color}; background: ${bg}; padding: 4px 12px; border-radius: 4px; min-width: 85px; text-align: center;">${s}</span>
        </div>
    `;
}