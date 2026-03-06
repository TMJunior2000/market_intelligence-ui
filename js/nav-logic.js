/**
 * NAV-LOGIC.JS - Gestisce Ricerca Asset e UI della Navbar
 */
document.addEventListener('componentsReady', () => {
    console.log("NAV-LOGIC: Ricevuto evento componentsReady. Inizializzo...");
    initAssetSearch();
    initNavFilters();
});

function initAssetSearch() {
    const input = document.getElementById('asset-search');
    const suggestions = document.getElementById('search-suggestions');

    // DEBUG: Verifica se gli elementi esistono nel DOM dopo il caricamento
    if (!input) console.error("NAV-LOGIC: Errore! Elemento #asset-search non trovato nel DOM.");
    if (!suggestions) console.error("NAV-LOGIC: Errore! Elemento #search-suggestions non trovato nel DOM.");
    
    if (!input || !suggestions) return;

    console.log("NAV-LOGIC: Input di ricerca agganciato con successo.");

    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim().toUpperCase();
        console.log(`NAV-LOGIC: Typing... Query attuale: "${query}"`);

        if (query.length < 2) {
            console.log("NAV-LOGIC: Query troppo corta, nascondo suggerimenti.");
            suggestions.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            console.log(`NAV-LOGIC: Eseguo query Supabase per: ${query}`);
            
            // Verifica se il client DB esiste
            if (typeof db === 'undefined') {
                console.error("NAV-LOGIC: La variabile 'db' (Supabase) non è definita! Controlla l'ordine degli script.");
                return;
            }

            try {
                const { data, error } = await db
                    .from('assets')
                    .select('ticker, name_full, asset_group')
                    .ilike('ticker', `%${query}%`)
                    .limit(5);

                if (error) {
                    console.error("NAV-LOGIC: Errore nella query Supabase:", error.message);
                    return;
                }

                console.log(`NAV-LOGIC: Risultati trovati: ${data ? data.length : 0}`);

                if (data && data.length > 0) {
                    renderSuggestions(data, suggestions);
                } else {
                    console.log("NAV-LOGIC: Nessun asset trovato per questa query.");
                    suggestions.classList.add('hidden');
                }
            } catch (err) {
                console.error("NAV-LOGIC: Errore fatale durante la fetch:", err);
            }
        }, 200);
    });
}

function renderSuggestions(assets, container) {
    console.log("NAV-LOGIC: Renderizzo i suggerimenti nel box.");
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
    const navFilters = document.querySelectorAll('.navbar-filters .filter-btn');
    console.log(`NAV-LOGIC: Trovati ${navFilters.length} bottoni filtro nella navbar.`);
    
    navFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterValue = btn.getAttribute('data-filter');
            console.log(`NAV-LOGIC: Click filtro -> ${filterValue}`);
            
            navFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (window.updateFeedFilter) {
                window.updateFeedFilter('insightType', filterValue.toUpperCase());
            } else {
                console.warn("NAV-LOGIC: Funzione window.updateFeedFilter non trovata (feed.js caricato?)");
            }
        });
    });
}