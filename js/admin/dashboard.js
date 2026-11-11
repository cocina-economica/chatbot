/**
 * Universal Sales Chat Engine - Admin Dashboard & Analytics Module
 */

export class DashboardModule {
  constructor(analyticsService, containerElement) {
    this.analytics = analyticsService;
    this.container = containerElement;
  }

  render() {
    if (!this.container) return;
    const metrics = this.analytics.getMetrics();
    const counters = metrics.counters || {};

    const sessions = counters.chat_started || 0;
    const msgViewed = counters.message_viewed || 0;
    const btnClicks = counters.button_clicked || 0;
    const prodViews = counters.product_viewed || 0;
    const offerViews = counters.offer_viewed || 0;
    const checkoutClicks = counters.checkout_clicked || 0;
    const completed = counters.conversation_completed || 0;

    const offerPct = sessions > 0 ? Math.min(100, Math.round((offerViews / sessions) * 100)) : 0;
    const checkoutPct = sessions > 0 ? Math.min(100, Math.round((checkoutClicks / sessions) * 100)) : 0;
    const completePct = sessions > 0 ? Math.min(100, Math.round((completed / sessions) * 100)) : 0;

    this.container.innerHTML = `
      <!-- Disclaimer Alert -->
      <div style="background:#1E293B; border-left:4px solid #38BDF8; padding:12px 16px; border-radius:8px; margin-bottom:24px; font-size:13px; color:#CBD5E1;">
        <strong style="color:#FFFFFF;">ℹ️ Métricas Locais de Demonstração:</strong> Estes dados refletem os eventos registrados localmente neste navegador/sessão. Para coletar métricas globais de múltiplos visitantes em produção estática, conecte adaptadores como Google Analytics, Meta Pixel ou webhooks.
      </div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Conversas Iniciadas</div>
          <div class="metric-value">${sessions}</div>
          <div class="metric-sub">Sessões registradas</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Visualizações de Oferta</div>
          <div class="metric-value">${offerViews}</div>
          <div class="metric-sub">${metrics.rates.offerViewRate} dos visitantes</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Cliques no Checkout</div>
          <div class="metric-value" style="color:#4ADE80;">${checkoutClicks}</div>
          <div class="metric-sub">${metrics.rates.checkoutRate} taxa de intenção</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Conversas Concluídas</div>
          <div class="metric-value" style="color:#F59E0B;">${completed}</div>
          <div class="metric-sub">Chegaram ao nó final</div>
        </div>
      </div>

      <!-- Funnel Visualization -->
      <div class="funnel-card">
        <div class="funnel-card-title">Funil de Conversão Conversacional</div>
        <div class="funnel-steps-list">
          
          <div class="funnel-step">
            <span class="step-label">1. Início do Chat</span>
            <div class="step-bar-wrap">
              <div class="step-bar-fill" style="width: ${sessions > 0 ? 100 : 0}%;"></div>
            </div>
            <span class="step-count">${sessions}</span>
          </div>

          <div class="funnel-step">
            <span class="step-label">2. Interações / Botões</span>
            <div class="step-bar-wrap">
              <div class="step-bar-fill" style="width: ${sessions > 0 ? Math.min(100, Math.round((btnClicks / Math.max(sessions, 1)) * 50)) : 0}%;"></div>
            </div>
            <span class="step-count">${btnClicks} cliques</span>
          </div>

          <div class="funnel-step">
            <span class="step-label">3. Veram Ofertas</span>
            <div class="step-bar-wrap">
              <div class="step-bar-fill" style="width: ${offerPct}%; background: linear-gradient(90deg, #F59E0B 0%, #EA580C 100%);"></div>
            </div>
            <span class="step-count">${offerViews} (${offerPct}%)</span>
          </div>

          <div class="funnel-step">
            <span class="step-label">4. Clique Checkout</span>
            <div class="step-bar-wrap">
              <div class="step-bar-fill" style="width: ${checkoutPct}%; background: linear-gradient(90deg, #10B981 0%, #059669 100%);"></div>
            </div>
            <span class="step-count" style="color:#4ADE80;">${checkoutClicks} (${checkoutPct}%)</span>
          </div>

        </div>
      </div>

      <!-- Action Row -->
      <div style="display:flex; justify-content:flex-end; gap:12px;">
        <button type="button" class="btn-secondary" id="btn-refresh-metrics">🔄 Atualizar Indicadores</button>
        <button type="button" class="btn-danger" id="btn-clear-metrics">Limpar Métricas Locais</button>
      </div>
    `;

    const refreshBtn = this.container.querySelector('#btn-refresh-metrics');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.render());
    }

    const clearBtn = this.container.querySelector('#btn-clear-metrics');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Deseja zerar as métricas locais deste produto?')) {
          this.analytics.clearMetrics();
          this.render();
        }
      });
    }
  }
}
