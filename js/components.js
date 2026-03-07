/**
 * COMPONENTS.JS - Gestisce l'iniezione dei componenti HTML (nav, footer, ecc.)
 */
async function loadComponent(name) {
  const placeholder = document.querySelector(`[data-component="${name}"]`);
  if (!placeholder) return;

  try {
    const res = await fetch(`components/${name}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    
    // USA innerHTML: mantiene il div con l'attributo data-component vivo nel DOM
    placeholder.innerHTML = html; 
    
  } catch (err) {
    console.error(`[components] Errore caricando "${name}":`, err);
  }
}

async function initComponents() {
  const placeholders = document.querySelectorAll('[data-component]');
  const names = Array.from(placeholders).map(el => el.dataset.component);

  // Caricamento parallelo
  await Promise.all(names.map(name => loadComponent(name)));

  // Segnala che il DOM è completo e gli altri script possono partire
  document.dispatchEvent(new Event('componentsReady'));
}

document.addEventListener('DOMContentLoaded', initComponents);