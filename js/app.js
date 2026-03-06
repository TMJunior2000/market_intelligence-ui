/**
 * APP.JS: Caricamento dinamico dei componenti Worldy-Style
 */
document.addEventListener('DOMContentLoaded', async () => {
    const navMount = document.getElementById('nav-mount');

    try {
        // 1. Caricamento della Navbar Separata
        const response = await fetch('components/secondary-nav.html');
        if (!response.ok) throw new Error("Componente Navbar non trovato");
        
        navMount.innerHTML = await response.text();
        console.log("APP: Secondary Navbar caricata.");

        // 2. Inizializzazione Click Categorie
        initNavEvents();
        
    } catch (err) {
        console.error("APP ERROR:", err);
    }
});

function initNavEvents() {
    const categories = document.querySelectorAll('.nav-category');
    
    categories.forEach(cat => {
        cat.addEventListener('click', (e) => {
            e.preventDefault();
            // Rimuove 'active' da tutti e lo mette a quello cliccato
            categories.forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            
            const selected = cat.getAttribute('data-category');
            console.log(`Filtro attivato: ${selected}`);
            // Qui chiameremo la funzione di Supabase per filtrare i dati
        });
    });
}