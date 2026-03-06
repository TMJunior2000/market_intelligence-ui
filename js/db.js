const SUPABASE_URL = "https://qdzbuybmddixpdzuzkhu.supabase.co";
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemJ1eWJtZGRpeHBkenV6a2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDU2NTAsImV4cCI6MjA4NDk4MTY1MH0.hJBybo3l53J-xrxG50-iW7TbKTkZIoV4YFgY9Tp82q4';

// Inizializzazione client
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

console.log("DB: Client inizializzato."); //

/** Recupera gli ultimi 30 insight */
async function fetchLatestInsights() {
    console.log("DB: Avvio recupero dati relazionali V5.0...");
    try {
        const { data, error } = await sbClient
            .from('market_insights')
            .select(`
                *,
                content_feed (
                    title,
                    url,
                    sources (name, platform)
                )
            `)
            .order('id', { ascending: false })
            .limit(30);

        if (error) throw error;
        console.log("DB: Record ricevuti:", data.length);
        return data;
    } catch (err) {
        console.error("DB Error:", err.message);
        return [];
    }
}

/** Recupera il consenso per un ticker */
async function getAssetConsensus(ticker) {
    try {
        const { data, error } = await sbClient
            .from('asset_consensus')
            .select('*')
            .eq('ticker', ticker)
            .single();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error(`DB: Errore consenso per ${ticker}:`, err.message); //
        return null;
    }
}