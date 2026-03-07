/**
 * UI-UTILS.JS - Versione SPA ottimizzata per filtri
 */

function buildCard(insight, index) {
    const card = document.createElement('article');
    card.className = 'insight-card';

    // --- AGGIUNTA METADATI PER FILTRI SPA ---
    const groupsString = (insight.all_groups || [insight.asset_group || '']).join(',');
    card.dataset.assetGroups = groupsString; 
    card.dataset.confidence = insight.confidence || 0; 
    card.dataset.insightType = insight.insight_type || 'ASSET';
    
    // Funzione interna per i badge sentiment
    const getMiniSentiment = (val, label) => {
        if (!val || val.toUpperCase() === 'UNKNOWN') return '';
        
        const s = val.toUpperCase();
        let color = 'var(--text-muted)';
        let bg = 'var(--bg-subtle)';
        let icon = 'fa-minus'; 

        if (s === 'BULLISH') { 
            color = 'var(--bullish)'; 
            bg = 'var(--bullish-bg)'; 
            icon = 'fa-arrow-up';
        } else if (s === 'BEARISH') { 
            color = 'var(--bearish)'; 
            bg = 'var(--bearish-bg)'; 
            icon = 'fa-arrow-down';
        }

        return `
            <div title="${label}: ${s}" style="display: flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 800; color: ${color}; background: ${bg}; padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">
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
            const url = isMacro ? '#' : `javascript:router.navigateToAsset('${t}')`;
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