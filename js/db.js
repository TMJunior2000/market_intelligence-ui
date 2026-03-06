const SUPABASE_URL = "https://qdzbuybmddixpdzuzkhu.supabase.co";
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemJ1eWJtZGRpeHBkenV6a2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDU2NTAsImV4cCI6MjA4NDk4MTY1MH0.hJBybo3l53J-xrxG50-iW7TbKTkZIoV4YFgY9Tp82q4';

console.log("DB: Inizializzazione client Supabase..."); //

const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

/**
 * Recupera gli ultimi insights dal DB.
 */
async function fetchLatestInsights() {
    console.log("DB: Richiesta fetchLatestInsights avviata..."); //
    try {
        const { data, error } = await sbClient
            .from('market_insights')
            .select('*')
            .order('id', { ascending: false })
            .limit(30);

        if (error) {
            console.error("DB: Errore nella query market_insights:", error.message); //
            throw error;
        }

        console.log(`DB: Ricevuti ${data?.length || 0} record da market_insights`); //
        if (data?.length > 0) {
            console.table(data.slice(0, 3)); // Mostra i primi 3 record in una tabella leggibile
        }
        
        return data;
    } catch (err) {
        console.error("DB: Errore fatale in fetchLatestInsights:", err.message); //
        return [];
    }
}

/**
 * Recupera il consenso per un asset specifico.
 */
async function getAssetConsensus(ticker) {
    console.log(`DB: Cerco consenso per il ticker: ${ticker}...`); //
    try {
        const { data, error } = await sbClient
            .from('asset_consensus')
            .select('*')
            .eq('ticker', ticker)
            .single();

        if (error) {
            console.warn(`DB: Nessun consenso trovato o errore per ${ticker}:`, error.message); //
            throw error;
        }

        console.log(`DB: Dati consenso ricevuti per ${ticker}:`, data); //
        return data;
    } catch (err) {
        console.error(`DB: Errore nel recupero consenso per ${ticker}:`, err.message); //
        return null;
    }
}