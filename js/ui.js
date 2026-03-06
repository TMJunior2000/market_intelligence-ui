const UI = {
    /** Helper colori sentiment */
    getColor(sentiment) {
        if (!sentiment) return 'text-gray-500';
        const s = sentiment.toUpperCase();
        if (s.includes('BULLISH') || s.includes('BUY')) return 'text-emerald-400';
        if (s.includes('BEARISH') || s.includes('SELL')) return 'text-red-400';
        return 'text-gray-400';
    },

    /** Rendering del feed tramite Template HTML */
    renderFeed(data) {
        const container = document.getElementById('feed-container');
        const cardTemplate = document.getElementById('template-card');
        const chipTemplate = document.getElementById('template-chip');

        if (!container || !cardTemplate) return console.error("UI: Elementi non trovati."); //

        container.innerHTML = ''; // Pulizia feed

        // Clustering per Titolo (unisce asset influenzati dallo stesso evento)
        const clusters = {};
        data.forEach(item => {
            const key = item.title || item.id;
            if (!clusters[key]) {
                clusters[key] = { ...item, assets: [] };
            }
            if (item.asset_ticker) {
                clusters[key].assets.push({ ticker: item.asset_ticker, sentiment: item.sentiment_short });
            }
        });

        // Clonazione e riempimento dei template
        Object.values(clusters).forEach(cluster => {
            const clone = cardTemplate.content.cloneNode(true);
            const cardDiv = clone.querySelector('.card-terminal');

            // Testi
            clone.querySelector('.card-title').textContent = cluster.title || 'Market Update';
            clone.querySelector('.card-summary').textContent = cluster.summary || 'Nessun dettaglio.';

            // Stile Badge e Bordo (Macro vs Asset)
            const badge = clone.querySelector('.badge-type');
            const isMacro = cluster.insight_type === 'MACRO_EVENT';
            badge.textContent = isMacro ? 'Macro Event' : 'Asset Analysis';
            
            if (isMacro) {
                badge.classList.add('bg-purple-500/20', 'text-purple-400');
                cardDiv.classList.add('border-purple-500/40');
            } else {
                badge.classList.add('bg-blue-500/20', 'text-blue-400');
                cardDiv.classList.add('border-blue-500/30');
            }

            // Iniezione Asset Chips
            const assetsContainer = clone.querySelector('.card-assets');
            cluster.assets.forEach(asset => {
                const chipClone = chipTemplate.content.cloneNode(true);
                const btn = chipClone.querySelector('button');
                btn.textContent = asset.ticker;
                btn.classList.add(this.getColor(asset.sentiment));
                btn.onclick = () => this.openAssetPanel(asset.ticker);
                assetsContainer.appendChild(chipClone);
            });

            container.appendChild(clone);
        });
        console.log("UI: Rendering completato."); //
    },

    /** Gestione Pannelli Laterali */
    async openAssetPanel(ticker) {
        const panel = document.getElementById('asset-control-panel');
        const overlay = document.getElementById('overlay');
        if (panel) {
            document.getElementById('panel-ticker').textContent = ticker;
            panel.classList.add('open');
            overlay?.classList.add('open');
            overlay?.classList.remove('hidden');

            const consensus = await getAssetConsensus(ticker);
            if (consensus) {
                document.getElementById('panel-summary').textContent = consensus.executive_summary;
            }
        }
    }
};