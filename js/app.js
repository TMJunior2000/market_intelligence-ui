// js/app.js

// Aspettiamo che il documento sia pronto
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GESTIONE INTERFACCIA (MOVIMENTI) ---
    
    const btnFilters = document.getElementById('btn-toggle-filters');
    const btnCloseFilters = document.getElementById('btn-close-filters');
    const sidebar = document.getElementById('sidebar-filters');
    
    const btnClosePanel = document.getElementById('btn-close-panel');
    const assetPanel = document.getElementById('asset-control-panel');
    
    const overlay = document.getElementById('overlay');

    // Apri Filtri
    btnFilters.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
    });

    // Chiudi Filtri
    const closeAll = () => {
        sidebar.classList.remove('open');
        assetPanel.classList.remove('open');
        overlay.classList.add('hidden');
    };

    btnCloseFilters.addEventListener('click', closeAll);
    btnClosePanel.addEventListener('click', closeAll);
    overlay.addEventListener('click', closeAll);


    // --- 2. LOGICA REAL-TIME (SUPABASE) ---

    // Funzione per inizializzare l'ascolto dei nuovi dati
    const initRealtime = async () => {
        // Supponiamo che la tabella si chiami 'market_insights'
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT', // Ascolta solo quando vengono aggiunte nuove righe
                    schema: 'public',
                    table: 'market_insights'
                },
                (payload) => {
                    console.log('Nuovo dato ricevuto!', payload.new);
                    // Diciamo a ui.js di disegnare la nuova card in cima al feed
                    if (typeof renderCard === 'function') {
                        renderCard(payload.new, true); 
                    }
                }
            )
            .subscribe();
    };

    // Primo caricamento dati storici all'avvio
    const loadInitialData = async () => {
        try {
            // Chiamiamo la funzione che scriveremo in db.js
            const data = await fetchLatestInsights();
            if (data && typeof renderFeed === 'function') {
                renderFeed(data);
            }
        } catch (error) {
            console.error("Errore caricamento iniziale:", error);
        }
    };

    // Avvio
    loadInitialData();
    initRealtime();
});