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