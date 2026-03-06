document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. UI INTERACTIVE ---
    const btnFilters = document.getElementById('btn-toggle-filters');
    const btnCloseFilters = document.getElementById('btn-close-filters');
    const sidebar = document.getElementById('sidebar-filters');
    const btnClosePanel = document.getElementById('btn-close-panel');
    const assetPanel = document.getElementById('asset-control-panel');
    const overlay = document.getElementById('overlay');

    const closeAll = () => {
        sidebar.classList.remove('open');
        assetPanel.classList.remove('open');
        overlay.classList.add('hidden');
    };

    btnFilters?.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
    });

    btnCloseFilters?.addEventListener('click', closeAll);
    btnClosePanel?.addEventListener('click', closeAll);
    overlay?.addEventListener('click', closeAll);

    // --- 2. SUPABASE REAL-TIME ---
    const initRealtime = () => {
        // Usiamo sbClient invece di supabase
        const channel = sbClient
            .channel('market-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'market_insights' },
                (payload) => {
                    console.log('Nuovo segnale ricevuto:', payload.new);
                    // Ricarichiamo il feed per applicare il clustering correttamente
                    loadInitialData();
                }
            )
            .subscribe();
    };

    // --- 3. DATA LOADING ---
    const loadInitialData = async () => {
        const statusIndicator = document.getElementById('status-indicator');
        const data = await fetchLatestInsights();
        
        if (data) {
            UI.renderFeed(data);
            statusIndicator.classList.replace('bg-red-500', 'bg-emerald-500');
            statusIndicator.title = "Connesso";
        }
    };

    loadInitialData();
    initRealtime();
});