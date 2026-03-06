const SUPABASE_URL="https://qdzbuybmddixpdzuzkhu.supabase.co";
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemJ1eWJtZGRpeHBkenV6a2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDU2NTAsImV4cCI6MjA4NDk4MTY1MH0.hJBybo3l53J-xrxG50-iW7TbKTkZIoV4YFgY9Tp82q4';

const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

/**
 * Recupera gli ultimi eventi macro dal DB per il caricamento iniziale.
 */
async function fetchLatestInsights() {
    try {
        const { data, error } = await sbClient
            .from('market_insights')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30); // Prendiamo gli ultimi 30 per non appesantire lo Xiaomi

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Errore DB nel recupero insights:", err.message);
        return [];
    }
}

/**
 * Recupera il consenso specifico per un asset quando clicchi sul chip.
 */
async function getAssetConsensus(ticker) {
    try {
        const { data, error } = await sbClient
            .from('asset_consensus')
            .select('*')
            .eq('ticker', ticker)
            .single(); // Ne vogliamo solo uno, quello dell'asset cliccato

        if (error) throw error;
        return data;
    } catch (err) {
        console.error(`Errore DB nel recupero consenso per ${ticker}:`, err.message);
        return null;
    }
}