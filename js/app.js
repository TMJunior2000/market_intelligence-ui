document.addEventListener('DOMContentLoaded', async () => {
    const mount = document.getElementById('sidebar-mount');

    try {
        const res = await fetch('components/sidebar.html');
        if (!res.ok) throw new Error('Sidebar non trovata');
        mount.innerHTML = await res.text();
        
        // Attiviamo i listener
        initUI();
    } catch (e) {
        console.error(e);
    }
});

function initUI() {
    const btnOpen = document.getElementById('btn-toggle-filters');
    const btnClose = document.getElementById('btn-close-filters');
    const sidebar = document.getElementById('sidebar-filters'); // Ora esiste nel DOM
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

    btnOpen.onclick = () => toggle(true);
    btnClose.onclick = () => toggle(false);
    overlay.onclick = () => toggle(false);
}