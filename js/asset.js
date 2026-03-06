// =============================================================================
// ASSET.JS — Logica pagina dettaglio asset (asset.html?ticker=EURUSD)
// =============================================================================

document.addEventListener('componentsReady', async () => {
  const ticker = new URLSearchParams(window.location.search).get('ticker');

  if (!ticker) {
    showGlobalError('Ticker non specificato nell\'URL.');
    return;
  }

  // Aggiorna il titolo della pagina
  document.title = `${ticker} — Market Intelligence`;

  await Promise.all([
    loadAssetInfo(ticker),
    loadAssetInsights(ticker),
  ]);
});

// ---- Carica dati asset da tabella assets ----
async function loadAssetInfo(ticker) {
  const { data, error } = await db
    .from('assets')
    .select('*')
    .eq('ticker', ticker)
    .single();

  if (error || !data) {
    document.getElementById('asset-hero').innerHTML = `
      <div class="state-msg">
        <h3>${ticker}</h3>
        <p>Dati asset non trovati nel database.</p>
      </div>`;
    return;
  }

  renderAssetHero(data);
}

// ---- Carica tutti gli insights per questo ticker ----
async function loadAssetInsights(ticker) {
  const grid = document.getElementById('asset-feed-grid');
  grid.innerHTML = `<div class="state-msg"><div class="spinner"></div><p>Caricamento…</p></div>`;

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
      )
    `)
    .eq('asset_ticker', ticker)
    .order('feed_id', { ascending: false })
    .limit(40);

  if (error) {
    grid.innerHTML = `<div class="state-msg"><h3>Errore</h3><p>${error.message}</p></div>`;
    return;
  }

  const insights = data || [];

  // Calcola sentiment aggregato e aggiorna i gauge
  renderSentimentGauges(insights);

  // Aggiorna contatore
  const countEl = document.getElementById('asset-count');
  if (countEl) countEl.textContent = `${insights.length} insight${insights.length !== 1 ? 's' : ''}`;

  // Render cards
  grid.innerHTML = '';

  if (insights.length === 0) {
    grid.innerHTML = `<div class="state-msg"><h3>Nessun insight</h3><p>Non ci sono ancora analisi per ${ticker}.</p></div>`;
    return;
  }

  insights.forEach((insight, i) => {
    const card = buildAssetCard(insight, i);
    grid.appendChild(card);
  });
}

// ---- Render hero dell'asset ----
function renderAssetHero(asset) {
  const hero = document.getElementById('asset-hero');

  hero.innerHTML = `
    <div class="asset-hero-left">
      <div class="asset-ticker-large">${asset.ticker}</div>
      <div class="asset-name-full">${asset.name_full || ''}</div>
      <span class="asset-group-badge">${asset.asset_group || 'Asset'}</span>
      <dl class="asset-meta">
        ${asset.currency_base    ? `<div class="meta-item"><dt>Base</dt><dd>${asset.currency_base}</dd></div>` : ''}
        ${asset.currency_profit  ? `<div class="meta-item"><dt>Profit</dt><dd>${asset.currency_profit}</dd></div>` : ''}
        ${asset.contract_size    ? `<div class="meta-item"><dt>Contratto</dt><dd>${asset.contract_size.toLocaleString('it-IT')}</dd></div>` : ''}
        ${asset.digits != null   ? `<div class="meta-item"><dt>Decimali</dt><dd>${asset.digits}</dd></div>` : ''}
      </dl>
    </div>
    <div class="asset-hero-right" id="gauges-container">
      <!-- Gauges iniettati dopo il caricamento degli insights -->
      <div class="gauge-block">
        <div class="gauge-label">Breve</div>
        <div class="gauge-ring" id="gauge-short"></div>
      </div>
      <div class="gauge-block">
        <div class="gauge-label">Medio</div>
        <div class="gauge-ring" id="gauge-medium"></div>
      </div>
      <div class="gauge-block">
        <div class="gauge-label">Lungo</div>
        <div class="gauge-ring" id="gauge-long"></div>
      </div>
    </div>
  `;
}

// ---- Calcola e renderizza i gauge SVG ----
function renderSentimentGauges(insights) {
  const periods = ['short', 'medium', 'long'];

  periods.forEach(p => {
    const el = document.getElementById(`gauge-${p}`);
    if (!el) return;

    // Conta occorrenze sentiment
    const counts = { BULLISH: 0, BEARISH: 0, NEUTRAL: 0, UNKNOWN: 0 };
    insights.forEach(i => {
      const s = i[`sentiment_${p}`] || 'UNKNOWN';
      counts[s] = (counts[s] || 0) + 1;
    });

    // Determina sentiment dominante
    const dominant = Object.entries(counts)
      .filter(([k]) => k !== 'UNKNOWN')
      .sort(([, a], [, b]) => b - a)[0];

    const sentClass = dominant ? dominant[0] : 'UNKNOWN';
    const total     = insights.length || 1;
    const ratio     = dominant ? dominant[1] / total : 0;

    // SVG ring
    const r   = 27;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - ratio);

    const label = sentClass === 'BULLISH' ? '▲' : sentClass === 'BEARISH' ? '▼' : '—';

    el.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle class="gauge-ring-track" cx="32" cy="32" r="${r}"/>
        <circle class="gauge-ring-fill ${sentClass}" cx="32" cy="32" r="${r}"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${offset}"/>
      </svg>
      <div class="gauge-value ${sentClass}">${label}<br>${Math.round(ratio * 100)}%</div>
    `;
  });
}

