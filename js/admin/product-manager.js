/**
 * Universal Sales Chat Engine - Product Manager Module
 * Manages multiple independent digital products, duplication, creation, and deletion.
 */

import { generateId, deepClone } from '../utils/helpers.js';

export class ProductManagerModule {
  constructor({
    storageService,
    containerElement,
    currentConfig,
    onProductChange,
    onProductUpdated
  }) {
    this.storage = storageService;
    this.container = containerElement;
    this.currentConfig = currentConfig;
    this.onProductChange = onProductChange;
    this.onProductUpdated = onProductUpdated;
  }

  async render() {
    if (!this.container) return;

    let registry = { products: [] };
    try {
      const res = await fetch('data/registry.json');
      if (res.ok) registry = await res.json();
    } catch (e) {
      console.warn('Failed to fetch registry.json:', e);
    }

    const defaultSlugs = (registry.products || []).map(p => p.slug);
    const customSlugs = this.storage.listCustomProductSlugs() || [];
    const allSlugs = Array.from(new Set([...defaultSlugs, ...customSlugs]));

    const productsData = [];
    for (const slug of allSlugs) {
      let data = this.storage.loadCustomProduct(slug);
      if (!data) {
        try {
          const res = await fetch(`data/products/${slug}.json`);
          if (res.ok) data = await res.json();
        } catch (e) {
          // ignore
        }
      }
      if (data) {
        productsData.push({
          slug,
          name: data.name || slug,
          language: data.language || 'es-MX',
          currency: data.currency || 'USD',
          nodeCount: Object.keys(data.flows || {}).length,
          offersCount: (data.offers || []).length,
          isCustom: customSlugs.includes(slug),
          isActive: slug === this.currentConfig.slug
        });
      }
    }

    const rowsHtml = productsData.map(p => `
      <tr style="border-bottom:1px solid #334155; ${p.isActive ? 'background:rgba(37,99,235,0.08);' : ''}">
        <td style="padding:14px 12px; font-weight:700; color:#FFFFFF;">
          ${p.name}
          ${p.isActive ? '<span style="background:#2563EB; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; margin-left:6px;">ATIVO</span>' : ''}
          <div style="font-size:11px; color:#94A3B8; font-family:monospace; margin-top:2px;">slug: ${p.slug}</div>
        </td>
        <td style="padding:14px 12px; color:#CBD5E1;">${p.language}</td>
        <td style="padding:14px 12px; color:#CBD5E1;">${p.currency}</td>
        <td style="padding:14px 12px; color:#CBD5E1;">${p.nodeCount} nós</td>
        <td style="padding:14px 12px; color:#CBD5E1;">${p.offersCount} pacotes</td>
        <td style="padding:14px 12px; text-align:right;">
          <div style="display:inline-flex; gap:6px;">
            ${!p.isActive ? `<button type="button" class="btn-secondary btn-switch-prod" data-slug="${p.slug}" style="padding:6px 10px; font-size:12px;">Selecionar</button>` : ''}
            <a href="index.html?product=${p.slug}" target="_blank" class="btn-secondary" style="padding:6px 10px; font-size:12px; text-decoration:none;">💬 Abrir Chat</a>
            <button type="button" class="btn-secondary btn-duplicate-prod" data-slug="${p.slug}" style="padding:6px 10px; font-size:12px;">Duplicar</button>
            ${p.isCustom ? `<button type="button" class="btn-danger btn-delete-prod" data-slug="${p.slug}" style="padding:6px 10px; font-size:12px;">Excluir</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    this.container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3 class="admin-card-title">Gerenciador de Produtos & Campanhas</h3>
          <button type="button" class="btn-primary" id="btn-show-create-modal">+ Criar Novo Produto</button>
        </div>

        <p style="font-size:13px; color:#94A3B8; margin-bottom:18px;">
          O motor universal executa qualquer produto configurado. Você pode cadastrar múltiplos produtos com suas próprias mensagens, idiomas e ofertas sem alterar uma única linha de código do núcleo.
        </p>

        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
            <thead>
              <tr style="border-bottom:2px solid #475569; color:#94A3B8; text-transform:uppercase; font-size:11px;">
                <th style="padding:10px 12px;">Produto</th>
                <th style="padding:10px 12px;">Idioma</th>
                <th style="padding:10px 12px;">Moeda</th>
                <th style="padding:10px 12px;">Estrutura</th>
                <th style="padding:10px 12px;">Ofertas</th>
                <th style="padding:10px 12px; text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Criação -->
      <div id="create-product-modal" class="admin-modal-backdrop" style="display:none;">
        <div class="admin-modal">
          <div class="modal-header">
            <h3 class="modal-title">Novo Produto Digital</h3>
            <button type="button" class="btn-modal-close" id="btn-close-create-modal">&times;</button>
          </div>
          <form id="create-product-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nome do Produto</label>
                <input type="text" id="new-prod-name" class="form-input" placeholder="Ex: Mestre do Churrasco" required>
              </div>

              <div class="form-group">
                <label class="form-label">Slug Único (URL)</label>
                <input type="text" id="new-prod-slug" class="form-input" placeholder="ex: mestre-churrasco" pattern="[a-z0-9-_]+" required>
                <span class="form-help">Usado na URL: ?product=seu-slug</span>
              </div>

              <div class="form-group">
                <label class="form-label">Descrição Resumida</label>
                <input type="text" id="new-prod-desc" class="form-input" placeholder="Aprenda as melhores técnicas de defumação e cortes" required>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Idioma</label>
                  <select id="new-prod-lang" class="form-select">
                    <option value="es-MX">Español (México)</option>
                    <option value="pt-BR" selected>Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Moeda</label>
                  <select id="new-prod-curr" class="form-select">
                    <option value="BRL" selected>BRL (R$)</option>
                    <option value="MXN">MXN ($)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="btn-cancel-create">Cancelar</button>
              <button type="submit" class="btn-primary">Criar e Inicializar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this._bindEvents(productsData);
  }

  _bindEvents(productsData) {
    // Switch active product
    this.container.querySelectorAll('.btn-switch-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-slug');
        if (this.onProductChange) this.onProductChange(slug);
      });
    });

    // Duplicate product
    this.container.querySelectorAll('.btn-duplicate-prod').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slug = btn.getAttribute('data-slug');
        const original = this.storage.loadCustomProduct(slug) || this.currentConfig;
        const newSlug = `${slug}-copia-${Date.now().toString(36).substring(3, 7)}`;
        const clone = deepClone(original);
        clone.id = `prod_${generateId()}`;
        clone.slug = newSlug;
        clone.name = `${original.name} (Cópia)`;

        this.storage.saveCustomProduct(clone);
        alert(`Produto duplicado com sucesso com slug "${newSlug}"!`);
        this.render();
        if (this.onProductChange) this.onProductChange(newSlug);
      });
    });

    // Delete custom product
    this.container.querySelectorAll('.btn-delete-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-slug');
        if (confirm(`Tem certeza que deseja excluir o produto customizado "${slug}"?`)) {
          this.storage.deleteCustomProduct(slug);
          alert('Produto excluído.');
          this.render();
          if (slug === this.currentConfig.slug) {
            if (this.onProductChange) this.onProductChange('cocina-inteligente');
          }
        }
      });
    });

    // Modal controls
    const modal = this.container.querySelector('#create-product-modal');
    const showBtn = this.container.querySelector('#btn-show-create-modal');
    const closeBtn = this.container.querySelector('#btn-close-create-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-create');
    const form = this.container.querySelector('#create-product-form');

    if (showBtn) showBtn.addEventListener('click', () => modal.style.display = 'flex');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.container.querySelector('#new-prod-name').value.trim();
        const slug = this.container.querySelector('#new-prod-slug').value.trim().toLowerCase();
        const desc = this.container.querySelector('#new-prod-desc').value.trim();
        const lang = this.container.querySelector('#new-prod-lang').value;
        const curr = this.container.querySelector('#new-prod-curr').value;

        const newConfig = {
          id: `prod_${generateId()}`,
          slug,
          name,
          description: desc,
          language: lang,
          currency: curr,
          currencySymbol: curr === 'BRL' ? 'R$' : '$',
          timezone: 'America/Sao_Paulo',
          active: true,
          branding: { name, tagline: desc, logo: 'assets/images/logo.svg' },
          theme: {
            primaryColor: '#2563EB',
            primaryHover: '#1D4ED8',
            secondaryColor: '#10B981',
            accentColor: '#F59E0B',
            bgBody: '#F8FAFC',
            bgChat: '#FFFFFF',
            botBubbleBg: '#F1F5F9',
            botBubbleText: '#0F172A',
            userBubbleBg: '#2563EB',
            userBubbleText: '#FFFFFF',
            borderRadius: '16px'
          },
          avatar: {
            name: 'Atendente',
            role: 'Consultor',
            status: 'Online agora',
            image: 'assets/images/default-avatar.svg'
          },
          welcome_message: `Olá! Bem-vindo ao atendimento de **${name}**.`,
          flow_entry: 'node_1',
          settings: {
            enableTypingIndicator: true,
            defaultTypingDelayMs: 600,
            allowFreeTextInput: true,
            persistHistory: true,
            fallbackResponse: 'Para melhor te atender, por favor selecione uma das opções abaixo:'
          },
          checkout: { adapter: 'url', defaultTrackingParam: 'sck', defaultTrackingValue: 'chat_sales' },
          offers: [
            {
              id: 'tier_1',
              name: 'Pacote Principal',
              price: 97,
              currency: curr,
              features: ['Acesso Imediato', 'Garantia de 7 dias'],
              checkoutUrl: 'https://pay.hotmart.com/DEMO-LINK?off=principal'
            }
          ],
          flows: {
            'node_1': {
              id: 'node_1',
              type: 'message',
              content: `Olá! Seja bem-vindo ao **${name}**!`,
              next: 'node_2'
            },
            'node_2': {
              id: 'node_2',
              type: 'buttons',
              content: 'Como posso te ajudar hoje?',
              options: [
                { label: '💰 Ver Pacotes e Preços', next: 'node_offers' },
                { label: '❓ Mais Informações', next: 'node_1' }
              ]
            },
            'node_offers': {
              id: 'node_offers',
              type: 'offer',
              content: 'Confira nossas opções de compra:',
              next: 'node_end'
            },
            'node_end': {
              id: 'node_end',
              type: 'end',
              content: 'Muito obrigado pelo contato! Conte conosco.',
              allowRestart: true
            }
          }
        };

        this.storage.saveCustomProduct(newConfig);
        modal.style.display = 'none';
        alert(`Produto "${name}" criado com sucesso!`);
        this.render();
        if (this.onProductChange) this.onProductChange(slug);
      });
    }
  }
}
