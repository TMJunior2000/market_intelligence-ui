/**
 * NAV-LOGIC.JS - Gestisce Ricerca, Dropdown e Navigazione tra Sezioni/Filtri
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
                .limit(8);

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

        // Caso 1: Click su Macro Gruppo (Borsa, Forex, etc.)
        if (target.classList.contains('filter-btn')) {
            const group = target.dataset.group;
            if (!group) return;
            updateActiveUI(target);
            handleLayoutTransition(group);
            applyFilter('main', group);
        }

        // Caso 2: Click su Sottogruppo nel Dropdown
        if (target.classList.contains('sub-filter-btn')) {
            const subValue = target.dataset.subgroup;

            // --- LOGICA ESCLUSIVA SEZIONI TEMPORALI ---
            const temporalSections = ['breaking-news', 'weekly-digest', 'macro-outlook'];
            
            if (temporalSections.includes(subValue)) {
                // Mostra la dashboard, nasconde la vista filtrata
                document.getElementById('dashboard-view').style.display = 'block';
                document.getElementById('filtered-view').style.display = 'none';

                // CICLO ESCLUSIVO: Mostra solo quella scelta
                temporalSections.forEach(sectionId => {
                    const sectionEl = document.querySelector(`[data-component="${sectionId}"]`);
                    if (sectionEl) {
                        sectionEl.style.display = (sectionId === subValue) ? 'block' : 'none';
                    }
                });

                updateActiveUI(document.querySelector('[data-group="all"]'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return; 
            }

            // --- FILTRO ASSET STANDARD ---
            const dropdown = target.closest('.dropdown');
            if (dropdown) updateActiveUI(dropdown.querySelector('.filter-btn'));
            handleLayoutTransition('sub');
            applyFilter('sub', subValue);
        }
    });
}

/**
 * Gestione Layout: Passaggio tra Dashboard e Vista Risultati
 */
function handleLayoutTransition(mode) {
    const dashboard = document.getElementById('dashboard-view');
    const filteredView = document.getElementById('filtered-view');
    const temporalSections = ['breaking-news', 'weekly-digest', 'macro-outlook'];

    if (mode === 'all') {
        dashboard.style.display = 'block';
        filteredView.style.display = 'none';
        // Ripristina tutte le sezioni
        temporalSections.forEach(id => {
            const el = document.querySelector(`[data-component="${id}"]`);
            if (el) el.style.display = 'block';
        });
    } else {
        dashboard.style.display = 'none';
        filteredView.style.display = 'block';
        document.getElementById('active-filter-title').textContent = mode.toUpperCase();
    }
}

/**
 * Logica di Filtraggio Card (Client-side)
 */
function applyFilter(type, value) {
    const allCards = document.querySelectorAll('#dashboard-view .insight-card'); // Prende solo le card originali
    const filteredGrid = document.getElementById('filtered-grid');
    const isMainView = (value === 'all');
    
    // 1. Pulisce sempre la griglia dei risultati prima di iniziare
    filteredGrid.innerHTML = '';
    let count = 0;

    // Usiamo un Set per evitare di aggiungere la stessa card fisica più volte
    const addedTitles = new Set();

    allCards.forEach(card => {
        const cardGroup = card.dataset.assetGroup;
        const insightType = card.dataset.insightType;
        const cardTitle = card.querySelector('.card-title')?.textContent;

        let isMatch = false;
        
        if (type === 'main') {
            if (value === 'all') {
                isMatch = true;
            } else if (value === 'macro') {
                isMatch = (insightType === 'MACRO_EVENT');
            } else {
                const allowed = groupMapping[value] || [];
                isMatch = allowed.includes(cardGroup);
            }
        } else if (type === 'sub') {
            // Filtro per sottogruppo (es. 'Equity CFD US')
            isMatch = cardGroup.includes(value);
        }

        // 2. Se c'è un match e non abbiamo già aggiunto questa notizia
        if (isMatch && !addedTitles.has(cardTitle)) {
            if (!isMainView) {
                const cardClone = card.cloneNode(true);
                cardClone.style.display = 'flex';
                filteredGrid.appendChild(cardClone);
                addedTitles.add(cardTitle); // Segna il titolo come "già inserito"
                count++;
            } else {
                card.style.display = 'flex'; 
            }
        }
    });

    if (!isMainView) {
        const countEl = document.getElementById('active-filter-count');
        if (countEl) countEl.textContent = `${count} insight${count !== 1 ? 's' : ''} trovati`;
    }
}

function updateActiveUI(element) {
    if (!element) return;
    document.querySelectorAll('.filter-btn, .sub-filter-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
}