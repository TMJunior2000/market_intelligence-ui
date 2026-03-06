document.addEventListener('DOMContentLoaded', async () => {
    await loadComponent('nav-mount', 'components/nav.html');
    initNavLogic();
    await fetchAndRenderFeed();
});

async function loadComponent(id, path) {
    const res = await fetch(path);
    document.getElementById(id).innerHTML = await res.text();
}

async function fetchAndRenderFeed(filter = 'all') {
    const container = document.getElementById('feed-container');
    const template = document.getElementById('tpl-card');
    
    // Esempio chiamata Supabase
    const { data, error } = await supabase.from('market_insights').select('*, content_feed(*)').limit(10);
    if (error) return;

    container.innerHTML = '';
    data.forEach(item => {
        const clone = template.content.cloneNode(true);
        
        // Mapping Dati -> DOM
        clone.querySelector('.card-category-badge').textContent = item.insight_type || 'FINANCE';
        clone.querySelector('.card-title').textContent = item.title;
        clone.querySelector('.card-excerpt').textContent = item.summary;
        clone.querySelector('.card-date').textContent = new Date(item.created_at).toLocaleDateString();
        clone.querySelector('.card-source').textContent = item.content_feed?.source_id || 'PRAGMATIC';
        
        const imgBox = clone.querySelector('.card-img-box');
        imgBox.style.backgroundImage = `linear-gradient(147deg,rgba(0,0,0,0.4),transparent), url('https://placeholder.it/600x400')`;

        container.appendChild(clone);
    });
}

function initNavLogic() {
    // Gestione click filtri
    document.querySelectorAll('.btn-worldy').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.btn-worldy').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fetchAndRenderFeed(btn.dataset.filter);
        };
    });
}