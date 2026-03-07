/**
 * NAV-LOGIC.JS - SPA Router & Navigazione
 */

const groupMapping = {
    'borsa': ['Equity CFD US', 'Equity CFD EU', 'Equity CFD HK', 'Equity CFD UK'],
    'forex': ['Forex Majors Raw', 'Forex Minors Raw', 'Forex Exotics Raw'],
    'commodities': ['Commodities', 'Metals Raw', 'Metals Gold Raw', 'Metals Silver Raw', 'Soft Commodities', 'Palladium', 'Platinum'],
    'indices-bonds': ['Indices', 'Bonds'],
    'crypto': ['Crypto Currency']
};

const router = {
    navigateToAsset: async (ticker) => {
        // 1. Switch Viste
        document.getElementById('dashboard-view').style.display = 'none';
        document.getElementById('filtered-view').style.display = 'none';
        document.getElementById('asset-view').style.display = 'block';

        // 2. UI Reset
        const suggestions = document.getElementById('search-suggestions');
        if (suggestions) suggestions.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 3. History Management
        const newUrl = `?ticker=${ticker}`;
        if (window.location.search !== newUrl) {
            history.pushState({ type: 'asset', ticker: ticker }, '', newUrl);
        }

        // 4. Data Load
        await loadAssetData(ticker);
    },

    backToHome: () => {
        document.getElementById('asset-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        history.pushState({ type: 'home' }, '', 'index.html');
        
        const allBtn = document.querySelector('[data-group="all"]');
        if (allBtn) allBtn.click();
    }
};

// Gestione tasto "Indietro" del browser
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.type === 'asset') router.navigateToAsset(e.state.ticker);
    else router.backToHome();
});

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
            suggestions.style.display = 'none';
            return;
        }
        debounceTimer = setTimeout(async () => {
            const { data } = await db.from('assets').select('ticker, name_full, asset_group').ilike('ticker', `%${query}%`).limit(8);
            if (data && data.length > 0) renderSuggestions(data, suggestions);
            else suggestions.style.display = 'none';
        }, 200);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) suggestions.style.display = 'none';
    });
}

function renderSuggestions(assets, container) {
    container.innerHTML = assets.map(a => `
        <div class="suggestion-item" onclick="router.navigateToAsset('${a.ticker}')">
            <span class="suggestion-ticker">${a.ticker}</span>
            <span class="suggestion-name">${a.name_full || ''}</span>
            <span class="suggestion-group">${a.asset_group || 'ASSET'}</span>
        </div>
    `).join('');
    container.style.display = 'block';
}

function initNavFilters() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-btn, .sub-filter-btn');
        if (!target) return;

        // Se clicchiamo un filtro, spegniamo la vista Asset
        document.getElementById('asset-view').style.display = 'none';

        if (target.classList.contains('filter-btn')) {
            const group = target.dataset.group;
            if (group === 'all') {
                const searchInput = document.getElementById('asset-search');
                if (searchInput) searchInput.value = '';
            }
            updateActiveUI(target);
            handleLayoutTransition(group, target.textContent.trim());
            applyFilter('main', group);
        }

        if (target.classList.contains('sub-filter-btn')) {
            const subValue = target.dataset.subgroup;
            const temporalSections = ['breaking-news', 'weekly-digest', 'macro-outlook'];
            
            if (temporalSections.includes(subValue)) {
                handleLayoutTransition('all', 'TUTTO');
                temporalSections.forEach(id => {
                    const el = document.querySelector(`[data-component="${id}"]`);
                    if (el) el.style.display = (id === subValue) ? 'block' : 'none';
                });
                updateActiveUI(document.querySelector('[data-group="all"]'));
            } else {
                const dropdown = target.closest('.dropdown');
                if (dropdown) updateActiveUI(dropdown.querySelector('.filter-btn'));
                handleLayoutTransition('sub', target.textContent.trim());
                applyFilter('sub', subValue);
            }
        }
    });
}

function handleLayoutTransition(mode, displayName) {
    const dashboard = document.getElementById('dashboard-view');
    const filteredView = document.getElementById('filtered-view');
    const filteredGrid = document.getElementById('filtered-grid');

    if (mode === 'all') {
        dashboard.style.display = 'block';
        filteredView.style.display = 'none';
        if (window.location.search.includes('ticker=')) history.pushState({ type: 'home' }, '', 'index.html');
    } else {
        dashboard.style.display = 'none';
        filteredView.style.display = 'block';
        document.getElementById('active-filter-title').textContent = displayName;
        filteredGrid.innerHTML = ''; 
    }
}

function applyFilter(type, value) {
    const allCards = document.querySelectorAll('#dashboard-view .insight-card');
    const filteredGrid = document.getElementById('filtered-grid');
    const isMainView = (value === 'all');
    
    filteredGrid.innerHTML = '';
    let count = 0;
    const addedTitles = new Set();

    allCards.forEach(card => {
        const cardGroups = (card.dataset.assetGroups || '').split(',');
        const insightType = card.dataset.insightType;
        const cardTitle = card.querySelector('.card-title')?.textContent;
        let isMatch = false;
        
        if (type === 'main') {
            if (value === 'all') isMatch = true;
            else if (value === 'high-conviction') isMatch = parseInt(card.dataset.confidence) >= 9;
            else if (value === 'macro') isMatch = (insightType === 'MACRO_EVENT');
            else {
                const allowed = groupMapping[value] || [];
                isMatch = cardGroups.some(g => allowed.includes(g));
            }
        } else if (type === 'sub') isMatch = cardGroups.includes(value);

        if (isMatch && !addedTitles.has(cardTitle)) {
            if (!isMainView) {
                const cardClone = card.cloneNode(true);
                cardClone.style.display = 'flex';
                filteredGrid.appendChild(cardClone);
                addedTitles.add(cardTitle);
                count++;
            } else card.style.display = 'flex';
        }
    });

    const countEl = document.getElementById('active-filter-count');
    if (countEl && !isMainView) countEl.textContent = `${count} insights trovati`;
}

function updateActiveUI(element) {
    document.querySelectorAll('.filter-btn, .sub-filter-btn').forEach(b => b.classList.remove('active'));
    if (element) element.classList.add('active');
}