const UI = {
    // Helper per i colori dei semafori
    getColor(sentiment) {
        if (!sentiment) return 'text-gray-500';
        if (sentiment.includes('BULLISH')) return 'text-green-400';
        if (sentiment.includes('BEARISH')) return 'text-red-400';
        return 'text-gray-400';
    },

    // Raggruppa e renderizza le MACRO CARD
    renderMacro(data) {
        const container = document.getElementById('macro-container');
        container.innerHTML = '';
        
        if(data.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Nessun evento macro recente.</p>';
            return;
        }

        // Clustering: Raggruppa per feed_id e title
        const clusters = {};
        data.forEach(item => {
            const key = item.feed_id + item.title;
            if (!clusters[key]) {
                clusters[key] = { title: item.title, summary: item.summary, assets: [] };
            }
            clusters[key].assets.push({ ticker: item.asset_ticker, sentiment: item.sentiment_short });
        });

        // Disegna i Cluster
        Object.values(clusters).forEach(cluster => {
            let chipsHtml = cluster.assets.map(a => 
                `<span class="text-xs px-2 py-1 rounded bg-gray-700 border border-gray-600 ${this.getColor(a.sentiment)} font-bold">
                    ${a.ticker}
                </span>`
            ).join('');

            const html = `
                <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm">
                    <h3 class="font-bold text-md text-white mb-2">${cluster.title}</h3>
                    <p class="text-xs text-gray-400 mb-3 line-clamp-3">${cluster.summary}</p>
                    <div class="flex flex-wrap gap-2">${chipsHtml}</div>
                </div>
            `;
            container.innerHTML += html;
        });
    },

    // Renderizza la lista del CONSENSO ASSET
    renderConsensus(data) {
        const container = document.getElementById('asset-container');
        container.innerHTML = '';

        if(data.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Nessun consenso calcolato.</p>';
            return;
        }

        data.forEach(item => {
            const html = `
                <div onclick="APP.openAssetModal('${item.ticker}')" class="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex justify-between items-center cursor-pointer active:bg-gray-700">
                    <div>
                        <h3 class="font-bold text-lg text-blue-400">${item.ticker}</h3>
                        <p class="text-xs text-gray-500 mt-1">Confidenza: ${item.average_confidence}/10</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-bold block ${this.getColor(item.consensus_short)}">${item.consensus_short || 'N/A'}</span>
                        <span class="text-[10px] text-gray-500">Breve Termine</span>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    },

    // Renderizza la Modale (Asset Control Center)
    renderModalTimeline(timelineData) {
        const container = document.getElementById('modal-timeline');
        container.innerHTML = '';
        
        timelineData.forEach(item => {
            container.innerHTML += `
                <div class="border-l-2 border-blue-500 pl-3 py-1">
                    <span class="text-[10px] font-bold px-2 py-1 rounded bg-gray-700 ${this.getColor(item.sentiment_short)}">${item.sentiment_short}</span>
                    <p class="text-xs text-gray-300 mt-2">${item.summary}</p>
                </div>
            `;
        });
    }
};