// ---- Card per la pagina asset (versione estesa) ----
function buildAssetCard(insight, index) {
  const card = document.createElement('article');
  card.className = 'insight-card';
  card.style.animationDelay = `${Math.min(index * 40, 400)}ms`;

  const feed   = insight.content_feed;
  const source = feed?.sources;
  const pubDate = feed?.published_at ? formatDate(feed.published_at) : '';
  const conf    = insight.confidence ? `★ ${insight.confidence}/10` : '';

  const isMacro = insight.insight_type === 'MACRO_EVENT';
  const typeBadge = isMacro
    ? `<span class="macro-badge">Macro Event</span>`
    : `<span class="macro-badge" style="background:var(--bg-subtle);color:var(--text-secondary);">Asset</span>`;

  const pillsHTML = buildSentimentPills(insight);

  // Link alla fonte originale
  const sourceLink = feed?.url
    ? `<a href="${feed.url}" target="_blank" rel="noopener" class="card-source" style="color:var(--accent);">
         ↗ Fonte originale
       </a>`
    : '';

  card.innerHTML = `
    <div class="card-top">
      ${typeBadge}
      ${conf ? `<span class="confidence-badge">${conf}</span>` : ''}
    </div>
    <h2 class="card-title">${insight.title || 'Senza titolo'}</h2>
    <p class="card-summary" style="-webkit-line-clamp: 5;">${insight.summary || ''}</p>
    <div class="sentiment-row">${pillsHTML}</div>
    <div class="card-footer">
      <span class="card-source">
        ${source ? `<span class="source-platform">${source.platform || 'WEB'}</span> ${source.name || ''}` : ''}
      </span>
      ${sourceLink}
      <span class="card-date">${pubDate}</span>
    </div>
  `;

  return card;
}

// ---- Helpers condivisi ----
function buildSentimentPills(insight) {
  const periods = [
    { key: 'sentiment_short',  label: 'Breve' },
    { key: 'sentiment_medium', label: 'Medio' },
    { key: 'sentiment_long',   label: 'Lungo' },
  ];
  return periods
    .filter(p => insight[p.key] && insight[p.key] !== 'UNKNOWN')
    .map(p => {
      const val  = insight[p.key];
      const icon = val === 'BULLISH' ? '▲' : val === 'BEARISH' ? '▼' : '—';
      return `<span class="sentiment-pill ${val}">${icon} ${val} <span class="sentiment-label">${p.label}</span></span>`;
    })
    .join('');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showGlobalError(msg) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
      <div style="text-align:center;">
        <h2 style="margin-bottom:8px;">Errore</h2>
        <p style="color:#888;">${msg}</p>
        <a href="index.html" style="color:#e8521a;margin-top:16px;display:inline-block;">← Torna al Feed</a>
      </div>
    </div>`;
}