document.addEventListener('DOMContentLoaded', async () => {
    console.log("APP: Avvio..."); //

    const statusIndicator = document.getElementById('status-indicator');
    const overlay = document.getElementById('overlay');
    const sidebar = document.getElementById('sidebar-filters');

    // --- Gestione UI ---
    document.getElementById('btn-toggle-filters')?.addEventListener('click', () => {
        sidebar?.classList.add('open');
        overlay?.classList.add('open', 'hidden'); // 'hidden' rimosso da Tailwind
        overlay?.classList.remove('hidden');
    });

    const closeAll = () => {
        document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('open'));
        overlay?.classList.remove('open');
        overlay?.classList.add('hidden');
    };

    document.getElementById('btn-close-filters')?.addEventListener('click', closeAll);
    document.getElementById('btn-close-panel')?.addEventListener('click', closeAll);
    overlay?.addEventListener('click', closeAll);

    // --- Caricamento iniziale ---
    try {
        const data = await fetchLatestInsights();
        if (data) {
            UI.renderFeed(data);
            if (statusIndicator) statusIndicator.style.backgroundColor = '#10b981'; // Verde
        }
    } catch (e) {
        console.error("APP: Errore caricamento:", e); //
    }

    // --- Real-time ---
    sbClient.channel('market-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_insights' }, (payload) => {
            console.log("APP: Nuovo dato! Aggiorno..."); //
            location.reload(); 
        }).subscribe();
});