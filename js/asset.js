/**
 * ASSET.JS - Versione Manual Only
 * Calcolo rischio e margini basati su lotti inseriti dall'utente
 */

async function loadAssetData(ticker) {
    const grid = document.getElementById('asset-feed-grid');
    const hero = document.getElementById('asset-hero');

    grid.innerHTML = '<div class="state-msg"><div class="spinner"></div></div>';
    hero.innerHTML = '';

    try {
        const { data: rawInsights, error } = await db
            .from('market_insights')
            .select(`*, assets (*), content_feed!inner (*, sources (*))`)
            .eq('asset_ticker', ticker)
            // 1. MODIFICA: Ordina per data pubblicazione (UTC) e poi per Confidence
            .order('published_at', { foreignTable: 'content_feed', ascending: false })
            .order('confidence', { ascending: false });

        if (error) throw error;
        
        if (!rawInsights || rawInsights.length === 0) {
            hero.innerHTML = `<div class="state-msg">Nessun dato trovato per ${ticker}.</div>`;
            grid.innerHTML = '';
            return;
        }

        // 2. MODIFICA: Sort manuale per garantire l'ordine esatto anche nel rendering
        const insights = rawInsights.sort((a, b) => {
            const dateA = new Date(a.content_feed.published_at).getTime();
            const dateB = new Date(b.content_feed.published_at).getTime();
            if (dateB !== dateA) return dateB - dateA;
            if (b.confidence !== a.confidence) return b.confidence - a.confidence;
            return b.id - a.id;
        });

        const asset = insights[0].assets;
        const smartSentiment = calculateSmartSentiment(insights);

        renderHero(hero, asset, smartSentiment);

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
                </div>
                <h1 style="font-family: var(--font-display); font-size: 42px; font-weight: 900; margin: 0 0 16px; color: var(--text-primary); line-height: 1.1;">${asset.name_full}</h1>
                <div class="mt5-specs-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); text-transform: uppercase;">
                    <span class="spec-item"><strong>Prezzo:</strong> <span id="hero-live-price">--</span></span>
                    <span class="spec-item"><strong>Min Lot:</strong> <span id="hero-live-volmin">--</span></span>
                    <span class="spec-item"><strong>Max Lot:</strong> <span id="hero-live-volmax">--</span></span>
                    <span class="spec-item"><strong>Spread:</strong> <span id="hero-live-spread">--</span></span>
                    <span class="spec-item"><strong>Tick Val:</strong> <span id="hero-live-tick">--</span></span>
                    <span class="spec-item"><strong>Tick Size:</strong> <span id="hero-live-ticksize">--</span></span>
                    <span class="spec-item"><strong>Contract:</strong> <span id="hero-live-contract">--</span></span>
                    <span class="spec-item"><strong>Swap L:</strong> <span id="hero-live-swapl">--</span></span>
                    <span class="spec-item"><strong>Swap S:</strong> <span id="hero-live-swaps">--</span></span>
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

function initTerminalLogic(asset) {
    const inputs = ['in-lots', 'in-sl-price', 'in-entry-price'];
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

    // Update Hero Labels
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

    runRiskMath(account, asset);
}

function runRiskMath(account, asset) {
    const slPrice = parseFloat(document.getElementById('in-sl-price')?.value) || 0;
    const entryInputEl = document.getElementById('in-entry-price');
    const lotsInputEl = document.getElementById('in-lots');
    
    const livePrice = asset.price || 0;
    if (entryInputEl && !entryInputEl.value && livePrice > 0) {
        entryInputEl.value = livePrice;
    }
    const entryPrice = parseFloat(entryInputEl?.value) || livePrice || 0;

    // Direzione
    const dirBadge = document.getElementById('trade-direction-badge');
    if (dirBadge) {
        if (slPrice === 0) {
            dirBadge.innerText = "INSERISCI S.L. PER DIREZIONE";
            dirBadge.style.background = "var(--bg-subtle)";
        } else if (slPrice < entryPrice) {
            dirBadge.innerText = "⬆️ LONG (BUY)";
            dirBadge.style.background = "var(--bullish-bg)";
            dirBadge.style.color = "var(--bullish)";
        } else {
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

    if (entryPrice === 0 || slPrice === 0) return;

    const distance = Math.abs(entryPrice - slPrice);
    const points = distance / tickSize;

    // Calcolo manuale basato sui lotti
    let lots = parseFloat(lotsInputEl.value) || 0;
    if (lots < volMin) { lots = volMin; lotsInputEl.value = volMin; }
    lots = Math.round(lots / volStep) * volStep;
    
    const riskCash = lots * points * tickValue;
    const riskPc = (riskCash / account.balance) * 100;

    // Leva Real-time
    let effectiveLeva = account.leverage;
    if (asset.margin_calc_1_lot && asset.margin_calc_1_lot > 0) {
        effectiveLeva = (entryPrice * contractSize) / asset.margin_calc_1_lot;
    }

    const marginReq = (asset.margin_calc_1_lot || 0) * lots;

    // UI
    if(document.getElementById('out-cash')) document.getElementById('out-cash').innerText = `$ ${riskCash.toFixed(2)}`;
    if(document.getElementById('out-lots')) document.getElementById('out-lots').innerText = lots.toFixed(2);
    
    const outLeverageEl = document.getElementById('out-leverage');
    if (outLeverageEl) {
        const roundedLeva = Math.round(effectiveLeva);
        outLeverageEl.innerText = roundedLeva <= 1 ? "Leva 1:1 (SPOT)" : `Leva Asset 1:${roundedLeva}`;
    }

    const outRiskResEl = document.getElementById('out-risk-res');
    if (outRiskResEl) {
        outRiskResEl.innerText = `${riskPc.toFixed(2)} %`;
    }

    const outMarginEl = document.getElementById('out-margin');
    if (outMarginEl) {
        outMarginEl.innerText = `$ ${marginReq.toFixed(2)}`;
        outMarginEl.style.color = marginReq > (account.margin_free || 0) ? 'var(--bearish)' : 'inherit';
    }

    if(document.getElementById('out-free-margin')) {
        document.getElementById('out-free-margin').innerText = `$ ${(account.margin_free || 0).toFixed(2)}`;
    }

    // Worst Case
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
        el.style.color = projectedBalance >= account.balance ? 'var(--bullish)' : 'var(--text-primary)';
    }

    const totalRiskPcEl = document.getElementById('out-total-risk-pc');
    if (totalRiskPcEl) {
        if (totalApocalypsePnL >= 0) {
            totalRiskPcEl.innerText = `PROFITTO GARANTITO: +$ ${totalApocalypsePnL.toFixed(2)}`;
            totalRiskPcEl.style.color = 'var(--bullish)';
        } else {
            const riskPcStr = ((Math.abs(totalApocalypsePnL) / account.balance) * 100).toFixed(1);
            totalRiskPcEl.innerText = `RISCHIO TOTALE: ${riskPcStr}%`;
        }
    }
}

/**
 * Funzione di utilità per renderizzare le righe del sentiment
 * (Re-inserita per correggere il ReferenceError)
 */
function renderSentimentRow(label, sentiment) {
    const s = (sentiment || 'UNKNOWN').toUpperCase();
    let color = 'var(--text-muted)';
    let bg = 'var(--bg-subtle)';
    
    if (s === 'BULLISH') { 
        color = 'var(--bullish)'; 
        bg = 'var(--bullish-bg)'; 
    } else if (s === 'BEARISH') { 
        color = 'var(--bearish)'; 
        bg = 'var(--bearish-bg)'; 
    }
    
    return `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${label}</span>
            <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: ${color}; background: ${bg}; padding: 4px 12px; border-radius: 4px; min-width: 85px; text-align: center;">${s}</span>
        </div>
    `;
}

function calculateSmartSentiment(insights) {
    const now = new Date().getTime();
    
    // Contenitori per i punteggi (total = somma valori, weight = somma confidenza)
    let scores = {
        short: { total: 0, weight: 0 },
        medium: { total: 0, weight: 0 },
        long: { total: 0, weight: 0 }
    };

    insights.forEach(i => {
        // Calcolo decadimento temporale (Time Decay)
        const pubDate = new Date(i.content_feed?.published_at).getTime();
        const orePassate = (now - pubDate) / (1000 * 60 * 60);
        
        // Peso temporale: una news di 1 ora fa pesa 1.0, una di 48 ore fa pesa 0.5
        // Questo evita che analisi vecchie "sporchino" il sentiment attuale
        const timeDecay = Math.max(0, 1 - (orePassate / 96)); 

        // Peso dell'Autorità: i MACRO_EVENT pesano il 20% in più perché muovono tutto il mercato
        const authorityFactor = i.insight_type === 'MACRO_EVENT' ? 1.2 : 1.0;

        // Moltiplicatore finale: Fiducia * Tempo * Tipo News
        const finalWeight = i.confidence * timeDecay * authorityFactor;

        // Funzione per mappare il sentiment in valori numerici
        const mapVal = (s) => {
            if (s === 'BULLISH') return 1;
            if (s === 'BEARISH') return -1;
            return 0; // NEUTRAL o UNKNOWN non spostano il trend ma aumentano la massa critica
        };

        // Accumulo SHORT TERM
        if (i.sentiment_short !== 'UNKNOWN') {
            scores.short.total += mapVal(i.sentiment_short) * finalWeight;
            scores.short.weight += finalWeight;
        }

        // Accumulo MEDIUM TERM
        if (i.sentiment_medium !== 'UNKNOWN') {
            scores.medium.total += mapVal(i.sentiment_medium) * finalWeight;
            scores.medium.weight += finalWeight;
        }

        // Accumulo LONG TERM (Solo se la confidenza è alta, il lungo periodo richiede certezze)
        if (i.sentiment_long !== 'UNKNOWN' && i.confidence >= 5) {
            scores.long.total += mapVal(i.sentiment_long) * finalWeight;
            scores.long.weight += finalWeight;
        }
    });

    // Funzione per convertire il punteggio numerico finale in Etichetta
    const getFinalLabel = (obj) => {
        if (obj.weight === 0) return 'UNKNOWN';
        
        const finalScore = obj.total / obj.weight; // Media pesata (risultato tra -1 e 1)

        // Threshold (Soglie): 0.15 è la zona di tolleranza per il NEUTRAL
        if (finalScore > 0.15) return 'BULLISH';
        if (finalScore < -0.15) return 'BEARISH';
        return 'NEUTRAL';
    };

    return {
        short: getFinalLabel(scores.short),
        medium: getFinalLabel(scores.medium),
        long: getFinalLabel(scores.long)
    };
}