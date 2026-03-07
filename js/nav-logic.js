/**
 * NAV-LOGIC.JS - Gestisce Ricerca Asset e UI della Navbar con Dropdown e Filtri
 */

// Mappatura dei Macro Gruppi basata sul tuo DB
const groupMapping = {
    'borsa': ['Equity CFD US', 'Equity CFD EU', 'Equity CFD HK', 'Equity CFD UK'],
    'forex': ['Forex Majors Raw', 'Forex Minors Raw', 'Forex Exotics Raw'],
    'commodities': ['Commodities', 'Metals Raw', 'Metals Gold Raw', 'Metals Silver Raw', 'Soft Commodities', 'Palladium', 'Platinum'],
    'indices-bonds': ['Indices', 'Bonds'],
    'crypto': ['Crypto Currency']
};

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
      const { data, error } = await db
        .from('assets')
        .select('ticker, name_full, asset_group')
        .ilike('ticker', `%${query}%`)
        .limit(8); // Aumentato a 8 visto che il menu ora è più largo

      if (data && data.length > 0) {
        renderSuggestions(data, suggestions);
      } else {
        suggestions.classList.add('hidden');
      }
    }, 200);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add('hidden');
    }
  });
}

/**
 * Rendering Ricerca: Allineato alla Griglia CSS (Ticker - Nome - Gruppo)
 */
function renderSuggestions(assets, container) {
    container.innerHTML = assets.map(a => `
        <div class="suggestion-item" onclick="window.location.href='asset.html?ticker=${a.ticker}'">
            <span class="suggestion-ticker">${a.ticker}</span>
            <span class="suggestion-name">${a.name_full || ''}</span>
            <span class="suggestion-group">${a.asset_group || 'ASSET'}</span>
        </div>
    `).join('');
    container.classList.remove('hidden');
}

function initNavFilters() {
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Caso 1: Click su Macro Gruppo (Tutto, Borsa, Forex, etc.)
        if (target.classList.contains('filter-btn')) {
            const group = target.dataset.group;
            if (!group) return;

            updateActiveUI(target);
            handleLayoutTransition(group);
            applyFilter('main', group);
        }

        // Caso 2: Click su Sottogruppo nel Dropdown (CFD US, Majors, etc.)
        if (target.classList.contains('sub-filter-btn')) {
            const subValue = target.dataset.subgroup;
            
            // Attiva il pulsante "padre" del dropdown per feedback visivo
            const parentBtn = target.closest('.dropdown').querySelector('.filter-btn');
            updateActiveUI(parentBtn);
            
            handleLayoutTransition('sub');
            applyFilter('sub', subValue);
        }
    });
}

/**
 * Gestione Layout: Nasconde Breaking e Macro se c'è un filtro attivo
 */
function handleLayoutTransition(mode) {
    const dashboard = document.getElementById('dashboard-view');
    const filteredView = document.getElementById('filtered-view');
    const filteredGrid = document.getElementById('filtered-grid');

    if (mode === 'all') {
        dashboard.style.display = 'block';
        filteredView.style.display = 'none';
        filteredGrid.innerHTML = ''; 
    } else {
        dashboard.style.display = 'none';
        filteredView.style.display = 'block';
        
        // Aggiorna titolo e resetta griglia per i nuovi risultati
        document.getElementById('active-filter-title').textContent = mode.toUpperCase();
        filteredGrid.innerHTML = ''; 
    }
}

/**
 * Logica di Filtraggio Card
 */
function applyFilter(type, value) {
    // 1. Allineamento ID con index.html
    const allCards = document.querySelectorAll('.insight-card');
    const filteredGrid = document.getElementById('filtered-grid');
    const isMainView = (value === 'all');
    
    // Puliamo la griglia dei filtri prima di ogni nuova ricerca
    filteredGrid.innerHTML = '';
    
    let count = 0;

    allCards.forEach(card => {
        const cardGroup = card.dataset.assetGroup;
        const confidence = parseInt(card.dataset.confidence);
        const insightType = card.dataset.insightType;

        let isMatch = false;
        
        if (type === 'main') {
            if (value === 'high-conviction') isMatch = confidence >= 8;
            else if (value === 'macro') isMatch = (insightType === 'MACRO_EVENT');
            else {
                const allowed = groupMapping[value] || [];
                isMatch = allowed.includes(cardGroup);
            }
        } else if (type === 'sub') {
            isMatch = cardGroup.includes(value);
        }

        if (!isMainView) {
            if (isMatch) {
                // Cloniamo la card per spostarla nella vista dedicata
                const cardClone = card.cloneNode(true);
                cardClone.style.display = 'flex';
                filteredGrid.appendChild(cardClone);
                count++;
            }
        } else {
            // Vista "Tutto": le card originali tornano visibili nei loro componenti
            card.style.display = 'flex'; 
        }
    });

    // 2. Aggiorna il contatore usando l'ID corretto dell'index.html
    if (!isMainView) {
        const countEl = document.getElementById('active-filter-count');
        if (countEl) countEl.textContent = `${count} insight${count !== 1 ? 's' : ''} trovati`;
    }
}

function updateActiveUI(element) {
    document.querySelectorAll('.filter-btn, .sub-filter-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
}