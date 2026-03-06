// =============================================================================
// FEED.JS — Logica Dashboard principale (index.html)
// =============================================================================

// ---- Stato globale ----
let activeFilters = {
  assetGroup: 'ALL',   // 'ALL', 'Forex', 'Crypto', 'Indices', ...
  insightType: 'ALL',  // 'ALL', 'ASSET', 'MACRO_EVENT'
  sentiment: 'ALL',    // 'ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'
  search: '',
};

let allInsights = [];

// ---- Init ----
document.addEventListener('componentsReady', async () => {
  await loadFeed();
  bindFilters();
  bindSearch();
});

// ---- Carica dati da Supabase ----
async function loadFeed() {
  const grid = document.getElementById('feed-grid');
  showLoading(grid);

  const { data, error } = await db
    .from('market_insights')
    .select(`
      id,
      insight_type,
      title,
      summary,
      sentiment_short,
      sentiment_medium,
      sentiment_long,
      confidence,
      asset_ticker,
      feed_id,
      content_feed (
        id,
        published_at,
        url,
        title,
        sources (
          name,
          platform
        )
      ),
      assets (
        ticker,
        name_full,
        asset_group
      )
    `)
    .order('feed_id', { ascending: false })
    .limit(60);

  if (error) {
    showError(grid, error.message);
    return;
  }

  allInsights = data || [];
  updateCount(allInsights.length);
  renderFeed(allInsights);
}

// ---- Render ----
function renderFeed(insights) {
  const grid = document.getElementById('feed-grid');
  grid.innerHTML = '';

  const filtered = applyFilters(insights);
  updateCount(filtered.length);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="state-msg">
        <h3>Nessun risultato</h3>
        <p>Prova a cambiare i filtri o il termine di ricerca.</p>
      </div>`;
    return;
  }

  filtered.forEach((insight, i) => {
    const card = buildCard(insight, i);
    grid.appendChild(card);
  });
}

// ---- Costruisce la card ----
function buildCard(insight, index) {
  const card = document.createElement('article');
  card.className = 'insight-card';
  card.style.animationDelay = `${Math.min(index * 40, 400)}ms`;

  const isMacro   = insight.insight_type === 'MACRO_EVENT';
  const ticker    = insight.asset_ticker;
  const asset     = insight.assets;
  const feed      = insight.content_feed;
  const source    = feed?.sources;
  const pubDate   = feed?.published_at ? formatDate(feed.published_at) : '';
  const conf      = insight.confidence ? `${insight.confidence}/10` : '';

  // Badge ticker o macro
  const badgeHTML = isMacro
    ? `<span class="macro-badge">
         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
         Macro Event
       </span>`
    : ticker
      ? `<a class="ticker-badge" href="asset.html?ticker=${ticker}" title="Vai alla pagina ${ticker}">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
           ${ticker}
         </a>`
      : '';

  // Sentiment pills
  const pillsHTML = buildSentimentPills(insight);

  // Fonte
  const sourceHTML = source
    ? `<span class="card-source">
         <span class="source-platform">${source.platform || 'WEB'}</span>
         ${source.name || ''}
       </span>`
    : '';

  card.innerHTML = `
    <div class="card-top">
      ${badgeHTML}
      ${conf ? `<span class="confidence-badge">★ ${conf}</span>` : ''}
    </div>
    <h2 class="card-title">${insight.title || 'Senza titolo'}</h2>
    <p class="card-summary">${insight.summary || ''}</p>
    <div class="sentiment-row">${pillsHTML}</div>
    <div class="card-footer">
      ${sourceHTML}
      <span class="card-date">${pubDate}</span>
    </div>
  `;

  return card;
}

// ---- Sentiment pills ----
function buildSentimentPills(insight) {
  const periods = [
    { key: 'sentiment_short',  label: 'Breve' },
    { key: 'sentiment_medium', label: 'Medio' },
    { key: 'sentiment_long',   label: 'Lungo' },
  ];

  return periods
    .filter(p => insight[p.key] && insight[p.key] !== 'UNKNOWN')
    .map(p => {
      const val = insight[p.key];
      const icon = val === 'BULLISH' ? '▲' : val === 'BEARISH' ? '▼' : '—';
      return `<span class="sentiment-pill ${val}">
        ${icon} ${val} <span class="sentiment-label">${p.label}</span>
      </span>`;
    })
    .join('');
}

// ---- Filtri ----
function applyFilters(insights) {
  return insights.filter(i => {
    // Ricerca
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const inTicker  = i.asset_ticker?.toLowerCase().includes(q);
      const inTitle   = i.title?.toLowerCase().includes(q);
      const inSummary = i.summary?.toLowerCase().includes(q);
      if (!inTicker && !inTitle && !inSummary) return false;
    }

    // Tipo insight
    if (activeFilters.insightType !== 'ALL' && i.insight_type !== activeFilters.insightType) return false;

    // Asset group
    if (activeFilters.assetGroup !== 'ALL' && i.assets?.asset_group !== activeFilters.assetGroup) return false;

    // Sentiment (short)
    if (activeFilters.sentiment !== 'ALL' && i.sentiment_short !== activeFilters.sentiment) return false;

    return true;
  });
}

function bindFilters() {
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type  = btn.dataset.filter;
      const value = btn.dataset.value;

      // Aggiorna stato
      activeFilters[type] = value;

      // Aggiorna UI pulsanti dello stesso gruppo
      document.querySelectorAll(`[data-filter="${type}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderFeed(allInsights);
    });
  });
}

function bindSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      activeFilters.search = input.value.trim();
      renderFeed(allInsights);
    }, 250);
  });
}

// ---- Helpers ----
function showLoading(container) {
  container.innerHTML = `
    <div class="state-msg">
      <div class="spinner"></div>
      <p>Caricamento insights…</p>
    </div>`;
}

function showError(container, msg) {
  container.innerHTML = `
    <div class="state-msg">
      <h3>Errore di connessione</h3>
      <p>${msg}</p>
    </div>`;
}

function updateCount(n) {
  const el = document.getElementById('insights-count');
  if (el) el.textContent = `${n} insight${n !== 1 ? 's' : ''}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}