const UI = {
    getColor: (s) => {
        if (!s) return 'text-gray-500';
        const val = s.toUpperCase();
        return (val.includes('BULL') || val.includes('BUY')) ? 'text-emerald-400' : 
               (val.includes('BEAR') || val.includes('SELL')) ? 'text-red-400' : 'text-gray-400';
    },

    renderFeed(data) {
        const container = document.getElementById('feed-container');
        const cardTemplate = document.getElementById('template-card');
        const chipTemplate = document.getElementById('template-chip');

        if (!container || !cardTemplate) return;
        container.innerHTML = '';

        // Clustering basato sul feed_id (per raggruppare ticker diversi dallo stesso video/post)
        const clusters = {};
        data.forEach(item => {
            const key = item.feed_id || item.title;
            if (!clusters[key]) {
                clusters[key] = {
                    title: item.title || "Update",
                    summary: item.summary || "Nessun dettaglio.",
                    type: item.insight_type,
                    sourceName: item.content_feed?.sources?.name || "Market",
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

        Object.values(clusters).forEach(cluster => {
            const clone = cardTemplate.content.cloneNode(true);
            
            // Mapping Schema V5.0 -> HTML
            clone.querySelector('.card-title').textContent = cluster.title;
            clone.querySelector('.card-summary').textContent = cluster.summary;
            
            const badge = clone.querySelector('.badge-type');
            badge.textContent = cluster.sourceName; // Ora mostra "Donald Trump" o "InvestireBiz"
            
            const isMacro = cluster.type === 'MACRO_EVENT';
            const cardDiv = clone.querySelector('.card-terminal');
            
            // Stile dinamico
            if (isMacro) {
                badge.classList.add('bg-purple-500/20', 'text-purple-400');
                cardDiv.classList.add('border-purple-500/40');
            } else {
                badge.classList.add('bg-blue-500/20', 'text-blue-400');
                cardDiv.classList.add('border-blue-500/30');
            }

            // Chips Asset
            const assetsContainer = clone.querySelector('.card-assets');
            cluster.assets.forEach(a => {
                const chipClone = chipTemplate.content.cloneNode(true);
                const btn = chipClone.querySelector('button');
                btn.textContent = a.ticker;
                btn.classList.add(this.getColor(a.sentiment));
                btn.onclick = () => this.openAssetPanel(a.ticker);
                assetsContainer.appendChild(chipClone);
            });

            container.appendChild(clone);
        });
    }
};