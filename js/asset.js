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

        renderHero(hero, asset, smartSentiment, insights.length);

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

// Aggiungi "count" ai parametri
function renderHero(container, asset, sentimentObj, count) {
    container.innerHTML = `
        <div class="asset-hero-content" style="background: white; padding: 40px; border: 1.5px solid var(--border); border-radius: var(--radius-lg); display: grid; grid-template-columns: 1fr 280px 380px; gap: 40px; align-items: start;">
            <div class="hero-info">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <span class="suggestion-ticker" style="font-size: 14px; background: var(--text-primary); color: white; padding: 4px 10px; border-radius: 4px;">${asset.ticker}</span>
                    <div id="hero-performance-bar" style="display: flex; gap: 12px; font-family: var(--font-mono); font-size: 11px; font-weight: 800; text-transform: uppercase;">
                        <span id="perf-today">--</span>
                        <span id="perf-w" style="opacity: 0.7;">--</span>
                        <span id="perf-m" style="opacity: 0.7;">--</span>
                        <span id="perf-six_m" style="opacity: 0.7;">--</span>
                    </div>
                </div>
                <h1 style="font-family: var(--font-display); font-size: 42px; font-weight: 900; margin: 0 0 16px; color: var(--text-primary); line-height: 1.1;">${asset.name_full}</h1>
                <div class="mt5-specs-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); text-transform: uppercase;">
                    <span class="spec-item"><strong>Prezzo:</strong> <span id="hero-live-price">--</span></span>
                    <span class="spec-item"><strong>Spread:</strong> <span id="hero-live-spread">--</span></span>
                    <span class="spec-item"><strong>Contract:</strong> <span id="hero-live-contract">--</span></span>
                    <span class="spec-item"><strong>Tick Val:</strong> <span id="hero-live-tick">--</span></span>
                    <span class="spec-item"><strong>Swap L:</strong> <span id="hero-live-swapl">--</span></span>
                    <span class="spec-item"><strong>Swap S:</strong> <span id="hero-live-swaps">--</span></span>
                </div>
                <div id="hero-fvg-confluences" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;"></div>
            </div>
            <div class="sentiment-matrix" style="border-left: 1.5px solid var(--border); padding-left: 30px; display: flex; flex-direction: column; gap: 15px;">
                <h4 style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: var(--text-muted); text-transform: uppercase;">Consenso Pesato (${count})</h4>
                ${renderSentimentRow('Short Term', sentimentObj.short)}
                ${renderSentimentRow('Medium Term', sentimentObj.medium)}
                ${renderSentimentRow('Long Term', sentimentObj.long)}
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
    if (!asset || !mt5Data.account) return;

    // Helper per testo semplice
    const updateEl = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    };

    updateEl('hero-live-price', asset.price);
    updateEl('hero-live-spread', asset.spread);
    updateEl('hero-live-tick', asset.tick_value.toFixed(2));
    updateEl('hero-live-contract', asset.contract_size);
    updateEl('hero-live-swapl', asset.swap_long);
    updateEl('hero-live-swaps', asset.swap_short);

    // --- AGGIORNAMENTO PERFORMANCE COLORATO ---
    if (asset.performance) {
        const setPerf = (id, label, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            const sign = val >= 0 ? '+' : '';
            el.innerText = `${label} ${sign}${val}%`;
            el.style.color = val >= 0 ? 'var(--bullish)' : 'var(--bearish)';
        };

        setPerf('perf-today', 'Today', asset.performance.today);
        setPerf('perf-w', '5D', asset.performance.w);
        setPerf('perf-m', '1M', asset.performance.m);
        setPerf('perf-six_m', '6M', asset.performance.six_m);
    }

    // --- RENDER FVG CONTEXT ---
    const fvgZone = document.getElementById('hero-fvg-confluences');
    if (fvgZone && asset.fvg_context) {
        fvgZone.innerHTML = ''; // Reset per live update
        const fvg = asset.fvg_context;

        // 1. SE IL PREZZO E' DENTRO UN FVG
        if (fvg.in_fvg) {
            const isBullish = fvg.in_fvg.type.includes('BULLISH');
            const color = isBullish ? 'var(--bullish)' : 'var(--bearish)';
            const bg = isBullish ? 'var(--bullish-bg)' : 'var(--bearish-bg)';
            
            fvgZone.innerHTML += `
                <div style="background: ${bg}; color: ${color}; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; border: 1px solid ${color}; display: flex; align-items: center; gap: 6px; animation: pulse 2s infinite;">
                    <i class="fas fa-bolt"></i> PRICE INSIDE H4 FVG [${fvg.in_fvg.top.toFixed(5)} - ${fvg.in_fvg.bottom.toFixed(5)}]
                </div>
            `;
        }

        // 2. MOSTRA DISTANZA DAL SUPPORTO PIU' VICINO
        if (fvg.support && !fvg.in_fvg) {
            const distPoints = ((asset.price - fvg.support.top) / asset.tick_size).toFixed(0);
            fvgZone.innerHTML += `
                <div title="Supporto FVG Storico Non Mitigato" style="background: var(--bg-subtle); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid var(--border);">
                    <i class="fas fa-arrow-down" style="color: var(--bullish);"></i> SUPPORTO FVG a ${distPoints} pts (${fvg.support.top.toFixed(5)})
                </div>
            `;
        }

        // 3. MOSTRA DISTANZA DALLA RESISTENZA PIU' VICINA
        if (fvg.resistance && !fvg.in_fvg) {
            const distPoints = ((fvg.resistance.bottom - asset.price) / asset.tick_size).toFixed(0);
            fvgZone.innerHTML += `
                <div title="Resistenza FVG Storica Non Mitigata" style="background: var(--bg-subtle); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid var(--border);">
                    <i class="fas fa-arrow-up" style="color: var(--bearish);"></i> RESISTENZA FVG a ${distPoints} pts (${fvg.resistance.bottom.toFixed(5)})
                </div>
            `;
        }
    }

    // Ricalcola il rischio nel terminale operativo
    runRiskMath(mt5Data.account, asset);
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
    
    const scores = {
        short: { val: 0, w: 0 },
        medium: { val: 0, w: 0 },
        long: { val: 0, w: 0 }
    };

    insights.forEach(i => {
        const pubDate = new Date(i.content_feed?.published_at).getTime();
        const orePassate = (now - pubDate) / (1000 * 60 * 60);
        
        // Parametri professionali
        const timeDecay = Math.max(0, 1 - (orePassate / 96)); // 4 giorni di validità
        const authority = i.insight_type === 'MACRO_EVENT' ? 1.5 : 1.0;
        const weight = i.confidence * timeDecay * authority;

        const getScore = (sentiment) => {
            if (sentiment === 'BULLISH') return 1;
            if (sentiment === 'BEARISH') return -1;
            return 0; // NEUTRAL o UNKNOWN
        };

        // Calcolo SHORT (focus 24h, ignoriamo news vecchie)
        if (orePassate <= 24 && i.sentiment_short !== 'UNKNOWN') {
            scores.short.val += getScore(i.sentiment_short) * weight;
            scores.short.w += weight;
        }

        // Calcolo MEDIUM (focus 7 giorni)
        if (i.sentiment_medium !== 'UNKNOWN') {
            scores.medium.val += getScore(i.sentiment_medium) * weight;
            scores.medium.w += weight;
        }

        // Calcolo LONG (solo se confidenza alta, ignoriamo il decay temporale)
        if (i.sentiment_long !== 'UNKNOWN' && i.confidence >= 7) {
            scores.long.val += getScore(i.sentiment_long) * i.confidence; // Qui il tempo conta meno della qualità
            scores.long.w += i.confidence;
        }
    });

    const finalize = (obj) => {
        if (obj.w === 0) return 'UNKNOWN';
        const ratio = obj.val / obj.w;
        if (ratio > 0.2) return 'BULLISH';   // Oltre il 20% di sbilanciamento
        if (ratio < -0.2) return 'BEARISH';
        return 'NEUTRAL';
    };

    return {
        short: finalize(scores.short),
        medium: finalize(scores.medium),
        long: finalize(scores.long)
    };
}