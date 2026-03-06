// =============================================================================
// COMPONENTS.JS — Carica e inietta i componenti HTML nelle pagine
// Uso: <div data-component="navbar"></div>
// =============================================================================

/**
 * Carica un file HTML dalla cartella /components/ e lo inietta
 * nell'elemento che ha l'attributo data-component corrispondente.
 * Restituisce una Promise che si risolve quando tutti i componenti
 * sono stati iniettati, così i moduli successivi (feed.js, asset.js)
 * trovano il DOM già pronto.
 */
async function loadComponent(name) {
  const placeholder = document.querySelector(`[data-component="${name}"]`);
  if (!placeholder) return;

  try {
    const res  = await fetch(`components/${name}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    placeholder.outerHTML = html;  // sostituisce il placeholder con il markup reale
  } catch (err) {
    console.error(`[components] Errore caricando "${name}":`, err);
  }
}

/**
 * Carica tutti i componenti dichiarati nella pagina in ordine,
 * poi dispatcha l'evento "componentsReady" sul document.
 * feed.js e asset.js ascoltano questo evento prima di partire.
 */
async function initComponents() {
  // Raccogli tutti i placeholder presenti nella pagina
  const placeholders = document.querySelectorAll('[data-component]');
  const names = Array.from(placeholders).map(el => el.dataset.component);

  // Carica in parallelo
  await Promise.all(names.map(name => loadComponent(name)));

  // Segnala che il DOM dei componenti è pronto
  document.dispatchEvent(new Event('componentsReady'));
}

// Avvia al DOMContentLoaded
document.addEventListener('DOMContentLoaded', initComponents);