const UI = {
    // Helper per i colori del sentiment
    getColor(sentiment) {
        if (!sentiment) return 'text-gray-500';
        const s = sentiment.toUpperCase();
        if (s.includes('BULLISH')) return 'text-emerald-400';
        if (s.includes('BEARISH')) return 'text-red-400';
        return 'text-gray-400';
    },

    // Svuota il feed
    clearFeed() {
        document.getElementById('feed-container').innerHTML = '';
    },

    // Renderizza il feed con clustering per eventi macro
    renderFeed(data) {
        const container = document.getElementById('feed-container');
        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 mt-10 text-sm">In attesa di segnali Macro...</p>';
            return;
        }

        // Clustering: Raggruppiamo per 'summary' o 'title' per unire gli asset influenzati
        const clusters = {};
        data.forEach(item => {
            const key = item.summary || item.title;
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

        // Disegna le card
        Object.values(clusters).forEach(cluster => {
            const isMacro = cluster.type === 'MACRO_EVENT';
            const borderColor = isMacro ? 'border-purple-500/30' : 'border-blue-500/30';
            const badgeLabel = isMacro ? 'MACRO' : 'ANALYSIS';
            const badgeColor = isMacro ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400';

            const chipsHtml = cluster.assets.map(a => `
                <button onclick="UI.openAssetPanel('${a.ticker}')" 
                        class="bg-gray-700 hover:bg-gray-600 text-[10px] px-2 py-1 rounded border border-gray-600 font-bold transition-colors ${this.getColor(a.sentiment)}">
                    ${a.ticker} ${a.sentiment === 'BULLISH' ? '↑' : a.sentiment === 'BEARISH' ? '↓' : '•'}
                </button>
            `).join('');

            const html = `
                <div class="bg-gray-800 border ${borderColor} rounded-xl p-3 shadow-md mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="${badgeColor} text-[9px] font-bold px-2 py-0.5 rounded tracking-tighter">${badgeLabel}</span>
                    </div>
                    <h4 class="font-bold text-sm mb-1 text-gray-100">${cluster.title || 'Market Update'}</h4>
                    <p class="text-xs text-gray-400 mb-3 leading-relaxed">${cluster.summary}</p>
                    <div class="flex flex-wrap gap-2">${chipsHtml}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    },

    // Apre il pannello laterale destro
    async openAssetPanel(ticker) {
        const panel = document.getElementById('asset-control-panel');
        const overlay = document.getElementById('overlay');
        
        document.getElementById('panel-ticker').innerText = ticker;
        panel.classList.add('open');
        overlay.classList.remove('hidden');

        // Carica i dati del consenso dal DB
        const consensus = await getAssetConsensus(ticker);
        if (consensus) {
            document.getElementById('panel-consensus').innerText = consensus.consensus_short || 'N/A';
            document.getElementById('panel-consensus').className = `text-lg font-bold ${this.getColor(consensus.consensus_short)}`;
            document.getElementById('panel-confidence').innerHTML = `${consensus.average_confidence || '--'}<span class="text-xs text-gray-400">/10</span>`;
            document.getElementById('panel-short').innerText = consensus.consensus_short || '--';
            document.getElementById('panel-short').className = `font-bold text-sm ${this.getColor(consensus.consensus_short)}`;
            document.getElementById('panel-summary').innerText = consensus.executive_summary || 'Nessuna sintesi disponibile.';
        }
    }
};