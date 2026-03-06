/**
 * FEED.JS - Gestisce il flusso centrale delle notizie
 */
let activeFilters = { insightType: 'ALL', search: '' };
let allInsights = [];

document.addEventListener('componentsReady', async () => {
  await loadFeed();
});

async function loadFeed() {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;

  grid.innerHTML = `<div class="state-msg"><div class="spinner"></div><p>Sincronizzazione Terminale...</p></div>`;

  const { data, error } = await db
    .from('market_insights')
    .select(`*, content_feed(*, sources(*)), assets(*)`)
    .order('id', { ascending: false })
    .limit(50);

  if (error) {
    grid.innerHTML = `<div class="state-msg"><h3>Errore di connessione</h3><p>${error.message}</p></div>`;
    return;
  }

  allInsights = data || [];
  renderFeed(allInsights);
}

function renderFeed(insights) {
  const grid = document.getElementById('feed-grid');
  grid.innerHTML = '';

  const filtered = insights.filter(i => {
    const matchType = activeFilters.insightType === 'ALL' || i.insight_type === activeFilters.insightType;
    return matchType;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="state-msg"><h3>Nessun Insight</h3><p>Nessun dato corrispondente ai filtri attuali.</p></div>`;
    return;
  }

  filtered.forEach((insight, i) => {
    const card = buildCard(insight, i);
    grid.appendChild(card);
  });
}

// Funzione globale chiamata da nav-logic.js
window.updateFeedFilter = (key, value) => {
  activeFilters[key] = value;
  renderFeed(allInsights);
};

function buildCard(insight, index) {
  const card = document.createElement('article');
  card.className = 'insight-card';
  card.style.animationDelay = `${Math.min(index * 30, 300)}ms`;

  const ticker = insight.asset_ticker;
  const pubDate = insight.content_feed?.published_at 
    ? new Date(insight.content_feed.published_at).toLocaleDateString('it-IT', {day:'2-digit', month:'short'}) 
    : '';

  card.innerHTML = `
    <div class="card-top">
      <a class="ticker-badge" href="asset.html?ticker=${ticker}">${ticker}</a>
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