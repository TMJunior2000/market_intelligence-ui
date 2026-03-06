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
        .select(`*, content_feed(*, sources(*))`)
        .order('id', { ascending: false })
        .limit(100);

    if (error) {
        console.error("FEED: Errore nel recupero dati:", error.message);
        return;
    }

    const insights = data || [];
    
    // Calcolo soglie temporali in millisecondi (indipendente dal fuso locale)
    const oraLocale = new Date();
    const oraUTC = oraLocale.getTime() + (oraLocale.getTimezoneOffset() * 60000);
    
    const ventiquattroOreMs = 24 * 60 * 60 * 1000;
    const setteGiorniMs = 7 * ventiquattroOreMs;

    // 1. Filtro Breaking News: Solo ASSET delle ultime 24h
    const breakingData = insights.filter(i => {
        if (i.insight_type !== 'ASSET' || !i.content_feed?.published_at) return false;
        const pubDate = new Date(i.content_feed.published_at).getTime(); // Date parse ISO come UTC
        return (oraLocale.getTime() - pubDate) <= ventiquattroOreMs;
    });

    // 2. Filtro Weekly Digest: ASSET e MACRO ultimi 7 giorni (escluse ultime 24h)
    const weeklyData = insights.filter(i => {
        if (!i.content_feed?.published_at) return false;
        const pubDate = new Date(i.content_feed.published_at).getTime();
        const diff = oraLocale.getTime() - pubDate;
        return diff > ventiquattroOreMs && diff <= setteGiorniMs;
    });

    // 3. Filtro Macro Outlook: Solo MACRO_EVENT (Banche Centrali)
    const macroData = insights.filter(i => i.insight_type === 'MACRO_EVENT');

    // Rendering nelle griglie
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

function buildCard(insight, index) {
    const card = document.createElement('article');
    card.className = 'insight-card';
    card.style.animationDelay = `${Math.min(index * 30, 300)}ms`;

    const ticker = insight.asset_ticker || 'MACRO';
    const isMacro = insight.insight_type === 'MACRO_EVENT';
    
    // Formattazione data leggibile localmente
    const pubDate = insight.content_feed?.published_at 
        ? new Date(insight.content_feed.published_at).toLocaleDateString('it-IT', {day:'2-digit', month:'short'}) 
        : '';

    card.innerHTML = `
        <div class="card-top">
            <a class="${isMacro ? 'macro-badge' : 'ticker-badge'}" 
               href="${isMacro ? '#' : `asset.html?ticker=${ticker}`}">
                ${ticker}
            </a>
            <span class="confidence-badge">★ ${insight.confidence || 0}/10</span>
        </div>
        <h2 class="card-title">${insight.title}</h2>
        <p class="card-summary">${insight.summary || ''}</p>
        <div class="card-footer">
            <span class="card-source">${insight.content_feed?.sources?.name || 'PRAGMATIC'}</span>
            <span class="card-date">${pubDate}</span>
        </div>
    `;
    return card;
}