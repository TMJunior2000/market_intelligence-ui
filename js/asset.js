/**
 * ASSET.JS - Versione SPA
 * Rendering dei dati tecnici e del sentiment matrix
 */

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

        // 1. Render Hero (Dati tecnici FP Markets + Sentiment Matrix)
        renderHero(hero, asset, lastInsight);

        // 2. Render Grid Storica
        grid.innerHTML = '';
        document.getElementById('asset-count').textContent = `${insights.length} insight${insights.length !== 1 ? 's' : ''}`;
        
        insights.forEach((insight, i) => {
            const card = buildCard(insight, i); // Funzione in ui-utils.js
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Errore Asset SPA:", err);
        grid.innerHTML = `<div class="state-msg">Errore nel caricamento dei dati.</div>`;
    }
}

function renderHero(container, asset, insight) {
    container.innerHTML = `
        <div class="asset-hero-content" style="background: white; padding: 40px; border: 1.5px solid var(--border); border-radius: var(--radius-lg); display: grid; grid-template-columns: 1fr 350px; gap: 60px; align-items: center;">
            <div class="hero-info">
                <span class="suggestion-ticker" style="font-size: 14px; background: var(--text-primary); color: white; padding: 4px 10px; border-radius: 4px;">${asset.ticker}</span>
                <h1 style="font-family: var(--font-display); font-size: 48px; font-weight: 900; margin: 16px 0 8px; color: var(--text-primary); line-height: 1.1;">${asset.name_full}</h1>
                <div style="display: flex; gap: 24px; font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">
                    <span><strong style="color: var(--text-secondary);">Gruppo:</strong> ${asset.asset_group}</span>
                    <span><strong style="color: var(--text-secondary);">Profit:</strong> ${asset.currency_profit}</span>
                    <span><strong style="color: var(--text-secondary);">Size:</strong> ${asset.contract_size}</span>
                </div>
            </div>
            <div class="sentiment-matrix" style="border-left: 1.5px solid var(--border); padding-left: 40px; display: flex; flex-direction: column; gap: 20px;">
                <h4 style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px;">Market Sentiment</h4>
                ${renderSentimentRow('Short Term', insight.sentiment_short)}
                ${renderSentimentRow('Medium Term', insight.sentiment_medium)}
                ${renderSentimentRow('Long Term', insight.sentiment_long)}
            </div>
        </div>
    `;
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