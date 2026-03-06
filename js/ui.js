const UI = {
    // Helper per i colori del sentiment
    getColor(sentiment) {
        if (!sentiment) return 'text-gray-500';
        const s = sentiment.toUpperCase();
        if (s.includes('BULLISH')) return 'text-emerald-400';
        if (s.includes('BEARISH')) return 'text-red-400';
        return 'text-gray-400';
    },

    // Funzione principale di disegno
    renderFeed(data) {
        console.log("UI: Inizio rendering di", data.length, "elementi"); // Sensore
        const container = document.getElementById('feed-container'); //
        
        if (!container) {
            console.error("UI: Errore! Non trovo 'feed-container' nell'HTML"); //
            return;
        }

        container.innerHTML = ''; // Svuota il caricamento

        // Clustering: Raggruppiamo i dati per evitare duplicati
        const clusters = {};
        data.forEach(item => {
            const key = item.summary || item.title || item.id;
            if (!clusters[key]) {
                clusters[key] = { 
                    title: item.title, 
                    summary: item.summary, 
                    type: item.insight_type,
                    assets: [] 
                };
            }
            if (item.asset_ticker) {
                clusters[key].assets.push({ 
                    ticker: item.asset_ticker, 
                    sentiment: item.sentiment_short 
                });
            }
        });

        // Generazione fisica dell'HTML
        Object.values(clusters).forEach(cluster => {
            const isMacro = cluster.type === 'MACRO_EVENT';
            const borderColor = isMacro ? 'border-purple-500/40' : 'border-blue-500/30';
            const badgeLabel = isMacro ? 'MACRO' : 'ANALYSIS';
            const badgeColor = isMacro ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400';

            const chipsHtml = cluster.assets.map(a => `
                <button onclick="UI.openAssetPanel('${a.ticker}')" 
                        class="bg-gray-700 hover:bg-gray-600 text-[10px] px-2 py-1 rounded border border-gray-600 font-bold transition-colors ${this.getColor(a.sentiment)}">
                    ${a.ticker} ${a.sentiment === 'BULLISH' ? '↑' : a.sentiment === 'BEARISH' ? '↓' : '•'}
                </button>
            `).join('');

            const cardHtml = `
                <div class="bg-gray-800 border ${borderColor} rounded-xl p-4 shadow-lg mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="${badgeColor} text-[9px] font-bold px-2 py-0.5 rounded tracking-tighter">${badgeLabel}</span>
                    </div>
                    <h4 class="font-bold text-base mb-1 text-gray-100">${cluster.title || 'Market Update'}</h4>
                    <p class="text-xs text-gray-400 mb-4 leading-relaxed">${cluster.summary || 'Nessun dettaglio disponibile.'}</p>
                    <div class="flex flex-wrap gap-2">${chipsHtml}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });
        
        console.log("UI: Rendering completato correttamente"); //
    },

    // Funzione per il pannello laterale
    async openAssetPanel(ticker) {
        console.log("UI: Apertura pannello per", ticker); //
        const panel = document.getElementById('asset-control-panel'); //
        const overlay = document.getElementById('overlay'); //
        
        if (panel && overlay) {
            document.getElementById('panel-ticker').innerText = ticker; //
            panel.classList.add('open'); //
            overlay.classList.remove('hidden'); //
            
            // Qui caricheremo il consenso specifico
            const consensus = await getAssetConsensus(ticker); //
            if (consensus) {
                document.getElementById('panel-summary').innerText = consensus.executive_summary; //
            }
        }
    }
};