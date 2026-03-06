const APP = {
    state: {
        macroData: [],
        consensusData: []
    },

    async init() {
        this.bindEvents();
        
        // Check Connessione
        const isConnected = await DB.checkConnection();
        const indicator = document.getElementById('status-indicator');
        if (isConnected) {
            indicator.classList.remove('bg-red-500');
            indicator.classList.add('bg-green-500');
            indicator.title = "Connesso a Supabase";
        }

        // Carica dati iniziali (Macro)
        this.loadMacro();
    },

    bindEvents() {
        // Navigazione Bottom Bar
        const tabs = ['macro', 'assets', 'filters'];
        tabs.forEach(tab => {
            document.getElementById(`nav-${tab}`).addEventListener('click', () => {
                this.switchTab(tab);
            });
        });

        // Chiusura Modale
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('asset-modal').classList.add('hidden');
        });

        // Listener per il filtro Confidenza
        document.getElementById('filter-confidence').addEventListener('change', (e) => {
            if (this.state.consensusData.length > 0) {
                let filtered = e.target.checked 
                    ? this.state.consensusData.filter(item => item.average_confidence >= 7)
                    : this.state.consensusData;
                UI.renderConsensus(filtered);
            }
        });
    },

    switchTab(activeTab) {
        // Aggiorna UI Bottoni
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-blue-400');
            btn.classList.add('text-gray-500');
        });
        document.getElementById(`nav-${activeTab}`).classList.add('text-blue-400');
        document.getElementById(`nav-${activeTab}`).classList.remove('text-gray-500');

        // Mostra/Nasconde Sezioni
        ['macro', 'assets', 'filters'].forEach(tab => {
            document.getElementById(`view-${tab}`).classList.add('hidden');
        });
        document.getElementById(`view-${activeTab}`).classList.remove('hidden');

        // Carica Dati Lazy Load
        if (activeTab === 'macro' && this.state.macroData.length === 0) this.loadMacro();
        if (activeTab === 'assets' && this.state.consensusData.length === 0) this.loadConsensus();
    },

    async loadMacro() {
        this.state.macroData = await DB.getMacroEvents();
        UI.renderMacro(this.state.macroData);
    },

    async loadConsensus() {
        this.state.consensusData = await DB.getAssetConsensus();
        UI.renderConsensus(this.state.consensusData);
    },

    // Funzione chiamata al click su un Ticker nella schermata Asset
    async openAssetModal(ticker) {
        // Trova i dati del consenso in memoria
        const consensus = this.state.consensusData.find(item => item.ticker === ticker);
        
        // Popola la UI della Modale
        document.getElementById('modal-ticker').textContent = ticker;
        document.getElementById('modal-summary').textContent = consensus.executive_summary || "Riassunto AI in elaborazione...";
        
        document.getElementById('modal-short').textContent = consensus.consensus_short || "-";
        document.getElementById('modal-short').className = `font-bold text-sm ${UI.getColor(consensus.consensus_short)}`;
        
        document.getElementById('modal-medium').textContent = consensus.consensus_medium || "-";
        document.getElementById('modal-medium').className = `font-bold text-sm ${UI.getColor(consensus.consensus_medium)}`;
        
        document.getElementById('modal-long').textContent = consensus.consensus_long || "-";
        document.getElementById('modal-long').className = `font-bold text-sm ${UI.getColor(consensus.consensus_long)}`;

        // Apri la Modale
        document.getElementById('asset-modal').classList.remove('hidden');

        // Carica asincronamente la timeline
        document.getElementById('modal-timeline').innerHTML = '<p class="text-xs text-gray-500">Caricamento storico...</p>';
        const timelineData = await DB.getAssetTimeline(ticker);
        UI.renderModalTimeline(timelineData);
    }
};

// Avvia l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    APP.init();
});