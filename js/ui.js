const UI = {
    getColor: (s) => {
        if (!s) return 'text-gray-500';
        const val = s.toUpperCase();
        return (val.includes('BULL') || val.includes('BUY')) ? 'text-emerald-400' : 
               (val.includes('BEAR') || val.includes('SELL')) ? 'text-red-400' : 'text-gray-400';
    },

    renderFeed(data) {
        // 1. Puntamento agli elementi HTML
        const container = document.getElementById('feed-container');
        const cardTemplate = document.getElementById('template-card');
        const chipTemplate = document.getElementById('template-chip');

        // LOG DI SICUREZZA: Verifica che i template esistano nell'HTML
        console.log("UI Check - Container:", !!container, "CardTemplate:", !!cardTemplate, "ChipTemplate:", !!chipTemplate);

        if (!container || !cardTemplate) {
            console.error("UI: Si ferma qui. Mancano i template nell'HTML.");
            return;
        }

        container.innerHTML = ''; // Svuota lo spinner di caricamento

        // 2. Inizio Clustering (Raggruppamento)
        const clusters = {};
        
        console.log(`UI: Inizio elaborazione di ${data.length} record.`);

        data.forEach((item, index) => {
            // La chiave unisce i record che hanno lo stesso feed_id (stesso video/post)
            const key = item.feed_id || item.title || `id-${item.id}`;
            
            if (!clusters[key]) {
                // LOG DI TRACCIAMENTO: Vediamo se i dati annidati esistono
                // Se si schianta qui, significa che 'content_feed' o 'sources' sono undefined
                try {
                    const sName = item.content_feed?.sources?.name || "Market";
                    
                    clusters[key] = {
                        title: item.title || "Update",
                        summary: item.summary || "Nessun dettaglio.",
                        type: item.insight_type,
                        sourceName: sName,
                        assets: []
                    };
                } catch (err) {
                    console.error(`Errore al record ${index} (ID: ${item.id}):`, err);
                }
            }

            // 3. Aggiunta dell'asset al cluster
            if (item.asset_ticker) {
                clusters[key].assets.push({ 
                    ticker: item.asset_ticker, 
                    sentiment: item.sentiment_short 
                });
            }
        });

        console.log("UI: Cluster generati:", Object.keys(clusters));

        // 4. Disegno fisico delle card
        Object.values(clusters).forEach(cluster => {
            try {
                const clone = cardTemplate.content.cloneNode(true);
                
                // Riempimento testi
                clone.querySelector('.card-title').textContent = cluster.title;
                clone.querySelector('.card-summary').textContent = cluster.summary;
                
                const badge = clone.querySelector('.badge-type');
                badge.textContent = cluster.sourceName;
                
                const assetsContainer = clone.querySelector('.card-assets');

                // Disegno dei Ticker (Chip)
                cluster.assets.forEach(a => {
                    if (!chipTemplate) return;
                    const chipClone = chipTemplate.content.cloneNode(true);
                    const btn = chipClone.querySelector('button');
                    btn.textContent = a.ticker;
                    
                    // Applichiamo il colore (assicurati che getColor sia definito in UI)
                    const colorClass = this.getColor(a.sentiment);
                    btn.className += ` ${colorClass}`;
                    
                    btn.onclick = () => this.openAssetPanel(a.ticker);
                    assetsContainer.appendChild(chipClone);
                });

                container.appendChild(clone);
            } catch (renderError) {
                console.error("UI: Errore nel disegno della card:", renderError);
            }
        });

        console.log("UI: Rendering finale completato.");
    }
};