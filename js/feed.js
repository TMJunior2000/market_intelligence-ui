/**
 * FEED.JS — Caricamento dati Dashboard iniziale
 */

document.addEventListener('componentsReady', async () => {
    await loadAllFeeds();
    
    // Supporto per ricaricamento pagina su un ticker specifico
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get('ticker');
    if (ticker) router.navigateToAsset(ticker);
});

async function loadAllFeeds() {
    const { data, error } = await db
        .from('market_insights')
        .select(`
            *, 
            content_feed!inner(id, title, url, published_at, sources(*)), 
            assets(asset_group)
        `)
        // 1. Ordina per data di pubblicazione UTC (Tabella content_feed)
        .order('published_at', { foreignTable: 'content_feed', ascending: false })
        // 2. Se la data è identica, ordina per ID (Tabella market_insights)
        .order('id', { ascending: false })
        .limit(1000);

    if (error) return console.error(error);

    // Aggregazione Ticker per Notizia
    const aggregatedMap = new Map();
    data.forEach(item => {
        const key = item.title; 
        if (!aggregatedMap.has(key)) {
            aggregatedMap.set(key, { ...item, all_groups: [item.assets?.asset_group || ''], all_tickers: [item.asset_ticker] });
        } else {
            const existing = aggregatedMap.get(key);
            const newGroup = item.assets?.asset_group || '';
            if (!existing.all_groups.includes(newGroup)) existing.all_groups.push(newGroup);
            if (!existing.all_tickers.includes(item.asset_ticker)) existing.all_tickers.push(item.asset_ticker);
        }
    });

    const insights = Array.from(aggregatedMap.values());
    const ora = new Date().getTime();
    const ventiquattroOre = 24 * 60 * 60 * 1000;
    const setteGiorni = 7 * ventiquattroOre;

    const breaking = insights.filter(i => (i.insight_type === 'ASSET' && (ora - new Date(i.content_feed?.published_at).getTime()) <= ventiquattroOre));
    const weekly = insights.filter(i => {
        const diff = ora - new Date(i.content_feed?.published_at).getTime();
        return diff > ventiquattroOre && diff <= setteGiorni;
    });
    const macro = insights.filter(i => i.insight_type === 'MACRO_EVENT');

    renderSection('grid-breaking', 'count-breaking', breaking);
    renderSection('grid-weekly', 'count-weekly', weekly);
    renderSection('grid-macro', 'count-macro', macro);
}

function renderSection(gridId, countId, insights) {
    const grid = document.getElementById(gridId);
    const countEl = document.getElementById(countId);
    if (!grid) return;
    if (countEl) countEl.textContent = `${insights.length} insight${insights.length !== 1 ? 's' : ''}`;
    
    grid.innerHTML = insights.length === 0 ? '<div class="state-msg">Nessun dato recente trovato.</div>' : '';
    insights.forEach((insight, i) => grid.appendChild(buildCard(insight, i)));
}