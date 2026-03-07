/**
 * UI-UTILS.JS - Versione con Sentiment Indicators nella Card
 */

function buildCard(insight, index) {
    const card = document.createElement('article');
    card.className = 'insight-card';

    // Logica Multi-Gruppo
    const groupsString = (insight.all_groups || [insight.asset_group || '']).join(',');
    card.dataset.assetGroups = groupsString; 
    
    // Funzione interna per generare il micro-badge del sentiment
    const getMiniSentiment = (val, label) => {
        if (!val || val.toUpperCase() === 'UNKNOWN' || val.toUpperCase() === 'NEUTRAL') return '';
        
        const isBullish = val.toUpperCase() === 'BULLISH';
        const color = isBullish ? 'var(--bullish)' : 'var(--bearish)';
        const icon = isBullish ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <div title="${label}: ${val}" style="display: flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 800; color: ${color}; background: ${isBullish ? 'var(--bullish-bg)' : 'var(--bearish-bg)'}; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">
                <i class="fas ${icon}"></i> ${label[0]}
            </div>
        `;
    };

    const sentimentHTML = `
        <div style="display: flex; gap: 4px; margin-left: 8px;">
            ${getMiniSentiment(insight.sentiment_short, 'Short')}
            ${getMiniSentiment(insight.sentiment_medium, 'Medium')}
            ${getMiniSentiment(insight.sentiment_long, 'Long')}
        </div>
    `;

    const isMacro = insight.insight_type === 'MACRO_EVENT';
    const pubDate = insight.content_feed?.published_at 
        ? new Date(insight.content_feed.published_at).toLocaleDateString('it-IT', {day:'2-digit', month:'short'}) 
        : '';

    const tickerButtons = (insight.all_tickers || [insight.asset_ticker || 'MACRO'])
        .map(t => {
            const badgeClass = isMacro ? 'macro-badge' : 'ticker-badge';
            const url = isMacro ? '#' : `asset.html?ticker=${t}`;
            return `<a class="${badgeClass}" href="${url}">${t}</a>`;
        }).join('');

    card.innerHTML = `
        <div class="card-top" style="align-items: center; margin-bottom: 12px;">
            <div style="display: flex; flex-wrap: wrap; gap: 6px; flex: 1;">
                ${tickerButtons}
            </div>
            <div style="display: flex; align-items: center;">
                <span class="confidence-badge">★ ${insight.confidence || 0}</span>
                ${sentimentHTML}
            </div>
        </div>
        <h2 class="card-title">${insight.title}</h2>
        <div class="card-summary">${insight.summary || ''}</div>
        <div class="card-footer">
            <span class="card-source">${insight.content_feed?.sources?.name || 'PRAGMATIC'}</span>
            <span class="card-date">${pubDate}</span>
        </div>
    `;
    
    return card;
}