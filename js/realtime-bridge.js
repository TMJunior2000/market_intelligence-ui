/**
 * REALTIME-BRIDGE.JS - Versione Live Terminal & Asset Hero
 * Gestisce la ricezione dei dati da Python/MT5 e li smista ai componenti UI
 */
const realtimeBridge = {
    channel: null,

    init: () => {
        // Verifica inizializzazione Supabase
        if (!window.supabase || typeof window.supabase.channel !== 'function') {
            console.error("❌ Errore: Il client Supabase non è pronto per il Realtime.");
            return;
        }

        // Creazione del canale broadcast per bassa latenza
        realtimeBridge.channel = window.supabase.channel('live_trading', {
            config: { 
                broadcast: { 
                    self: false, 
                    ack: false   
                } 
            }
        });

        realtimeBridge.channel
            // 1. ASCOLTO PING (Health Check)
            .on('broadcast', { event: 'ping' }, () => {
                // Prendiamo il ticker dall'URL corrente
                const urlParams = new URLSearchParams(window.location.search);
                const ticker = urlParams.get('ticker') || "EURUSD";

                realtimeBridge.channel.send({
                    type: 'broadcast',
                    event: 'pong',
                    payload: { 
                        status: 'online', 
                        active_asset: ticker // <--- Python userà questo per fare mt5.symbol_info(ticker)
                    }
                });
            })

            // 2. ASCOLTO DATI ACCOUNT E TRADES (Main Update)
            .on('broadcast', { event: 'account_update' }, (envelope) => {
                const data = envelope.payload || envelope;
                
                // Salvataggio globale dell'ultimo pacchetto per il ricalcolo istantaneo degli input
                window.lastMT5Data = data;
                
                // Aggiorna la sidebar operativa (sempre visibile)
                realtimeBridge.renderTerminal(data);
                
                // Aggiorna la Hero Asset se la vista è attiva
                realtimeBridge.syncAssetHero(data);
            })

            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log("🌐 [Realtime] Canale 'live_trading' attivo!");
            });
    },

    /**
     * Aggiorna i componenti della Sidebar Operativa
     */
    renderTerminal: (data) => {
        const { account, trades } = data;

        // 1. Aggiornamento Account Stats
        const equityEl = document.getElementById('equity-val');
        const balanceEl = document.getElementById('balance-val');
        const marginEl = document.getElementById('margin-level-val');
        const profitTotalEl = document.getElementById('profit-val');

        if (equityEl) equityEl.innerText = `$${account.equity.toFixed(2)}`;
        if (balanceEl) balanceEl.innerText = `$${account.balance.toFixed(2)}`;
        if (marginEl) marginEl.innerText = `${Math.round(account.margin_level)}%`;
        
        if (profitTotalEl) {
            profitTotalEl.innerText = `${account.profit >= 0 ? '+' : ''}$${account.profit.toFixed(2)}`;
            profitTotalEl.style.color = account.profit >= 0 ? 'var(--bullish)' : 'var(--bearish)';
        }

        // 2. Contatore Posizioni
        const countEl = document.getElementById('trades-count');
        if (countEl) countEl.innerText = `${trades.length} POS`;

        // 3. Rendering Lista Operazioni (Sidebar)
        const grid = document.getElementById('open-trades-grid');
        if (!grid) return;

        if (trades.length === 0) {
            grid.innerHTML = '<div class="state-msg">Nessuna operazione aperta</div>';
            return;
        }

        grid.innerHTML = trades.map(t => `
            <div class="trade-row data-flash">
                <div class="trade-info-main">
                    <span class="trade-symbol">
                        <span class="trade-badge ${t.type.includes('BUY') ? 'badge-buy' : 'badge-sell'}">${t.type}</span>
                        ${t.symbol}
                    </span>
                    <span class="trade-details">Vol: ${t.volume} @ ${t.price_open}</span>
                </div>
                <div class="trade-profit" style="color: ${t.profit >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">
                    ${t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}
                </div>
            </div>
        `).join('');
    },

    /**
     * Smista i dati alla vista Asset specifica (Hero + Risk Terminal)
     */
    syncAssetHero: (data) => {
        const assetView = document.getElementById('asset-view');
        
        // Verifichiamo che la vista asset sia visibile e che la funzione di asset.js sia caricata
        if (assetView && assetView.style.display !== 'none') {
            if (typeof updateAssetCalculations === 'function') {
                updateAssetCalculations(data);
            }
        }
    }
};

// Inizializzazione al caricamento dei componenti
document.addEventListener('componentsReady', () => realtimeBridge.init());