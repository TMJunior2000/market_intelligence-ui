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
                
                <div class="mt5-specs-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); text-transform: uppercase;">
                    <span><strong style="color: var(--text-secondary);">Spread:</strong> <span id="hero-live-spread">--</span></span>
                    <span><strong style="color: var(--text-secondary);">Tick Val:</strong> <span id="hero-live-tick">--</span></span>
                    <span><strong style="color: var(--text-secondary);">Swap L:</strong> <span id="hero-live-swapl">--</span></span>
                    <span><strong style="color: var(--text-secondary);">Swap S:</strong> <span id="hero-live-swaps">--</span></span>
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
    const inputs = ['in-risk-pc', 'in-lots', 'in-sl-pips'];
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

    // 1. Aggiorna Info Live nella Hero
    if(document.getElementById('hero-live-spread')) document.getElementById('hero-live-spread').innerText = asset.spread;
    if(document.getElementById('hero-live-tick')) document.getElementById('hero-live-tick').innerText = asset.tick_value.toFixed(2);
    if(document.getElementById('hero-live-swapl')) document.getElementById('hero-live-swapl').innerText = asset.swap_long;
    if(document.getElementById('hero-live-swaps')) document.getElementById('hero-live-swaps').innerText = asset.swap_short;

    // 2. Calcolo Termometro Esposizione (Open Risk)
    let totalOpenRiskCash = 0;
    trades.forEach(t => {
        if (t.sl > 0) {
            const dist = Math.abs(t.price_open - t.sl);
            const points = dist / (asset.tick_size || 0.01);
            totalOpenRiskCash += (points * asset.tick_value * (t.volume / 0.1)); 
        }
    });
    const openRiskPc = (totalOpenRiskCash / account.equity) * 100;
    
    const meter = document.getElementById('exposure-meter');
    if(meter) {
        meter.innerText = `HEAT: ${openRiskPc.toFixed(1)}%`;
        meter.style.color = openRiskPc > 5 ? 'var(--bearish)' : (openRiskPc > 2 ? '#f39c12' : 'var(--bullish)');
    }

    // 3. Esegui Calcolo Risk Terminal
    runRiskMath(account, asset);
}

function runRiskMath(account, asset) {
    const slPrice = parseFloat(document.getElementById('in-sl-price')?.value) || 0;
    
    // Variabili MT5 in tempo reale
    const currentPrice = asset.price || 0;
    const tickValue = asset.tick_value || 0;
    const tickSize = asset.tick_size || 0.00001;
    const volMin = asset.volume_min || 0.01;
    const volStep = asset.volume_step || 0.01;
    const contractSize = asset.contract_size || 100000;
    const accLeverage = account.leverage || 30;

    // Se non c'è prezzo o non è inserito lo Stop Loss, azzera tutto
    if (currentPrice === 0 || slPrice === 0) return;

    // 1. Calcolo reale della distanza in Ticks/Punti
    const distance = Math.abs(currentPrice - slPrice);
    const points = distance / tickSize;

    let lots, riskPc, riskCash;

    // --- MODALITÀ AUTO ---
    if (currentRiskMode === 'auto') {
        riskPc = parseFloat(document.getElementById('in-risk-pc').value) || 0;
        riskCash = account.equity * (riskPc / 100);

        // Calcolo Lotti (ValoreUniversale MT5)
        lots = riskCash / (points * tickValue);

        // Normalizzazione MT5: Arrotonda allo step corretto (es. 0.01)
        lots = Math.floor(lots / volStep) * volStep;

        // Sicurezza: Non può essere inferiore al volume minimo del broker
        if (lots < volMin) {
            lots = volMin;
        }

        // Ricalcola il rischio REALE con i lotti arrotondati/minimi
        riskCash = lots * points * tickValue;
        riskPc = (riskCash / account.equity) * 100;

    // --- MODALITÀ MANUAL ---
    } else {
        lots = parseFloat(document.getElementById('in-lots').value) || 0;
        
        // Sicurezza manuale
        if (lots < volMin) lots = volMin;
        lots = Math.round(lots / volStep) * volStep;

        riskCash = lots * points * tickValue;
        riskPc = (riskCash / account.equity) * 100;
    }

    // --- AGGIORNAMENTO UI VALORI BASE ---
    if(document.getElementById('out-cash')) document.getElementById('out-cash').innerText = `$ ${riskCash.toFixed(2)}`;
    if(document.getElementById('out-risk-res')) document.getElementById('out-risk-res').innerText = `${riskPc.toFixed(2)} %`;
    if(document.getElementById('out-lots')) document.getElementById('out-lots').innerText = lots.toFixed(2);
    if(document.getElementById('out-free-margin')) document.getElementById('out-free-margin').innerText = `$ ${(account.margin_free || 0).toFixed(2)}`;

    // --- PROVA DEL NOVE: LEVA E MARGINE CON ALLARME ROSSO ---
    // Il valore nominale mosso a mercato (es. 0.10 lotti d'oro a 2100$ = 21.000$)
    const notionalValue = lots * contractSize * currentPrice;
    
    const marginReq = notionalValue / accLeverage;
    const effectiveLeverage = notionalValue / account.equity;

    const outLeverageEl = document.getElementById('out-leverage');
    const outMarginEl = document.getElementById('out-margin');

    if (outLeverageEl) {
        outLeverageEl.innerText = `Leva 1:${effectiveLeverage.toFixed(1)}`;
        // Diventa rosso se la leva effettiva supera quella massima del conto
        outLeverageEl.style.color = effectiveLeverage > accLeverage ? 'var(--bearish)' : 'var(--text-muted)';
    }

    if (outMarginEl) {
        outMarginEl.innerText = `$ ${marginReq.toFixed(2)}`;
        
        // ALLARME SALVAVITA: Il margine richiesto supera quello libero?
        if (marginReq > account.margin_free) {
            outMarginEl.style.color = 'var(--bearish)'; // Rosso errore
            outMarginEl.style.fontWeight = '900';
            outMarginEl.innerText = `$ ${marginReq.toFixed(2)} (⚠️ INS.)`;
        } else {
            outMarginEl.style.color = 'inherit';
            outMarginEl.style.fontWeight = '700';
        }
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