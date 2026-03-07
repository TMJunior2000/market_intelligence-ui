/**
 * UI-UTILS.JS - Funzioni condivise per l'interfaccia utente
 */

function buildCard(insight, index) {
    const card = document.createElement('article');
    card.className = 'insight-card';

    // Logica Multi-Gruppo per i filtri della Navbar
    const groupsString = (insight.all_groups || [insight.asset_group || '']).join(',');
    card.dataset.assetGroups = groupsString; 
    
    card.dataset.confidence = insight.confidence || 0;
    card.dataset.insightType = insight.insight_type;

    // Animazione a cascata
    card.style.animationDelay = `${Math.min(index * 30, 300)}ms`;

    const isMacro = insight.insight_type === 'MACRO_EVENT';
    const pubDate = insight.content_feed?.published_at 
        ? new Date(insight.content_feed.published_at).toLocaleDateString('it-IT', {day:'2-digit', month:'short'}) 
        : '';

    // Genera i badge per tutti i ticker coinvolti
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