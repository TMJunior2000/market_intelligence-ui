// =============================================================================
// CONFIGURAZIONE SUPABASE (Sincronizzata per Realtime & Feed)
// =============================================================================

const SUPABASE_URL = "https://qdzbuybmddixpdzuzkhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemJ1eWJtZGRpeHBkenV6a2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDU2NTAsImV4cCI6MjA4NDk4MTY1MH0.hJBybo3l53J-xrxG50-iW7TbKTkZIoV4YFgY9Tp82q4";

/**
 * 1. Inizializziamo il Client.
 * Usiamo window.supabase che è l'oggetto caricato dal CDN.
 */
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 2. ESPOSIZIONE GLOBALE (Cruciale)
 * Sovrascriviamo l'oggetto globale 'supabase' con l'istanza del client.
 * In questo modo realtime-bridge.js troverà la funzione .channel()
 */
window.supabase = client;

/**
 * 3. Alias 'db'
 * Per mantenere la compatibilità con i tuoi script esistenti (feed.js, ecc.)
 */
window.db = client;

console.log("🚀 Supabase inizializzato: Client pronto per Realtime Broadcast.");