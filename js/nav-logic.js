/**
 * NAV-LOGIC.JS - Gestisce Ricerca Asset e UI della Navbar
 */
document.addEventListener('componentsReady', () => {
  initAssetSearch();
  initNavFilters();
});

function initAssetSearch() {
  const input = document.getElementById('asset-search');
  const suggestions = document.getElementById('search-suggestions');
  if (!input || !suggestions) return;

  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim().toUpperCase();

    if (query.length < 2) {
      suggestions.classList.add('hidden');
      return;
    }

    debounceTimer = setTimeout(async () => {
      // Query a Supabase sulla tabella 'assets'
      const { data, error } = await db
        .from('assets')
        .select('ticker, name_full, asset_group')
        .ilike('ticker', `%${query}%`)
        .limit(5);

      if (data && data.length > 0) {
        renderSuggestions(data, suggestions);
      } else {
        suggestions.classList.add('hidden');
      }
    }, 200); // 200ms di debounce per non sovraccaricare il DB
  });

  // Chiude i suggerimenti se clicchi fuori
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add('hidden');
    }
  });
}

function renderSuggestions(assets, container) {
  container.innerHTML = assets.map(a => `
    <div class="suggestion-item p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 flex justify-between items-center" 
         onclick="window.location.href='asset.html?ticker=${a.ticker}'">
      <div>
        <span class="font-bold text-black">${a.ticker}</span>
        <span class="text-[10px] text-gray-400 ml-2 uppercase">${a.name_full || ''}</span>
      </div>
      <span class="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold">${a.asset_group || 'ASSET'}</span>
    </div>
  `).join('');
  container.classList.remove('hidden');
}

function initNavFilters() {
  // Gestisce i filtri rapidi presenti nella navbar
  const navFilters = document.querySelectorAll('.navbar-filters .filter-btn');
  
  navFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      navFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Comunica a feed.js il cambio filtro tramite evento o chiamata diretta
      const filterValue = btn.getAttribute('data-filter');
      if (window.updateFeedFilter) window.updateFeedFilter('insightType', filterValue.toUpperCase());
    });
  });
}