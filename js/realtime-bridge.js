/**
 * REALTIME-BRIDGE.JS - Versione Live Terminal
 */
const realtimeBridge = {
    channel: null,

    init: () => {
        realtimeBridge.channel = supabase.channel('live_trading', {
            config: { broadcast: { self: false } }
        });

        realtimeBridge.channel
            .on('broadcast', { event: 'ping' }, () => {
                realtimeBridge.channel.send({
                    type: 'broadcast', event: 'pong', payload: { status: 'online' }
                });
            })
            .on('broadcast', { event: 'account_update' }, (payload) => {
                realtimeBridge.renderTerminal(payload.payload);
            })
            .subscribe();
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