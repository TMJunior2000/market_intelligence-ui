/**
 * FEED.JS — Orchestratore con gestione temporale UTC
 */

document.addEventListener('componentsReady', async () => {
    console.log("FEED: Inizializzo il caricamento multi-sezione (UTC sync)...");
    await loadAllFeeds();
});

async function loadAllFeeds() {
    const { data, error } = await db
        .from('market_insights')
        .select(`*, content_feed(*, sources(*)), assets(asset_group)`)
        .order('id', { ascending: false })
        .limit(100);

    if (error) return console.error(error);

    // --- NUOVA LOGICA: RAGGRUPPAMENTO PER NOTIZIA ---
    const aggregatedMap = new Map();

    data.forEach(item => {
        // Usiamo il titolo della notizia come chiave univoca (o item.content_feed.id se preferisci)
        const key = item.title; 
        
        if (!aggregatedMap.has(key)) {
            // Se è la prima volta che vediamo questa notizia, creiamo l'oggetto base
            aggregatedMap.set(key, {
                ...item,
                all_groups: [item.assets?.asset_group || ''],
                all_tickers: [item.asset_ticker] // Iniziamo la lista dei ticker
            });
        } else {
            // Se la notizia esiste già, aggiungiamo solo il nuovo ticker alla lista
            const existing = aggregatedMap.get(key);
            const newGroup  = item.assets?.asset_group || '';

            if (!existing.all_groups.includes(newGroup)) {
                existing.all_groups.push(newGroup);
            }

            if (!existing.all_tickers.includes(item.asset_ticker)) {
                existing.all_tickers.push(item.asset_ticker);
            }
        }
    });

    // Trasformiamo la mappa di nuovo in un array per i filtri
    const insights = Array.from(aggregatedMap.values());

    const ora = new Date();
    const ventiquattroOreMs = 24 * 60 * 60 * 1000;
    const setteGiorniMs = 7 * ventiquattroOreMs;

    // 1. Breaking: Se almeno un ticker è ASSET e < 24h
    const breakingData = insights.filter(i => {
        const diff = ora.getTime() - new Date(i.content_feed?.published_at).getTime();
        return i.insight_type === 'ASSET' && diff <= ventiquattroOreMs;
    });

    // 2. Weekly: Tra 24h e 7 giorni
    const weeklyData = insights.filter(i => {
        const diff = ora.getTime() - new Date(i.content_feed?.published_at).getTime();
        return diff > ventiquattroOreMs && diff <= setteGiorniMs;
    });

    // 3. Macro: Tutto ciò che è MACRO_EVENT
    const macroData = insights.filter(i => i.insight_type === 'MACRO_EVENT');

    renderSection('grid-breaking', 'count-breaking', breakingData);
    renderSection('grid-weekly', 'count-weekly', weeklyData);
    renderSection('grid-macro', 'count-macro', macroData);
}

function renderSection(gridId, countId, insights) {
    const grid = document.getElementById(gridId);
    const countEl = document.getElementById(countId);
    
    if (!grid) return;

    if (countEl) countEl.textContent = `${insights.length} insight${insights.length !== 1 ? 's' : ''}`;

    if (insights.length === 0) {
        grid.innerHTML = `<div class="state-msg"><p>Nessun dato recente trovato.</p></div>`;
        return;
    }

    grid.innerHTML = '';
    insights.forEach((insight, i) => {
        const card = buildCard(insight, i);
        grid.appendChild(card);
    });
}