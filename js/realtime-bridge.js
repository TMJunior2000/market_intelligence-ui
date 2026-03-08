/**
 * REALTIME-BRIDGE.JS - Versione Live Terminal
 */
const realtimeBridge = {
    channel: null,

    init: () => {
            // Verifica che supabase sia inizializzato dal config.js
            if (!window.supabase || typeof window.supabase.channel !== 'function') {
                console.error("❌ Errore: Il client Supabase non è pronto per il Realtime.");
                return;
            }

            // Creazione del canale broadcast
            realtimeBridge.channel = window.supabase.channel('live_trading', {
                config: { 
                    broadcast: { 
                        self: false, // Non ascoltiamo i nostri stessi messaggi
                        ack: false   // Disabilitiamo gli ack per massimizzare la velocità
                    } 
                }
            });

            realtimeBridge.channel
                // 1. ASCOLTO PING DA PYTHON
                .on('broadcast', { event: 'ping' }, () => {
                    console.log("📡 [Realtime] PING ricevuto da Python. Rispondo PONG...");
                    
                    realtimeBridge.channel.send({
                        type: 'broadcast',
                        event: 'pong',
                        payload: { status: 'online', timestamp: new Date().toISOString() }
                    });
                })

                // 2. ASCOLTO DATI ACCOUNT E TRADES
                .on('broadcast', { event: 'account_update' }, (envelope) => {
                    console.log("📈 [Realtime] Ricevuto aggiornamento MT5");
                    
                    // La libreria a volte impacchetta i dati in 'payload', a volte sono diretti
                    // Questa riga gestisce entrambi i casi per sicurezza
                    const data = envelope.payload || envelope;
                    realtimeBridge.renderTerminal(data);
                })

                // 3. SOTTOSCRIZIONE
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log("🌐 [Realtime] Canale 'live_trading' connesso con successo!");
                    } else {
                        console.warn(`⚠️ [Realtime] Stato connessione: ${status}`);
                    }
                });
        },

    renderTerminal: (data) => {
        const { account, trades } = data;

        // 1. Aggiornamento Account Stats
        document.getElementById('equity-val').innerText = `$${account.equity.toFixed(2)}`;
        document.getElementById('balance-val').innerText = `$${account.balance.toFixed(2)}`;
        document.getElementById('margin-level-val').innerText = `${Math.round(account.margin_level)}%`;
        
        const profitEl = document.getElementById('profit-val');
        profitEl.innerText = `${account.profit >= 0 ? '+' : ''}$${account.profit.toFixed(2)}`;
        profitEl.style.color = account.profit >= 0 ? 'var(--bullish)' : 'var(--bearish)';

        // 2. Aggiornamento Contatore Posizioni
        document.getElementById('trades-count').innerText = `${trades.length} POS`;

        // 3. Rendering Lista Operazioni
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
                        <span class="trade-badge ${t.type === 'BUY' ? 'badge-buy' : 'badge-sell'}">${t.type}</span>
                        ${t.symbol}
                    </span>
                    <span class="trade-details">Vol: ${t.volume} @ ${t.price_open}</span>
                </div>
                <div class="trade-profit" style="color: ${t.profit >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">
                    ${t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}
                </div>
            </div>
        `).join('');
    }
};

document.addEventListener('componentsReady', () => realtimeBridge.init());