/**
 * APP.JS: Caricamento Dinamico Componenti
 */
document.addEventListener('DOMContentLoaded', async () => {
    const mount = document.getElementById('sidebar-mount');

    try {
        // 1. Fetch del file esterno
        const response = await fetch('components/sidebar.html');
        if (!response.ok) throw new Error("Sidebar non trovata");
        const html = await response.text();
        
        // 2. Iniezione nel DOM
        mount.innerHTML = html;
        console.log("APP: Sidebar (Pilastro 1) caricata.");

        // 3. Attivazione Eventi UI
        initUI();
    } catch (err) {
        console.error("APP ERROR:", err);
    }
});

function initUI() {
    const btnOpen = document.getElementById('btn-toggle-filters');
    const btnClose = document.getElementById('btn-close-filters');
    const sidebar = document.getElementById('sidebar-filters');
    const overlay = document.getElementById('overlay');

    const toggle = (state) => {
        if (state) {
            sidebar.classList.add('open');
            overlay.classList.remove('hidden');
        } else {
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
        }
    };

    if (btnOpen) btnOpen.onclick = () => toggle(true);
    if (btnClose) btnClose.onclick = () => toggle(false);
    if (overlay) overlay.onclick = () => toggle(false);
}