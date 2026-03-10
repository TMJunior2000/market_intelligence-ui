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
            content_feed!inner(*, sources(*)), 
            assets(asset_group)
        `)
        .order('published_at', { foreignTable: 'content_feed', ascending: false })
        .order('confidence', { ascending: false })
        .order('id', { ascending: false })
        .limit(1000);

    if (error) return console.error(error);

    const aggregatedMap = new Map();
    
    data.forEach(item => {
        const key = item.title; 
        
        if (!aggregatedMap.has(key)) {
            // Primo avvistamento: inizializziamo la card con i dati del primo asset
            aggregatedMap.set(key, { 
                ...item, 
                all_groups: [item.assets?.asset_group || ''], 
                all_tickers: [item.asset_ticker] 
            });
        } else {
            const existing = aggregatedMap.get(key);
            const newGroup = item.assets?.asset_group || '';
            
            // 1. Aggreghiamo i badge (Ticker e Gruppi)
            if (!existing.all_groups.includes(newGroup)) existing.all_groups.push(newGroup);
            if (!existing.all_tickers.includes(item.asset_ticker)) existing.all_tickers.push(item.asset_ticker);
            
            // 2. GOLDEN RULE: Se questo asset ha una confidenza maggiore, 
            // sovrascriviamo il sentiment della card con quello più affidabile.
            if (item.confidence > existing.confidence) {
                existing.confidence = item.confidence;
                existing.sentiment_short = item.sentiment_short;
                existing.sentiment_medium = item.sentiment_medium;
                existing.sentiment_long = item.sentiment_long;
                // Opzionale: aggiorniamo l'ID per lo spareggio nel sort finale
                existing.id = item.id; 
            }
        }
    });

    const insights = Array.from(aggregatedMap.values());

    // Ordinamento finale per garantire la gerarchia visiva
    insights.sort((a, b) => {
        const dateA = new Date(a.content_feed.published_at).getTime();
        const dateB = new Date(b.content_feed.published_at).getTime();

        if (dateB !== dateA) return dateB - dateA;
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return b.id - a.id;
    });

    const ora = new Date().getTime();
    const ventiquattroOre = 24 * 60 * 60 * 1000;
    const setteGiorni = 7 * ventiquattroOre;

    // Filtri per sezione
    const breaking = insights.filter(i => (i.insight_type === 'ASSET' && (ora - new Date(i.content_feed?.published_at).getTime()) <= ventiquattroOre));
    
    const weekly = insights.filter(i => {
        const diff = ora - new Date(i.content_feed?.published_at).getTime();
        return i.insight_type === 'ASSET' && diff > ventiquattroOre && diff <= setteGiorni;
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