const SUPABASE_URL="https://qdzbuybmddixpdzuzkhu.supabase.co";
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZXNtYW11bGZybG1ob3Nld3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTUxNDYsImV4cCI6MjA3MTY5MTE0Nn0.ej5EqnGOfwlHsZdERoB9xzI_GQxzoHtRjAMyBDHSiaU';

const supabaseCleint = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DB = {
    // Verifica lo stato della connessione
    async checkConnection() {
        const { data, error } = await supabaseCleint.from('assets').select('ticker').limit(1);
        return !error;
    },

    // Prende le card di tipo MACRO_EVENT (Ultime 50)
    async getMacroEvents() {
        const { data, error } = await supabaseCleint
            .from('market_insights')
            .select('*')
            .eq('insight_type', 'MACRO_EVENT')
            .order('id', { ascending: false })
            .limit(50);
        if (error) console.error("DB Error Macro:", error);
        return data || [];
    },

    // Prende il cruscotto aggregato degli asset
    async getAssetConsensus() {
        const { data, error } = await supabaseCleint
            .from('asset_consensus')
            .select('*')
            .order('average_confidence', { ascending: false });
        if (error) console.error("DB Error Consensus:", error);
        return data || [];
    },

    // Prende la timeline storica di un singolo asset
    async getAssetTimeline(ticker) {
        const { data, error } = await supabaseCleint
            .from('market_insights')
            .select('summary, sentiment_short, confidence, id')
            .eq('asset_ticker', ticker)
            .order('id', { ascending: false })
            .limit(10);
        if (error) console.error("DB Error Timeline:", error);
        return data || [];
    }
};