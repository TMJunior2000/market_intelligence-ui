document.addEventListener('DOMContentLoaded', async () => {
    console.log("1. App avviata: DOM pronto"); //

    // --- Inizializzazione UI ---
    const btnFilters = document.getElementById('btn-toggle-filters');
    const sidebar = document.getElementById('sidebar-filters');
    const overlay = document.getElementById('overlay');
    const statusIndicator = document.getElementById('status-indicator');

    if (btnFilters) {
        btnFilters.onclick = () => {
            sidebar.classList.add('open');
            overlay.classList.remove('hidden');
        };
    }

    // --- Caricamento Dati ---
    console.log("2. Tentativo di caricamento dati iniziali..."); //
    try {
        const data = await fetchLatestInsights(); // Funzione in db.js
        console.log("3. Dati ricevuti dal DB:", data); //
        
        if (data && data.length > 0) {
            UI.renderFeed(data); // Funzione in ui.js
            statusIndicator.style.backgroundColor = '#10b981'; // Verde
        } else {
            console.warn("4. Il DB è tornato vuoto o non ci sono tabelle"); //
        }
    } catch (e) {
        console.error("ERRORE CRITICO AVVIO:", e); //
    }

    // --- Attivazione Real-time ---
    if (typeof sbClient !== 'undefined') {
        console.log("5. Inizializzazione Real-time..."); //
        sbClient.channel('market-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_insights' }, (payload) => {
                console.log("6. NUOVO DATO REAL-TIME!", payload.new); //
                location.reload(); // Per ora ricarichiamo per sicurezza
            }).subscribe();
    }
});