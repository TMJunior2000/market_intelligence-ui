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

    // 1. AGGREGAZIONE UNICA PER FEED_ID (Evita fusioni di titoli uguali in date diverse)
    const aggregatedMap = new Map();
    data.forEach(item => {
        // Usiamo feed_id come chiave: 1 Card = 1 Video o 1 Post di Trump
        const key = item.feed_id; 
        
        if (!aggregatedMap.has(key)) {
            aggregatedMap.set(key, { 
                ...item, 
                all_groups: [item.assets?.asset_group || ''], 
                all_tickers: [item.asset_ticker] 
            });
        } else {
            const existing = aggregatedMap.get(key);
            const newGroup = item.assets?.asset_group || '';
            if (!existing.all_groups.includes(newGroup)) existing.all_groups.push(newGroup);
            if (!existing.all_tickers.includes(item.asset_ticker)) existing.all_tickers.push(item.asset_ticker);
            
            // Se per lo stesso video un ticker ha confidence 9 e l'altro 4, 
            // la card deve mostrare 9 (la più importante)
            if (item.confidence > existing.confidence) existing.confidence = item.confidence;
        }
    });

    // 2. CONVERSIONE E SORT MANUALE (Sicurezza Finale)
    // Nonostante l'ordine di Supabase, il sort in JS garantisce che il frontend non faccia scherzi
    const insights = Array.from(aggregatedMap.values()).sort((a, b) => {
        const dateA = new Date(a.content_feed.published_at).getTime();
        const dateB = new Date(b.content_feed.published_at).getTime();

        // Criterio 1: Data di pubblicazione (Decrescente)
        if (dateB !== dateA) return dateB - dateA;
        
        // Criterio 2: Confidence (Decrescente)
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;

        // Criterio 3: ID (Decrescente)
        return b.id - a.id;
    });

    const ora = new Date().getTime();
    const ventiquattroOre = 24 * 60 * 60 * 1000;
    const setteGiorni = 7 * ventiquattroOre;

    // 3. FILTRAGGIO (Sfrutta l'array già ordinato)
    const breaking = insights.filter(i => 
        i.insight_type === 'ASSET' && 
        (ora - new Date(i.content_feed?.published_at).getTime()) <= ventiquattroOre
    );

    const weekly = insights.filter(i => {
        const diff = ora - new Date(i.content_feed?.published_at).getTime();
        return diff > ventiquattroOre && diff <= setteGiorni;
    });

    const macro = insights.filter(i => i.insight_type === 'MACRO_EVENT');

    // 4. RENDERING
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