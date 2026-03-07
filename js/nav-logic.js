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

    // Gestione Input (Digitazione e Cancellazione)
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim().toUpperCase();

        // Se cancelli tutto o scendi sotto i 2 caratteri, nascondi subito
        if (query.length < 2) {
            suggestions.classList.add('hidden');
            suggestions.style.display = 'none'; // Forza la sparizione
            return;
        }

        // Debounce per non sovraccaricare il DB durante la cancellazione rapida
        debounceTimer = setTimeout(async () => {
            const { data, error } = await db
                .from('assets')
                .select('ticker, name_full, asset_group')
                .ilike('ticker', `%${query}%`)
                .limit(8);

            if (data && data.length > 0) {
                renderSuggestions(data, suggestions);
                suggestions.style.display = 'block'; // Assicura visibilità
            } else {
                suggestions.classList.add('hidden');
                suggestions.style.display = 'none';
            }
        }, 200);
    });

    // CHIUSURA CLICCANDO FUORI
    document.addEventListener('click', (e) => {
        // Se il clic NON è sull'input e NON è dentro il menu suggerimenti
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.add('hidden');
            suggestions.style.display = 'none';
        }
    });

    // Riapri i suggerimenti se clicchi sull'input (se c'è già testo)
    input.addEventListener('focus', () => {
        if (input.value.trim().length >= 2 && suggestions.innerHTML !== '') {
            suggestions.classList.remove('hidden');
            suggestions.style.display = 'block';
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
    container.style.display = 'block';
}

function initNavFilters() {
    document.addEventListener('click', (e) => {
        // Usa closest per catturare il click anche se avviene sugli elementi interni (span, i, badge)
        const target = e.target.closest('.filter-btn, .sub-filter-btn');
        if (!target) return;

        // --- CASO 1: CLICK SU MACRO GRUPPO (TUTTO/LOGO, BORSA, FOREX, HIGH CONVICTION) ---
        if (target.classList.contains('filter-btn')) {
            const group = target.dataset.group;
            if (!group) return;

            // Se clicchiamo su "TUTTO" o sul LOGO (data-group="all")
            if (group === 'all') {
                // 1. Svuota la barra di ricerca e nascondi i suggerimenti
                const searchInput = document.getElementById('asset-search');
                const suggestions = document.getElementById('search-suggestions');
                if (searchInput) searchInput.value = '';
                if (suggestions) {
                    suggestions.classList.add('hidden');
                    suggestions.style.display = 'none';
                }
            }

            // Recuperiamo il nome da mostrare nel titolo (es: "BORSA")
            const displayName = target.textContent.trim();
            
            updateActiveUI(target);
            handleLayoutTransition(group, displayName);
            applyFilter('main', group);
        }

        // --- CASO 2: CLICK SU SOTTOGRUPPO NEL DROPDOWN ---
        if (target.classList.contains('sub-filter-btn')) {
            const subValue = target.dataset.subgroup;
            const subDisplayName = target.textContent.trim();

            const temporalSections = ['breaking-news', 'weekly-digest', 'macro-outlook'];
            
            if (temporalSections.includes(subValue)) {
                document.getElementById('dashboard-view').style.display = 'block';
                document.getElementById('filtered-view').style.display = 'none';

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

            const dropdown = target.closest('.dropdown');
            if (dropdown) {
                const parentBtn = dropdown.querySelector('.filter-btn');
                updateActiveUI(parentBtn);
            }
            
            handleLayoutTransition('sub', subDisplayName);
            applyFilter('sub', subValue);
        }
    });
}

/**
 * Gestione Layout: Passaggio tra Dashboard e Vista Risultati
 */
function handleLayoutTransition(mode, displayName) {
    const dashboard = document.getElementById('dashboard-view');
    const filteredView = document.getElementById('filtered-view');
    const filteredGrid = document.getElementById('filtered-grid');
    const temporalSections = ['breaking-news', 'weekly-digest', 'macro-outlook'];

    if (mode === 'all') {
        dashboard.style.display = 'block';
        filteredView.style.display = 'none';
        filteredGrid.innerHTML = ''; 

        temporalSections.forEach(id => {
            const el = document.querySelector(`[data-component="${id}"]`);
            if (el) el.style.display = 'block';
        });
    } else {
        dashboard.style.display = 'none';
        filteredView.style.display = 'block';
        
        // Se displayName è presente usa quello, altrimenti usa mode in maiuscolo
        document.getElementById('active-filter-title').textContent = displayName || mode.toUpperCase();
        filteredGrid.innerHTML = ''; 
    }
}

/**
 * Logica di Filtraggio Card (Client-side)
 */
function applyFilter(type, value) {
    const allCards = document.querySelectorAll('#dashboard-view .insight-card');
    const filteredGrid = document.getElementById('filtered-grid');
    const isMainView = (value === 'all');
    
    filteredGrid.innerHTML = '';
    let count = 0;
    const addedTitles = new Set();

    allCards.forEach(card => {
        // Recuperiamo la stringa dei gruppi e trasformiamola in array
        const cardGroups = (card.dataset.assetGroups || '').split(',');
        const insightType = card.dataset.insightType;
        const cardTitle = card.querySelector('.card-title')?.textContent;

        let isMatch = false;
        
        if (type === 'main') {
            if (value === 'all') {
                isMatch = true;
            } else if (value === 'high-conviction') {
                const confidence = parseInt(card.dataset.confidence) || '0';
                isMatch = confidence >= 9;
            } else if (value === 'macro') {
                isMatch = (insightType === 'MACRO_EVENT');
            } else {
                const allowed = groupMapping[value] || [];
                // LOGICA MULTI-GRUPPO: Verifica se almeno un gruppo della card è tra quelli permessi
                isMatch = cardGroups.some(group => allowed.includes(group));
            }
        } else if (type === 'sub') {
            // Per i sottogruppi (es. solo 'Equity CFD US')
            isMatch = cardGroups.includes(value);
        }

        if (isMatch && !addedTitles.has(cardTitle)) {
            if (!isMainView) {
                const cardClone = card.cloneNode(true);
                cardClone.style.display = 'flex';
                filteredGrid.appendChild(cardClone);
                addedTitles.add(cardTitle);
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