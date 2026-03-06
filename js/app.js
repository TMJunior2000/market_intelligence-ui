/**
 * APP.JS: Caricamento dinamico dei pilastri
 */
document.addEventListener('DOMContentLoaded', async () => {
    const mount = document.getElementById('sidebar-mount');

    try {
        // 1. Fetch del file esterno
        const response = await fetch('components/sidebar.html');
        const html = await response.text();
        
        // 2. Iniezione nel DOM
        mount.innerHTML = html;
        console.log("APP: Sidebar caricata con successo.");

        // 3. Aggancio eventi (DOPO che l'HTML è stato inserito)
        initSidebarEvents();
    } catch (err) {
        console.error("APP: Errore nel caricamento della sidebar:", err);
    }
});

function initSidebarEvents() {
    const btnOpen = document.getElementById('btn-toggle-filters');
    const btnClose = document.getElementById('btn-close-filters');
    const sidebar = document.getElementById('sidebar-filters');
    const overlay = document.getElementById('overlay');

    const toggle = (show) => {
        sidebar.classList.toggle('open', show);
        overlay.classList.toggle('hidden', !show);
    };

    if (btnOpen) btnOpen.onclick = () => toggle(true);
    if (btnClose) btnClose.onclick = () => toggle(false);
    if (overlay) overlay.onclick = () => toggle(false);
}