/**
 * ASSET.JS - Gestisce la visualizzazione del singolo Asset e del suo storico
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Recupera il ticker dall'URL (es: ?ticker=AAPL)
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get('ticker');

    if (!ticker) {
        window.location.href = 'index.html';
        return;
    }

    await loadAssetData(ticker);
});

async function loadAssetData(ticker) {
    const grid = document.getElementById('asset-feed-grid');
    const hero = document.getElementById('asset-hero');

    try {
        // 2. Recupera Info Asset
        const { data: asset, error: assetErr } = await db
            .from('assets')
            .select('*')
            .eq('ticker', ticker)
            .single();

        if (assetErr) throw assetErr;

        // Render Hero
        hero.innerHTML = `
            <div class="asset-hero-content" style="background: white; padding: 32px; border: 1.5px solid var(--border); border-radius: var(--radius-lg);">
                <span class="suggestion-ticker" style="font-size: 18px; padding: 6px 12px;">${asset.ticker}</span>
                <h1 style="font-family: var(--font-display); font-size: 42px; margin-top: 12px;">${asset.name_full}</h1>
                <p style="color: var(--text-secondary); margin-top: 8px; font-weight: 500;">Settore: ${asset.asset_group}</p>
            </div>
        `;

        // 3. Recupera Storico Insights (Tutte le news che citano questo ticker)
        const { data: insights, error: feedErr } = await db
            .from('market_insights')
            .select(`*, content_feed(*, sources(*)), assets(asset_group)`)
            .eq('asset_ticker', ticker) // Qui potremmo espandere la ricerca se necessario
            .order('id', { ascending: false });

        if (feedErr) throw feedErr;

        // Render Grid (Usiamo la funzione buildCard definita in feed.js o duplicata qui)
        document.getElementById('asset-count').textContent = `${insights.length} insight${insights.length !== 1 ? 's' : ''}`;
        
        if (insights.length === 0) {
            grid.innerHTML = `<div class="state-msg">Nessuna analisi storica trovata per questo asset.</div>`;
            return;
        }

        insights.forEach((insight, i) => {
            // Nota: qui dovresti avere accesso a buildCard. 
            // Se non l'hai esportata, puoi incollarla qui o caricarla via script comune.
            const card = buildCard(insight, i); 
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Errore caricamento asset:", err);
        hero.innerHTML = `<div class="state-msg">Errore nel caricamento dell'asset.</div>`;
    }
}

function buildCard(insight, index) {
    const card = document.createElement('article');
    card.className = 'insight-card';

    // --- LOGICA MULTI-GRUPPO ---
    // Trasformiamo l'array all_groups in una stringa separata da virgole.
    // Questo permette a nav-logic.js di trovare la card anche per gli asset secondari.
    const groupsString = (insight.all_groups || [insight.asset_group || '']).join(',');
    card.dataset.assetGroups = groupsString; 
    
    // Manteniamo questi per compatibilità e per filtri specifici
    card.dataset.confidence = insight.confidence || 0;
    card.dataset.insightType = insight.insight_type;

    // Animazione a cascata
    card.style.animationDelay = `${Math.min(index * 30, 300)}ms`;

    const isMacro = insight.insight_type === 'MACRO_EVENT';
    const pubDate = insight.content_feed?.published_at 
        ? new Date(insight.content_feed.published_at).toLocaleDateString('it-IT', {day:'2-digit', month:'short'}) 
        : '';

    // Genera la lista di tutti i ticker aggregati (es: XAUUSD, EURUSD, US500)
    const tickerButtons = (insight.all_tickers || [insight.asset_ticker || 'MACRO'])
        .map(t => {
            const badgeClass = isMacro ? 'macro-badge' : 'ticker-badge';
            const url = isMacro ? '#' : `asset.html?ticker=${t}`;
            return `<a class="${badgeClass}" href="${url}" style="margin-right: 4px; margin-bottom: 4px; display: inline-block;">${t}</a>`;
        }).join('');

    card.innerHTML = `
        <div class="card-top" style="align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; flex-wrap: wrap; gap: 4px; flex: 1;">
                ${tickerButtons}
            </div>
            <span class="confidence-badge" style="white-space: nowrap;">★ ${insight.confidence || 0}/10</span>
        </div>
        <h2 class="card-title">${insight.title}</h2>
        <div class="card-summary">
            ${insight.summary || ''}
        </div>
        <div class="card-footer">
            <span class="card-source">${insight.content_feed?.sources?.name || 'PRAGMATIC'}</span>
            <span class="card-date">${pubDate}</span>
        </div>
    `;
    
    return card;
}