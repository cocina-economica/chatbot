/**
 * Universal Sales Chat Engine - Offer Manager Module
 */

import { generateId, deepClone, buildShareUrl } from '../utils/helpers.js';

export class OfferManagerModule {
  constructor({ storageService, containerElement, currentConfig, onSaveSuccess }) {
    this.storage = storageService;
    this.container = containerElement;
    this.config = currentConfig;
    this.onSaveSuccess = onSaveSuccess;
  }

  setConfig(newConfig) {
    this.config = newConfig;
    this.render();
  }

  render() {
    if (!this.container) return;
    const offers = this.config.offers || [];

    const offersHtml = offers.map((offer, idx) => {
      const shareConvUrl = buildShareUrl({ product: this.config.slug, offer: offer.id });
      const shareDirectUrl = buildShareUrl({ product: this.config.slug, offer: offer.id, direct: true });
      const shareSingleUrl = buildShareUrl({ product: this.config.slug, offer: offer.id, single: true });

      return `
      <div class="admin-card" style="border-left:4px solid #F59E0B;" data-offer-id="${offer.id}">
        <div class="admin-card-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#F59E0B; color:#000; font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px;">#${idx + 1}</span>
            <h4 style="font-size:15px; font-weight:800; color:#FFFFFF;">${offer.name || 'Nova Oferta'}</h4>
          </div>
          <button type="button" class="btn-danger btn-delete-offer" data-id="${offer.id}" style="padding:4px 8px; font-size:11px;">Remover</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">ID da Oferta</label>
            <input type="text" class="form-input offer-field-id" value="${offer.id || ''}" readonly style="background:#0F172A; color:#94A3B8; font-family:monospace;">
          </div>
          <div class="form-group">
            <label class="form-label">Nome do Pacote</label>
            <input type="text" class="form-input offer-field-name" value="${offer.name || ''}" placeholder="Ex: Pacote Completo PRO">
          </div>
          <div class="form-group">
            <label class="form-label">Preço</label>
            <input type="number" class="form-input offer-field-price" value="${offer.price || 0}" step="any">
          </div>
          <div class="form-group">
            <label class="form-label">Moeda</label>
            <input type="text" class="form-input offer-field-curr" value="${offer.currency || this.config.currency || 'USD'}">
          </div>
          <div class="form-group">
            <label class="form-label">Selo de Destaque (Badge)</label>
            <input type="text" class="form-input offer-field-badge" value="${offer.badge || ''}" placeholder="Ex: Mais Elegido / Mais Vendido">
          </div>
          <div class="form-group full-width">
            <label class="form-label">URL Direta de Checkout (Hotmart / Gateway)</label>
            <input type="url" class="form-input offer-field-url" value="${offer.checkoutUrl || ''}" placeholder="https://pay.hotmart.com/SEU-PRODUTO">
          </div>
          <div class="form-group full-width">
            <label class="form-label">Descrição Curta</label>
            <input type="text" class="form-input offer-field-desc" value="${offer.description || ''}">
          </div>
          <div class="form-group full-width">
            <label class="form-label">Benefícios Inclusos (Um por linha)</label>
            <textarea class="form-textarea offer-field-features" rows="3">${(offer.features || []).join('\n')}</textarea>
          </div>

          <div class="form-group full-width" style="background:#0F172A; padding:12px; border-radius:8px; border:1px solid #334155; margin-top:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label" style="color:#38BDF8; font-weight:700; margin:0;">🔗 Link Único Desta Oferta (Conversacional)</label>
              <span style="font-size:11px; color:#94A3B8;">Abre o chat normal e destaca este pacote</span>
            </div>
            <div style="display:flex; gap:8px;">
              <input type="text" class="form-input offer-share-url-conv" value="${shareConvUrl}" readonly style="background:#1E293B; color:#CBD5E1; font-family:monospace; font-size:11px;">
              <button type="button" class="btn-primary btn-copy-share-url" data-url="${shareConvUrl}" style="white-space:nowrap; padding:6px 14px; font-size:12px;">📋 Copiar</button>
            </div>
          </div>

          <div class="form-group full-width" style="background:#0F172A; padding:12px; border-radius:8px; border:1px solid #334155; margin-top:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label" style="color:#A855F7; font-weight:700; margin:0;">🎯 Link Único Exclusivo (Apenas Esta Oferta)</label>
              <span style="font-size:11px; color:#94A3B8;">Oculta os outros pacotes, foco 100% nesta oferta</span>
            </div>
            <div style="display:flex; gap:8px;">
              <input type="text" class="form-input offer-share-url-single" value="${shareSingleUrl}" readonly style="background:#1E293B; color:#CBD5E1; font-family:monospace; font-size:11px;">
              <button type="button" class="btn-primary btn-copy-share-url" data-url="${shareSingleUrl}" style="white-space:nowrap; padding:6px 14px; font-size:12px; background:#A855F7;">🎯 Copiar Exclusivo</button>
            </div>
          </div>

          <div class="form-group full-width" style="background:#0F172A; padding:12px; border-radius:8px; border:1px solid #334155; margin-top:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label" style="color:#F59E0B; font-weight:700; margin:0;">⚡ Link Direto (Pitch & Oferta Imediata)</label>
              <span style="font-size:11px; color:#94A3B8;">Pula direto para a oferta sem diálogo prévio</span>
            </div>
            <div style="display:flex; gap:8px;">
              <input type="text" class="form-input offer-share-url-direct" value="${shareDirectUrl}" readonly style="background:#1E293B; color:#CBD5E1; font-family:monospace; font-size:11px;">
              <button type="button" class="btn-primary btn-copy-share-url" data-url="${shareDirectUrl}" style="white-space:nowrap; padding:6px 14px; font-size:12px; background:#F59E0B; color:#000;">⚡ Copiar Direto</button>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
        <div>
          <h3 style="font-size:18px; font-weight:800; color:#FFFFFF;">Gerenciamento de Ofertas e Preços</h3>
          <p style="font-size:12px; color:#94A3B8;">Configure pacotes de venda, preços transparentes e links de redirecionamento para checkout seguro.</p>
        </div>
        <button type="button" class="btn-primary" id="btn-add-offer">+ Adicionar Novo Pacote</button>
      </div>

      <div id="offers-list-container">
        ${offersHtml.length > 0 ? offersHtml : '<p style="color:#94A3B8; text-align:center; padding:40px;">Nenhuma oferta cadastrada para este produto.</p>'}
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
        <button type="button" class="btn-primary" id="btn-save-all-offers" style="padding:12px 28px; font-size:15px;">💾 Salvar Todas as Ofertas</button>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const addBtn = this.container.querySelector('#btn-add-offer');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.config.offers = this.config.offers || [];
        this.config.offers.push({
          id: `tier_${generateId()}`,
          name: 'Novo Pacote',
          price: 99,
          currency: this.config.currency || 'USD',
          badge: '',
          description: '',
          features: ['Benefício 1', 'Benefício 2'],
          checkoutUrl: 'https://pay.hotmart.com/DEMO-LINK'
        });
        this.render();
      });
    }

    this.container.querySelectorAll('.btn-delete-offer').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Deseja remover esta oferta?')) {
          this.config.offers = (this.config.offers || []).filter(o => o.id !== id);
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.btn-copy-share-url').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (!url) return;
        const originalText = btn.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            btn.textContent = '✅ Copiado!';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
          }).catch(() => {
            prompt('Copie o link da oferta abaixo:', url);
          });
        } else {
          prompt('Copie o link da oferta abaixo:', url);
        }
      });
    });

    const saveBtn = this.container.querySelector('#btn-save-all-offers');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const cards = this.container.querySelectorAll('[data-offer-id]');
        const updatedOffers = [];

        cards.forEach(card => {
          const id = card.getAttribute('data-offer-id');
          const name = card.querySelector('.offer-field-name').value.trim();
          const price = parseFloat(card.querySelector('.offer-field-price').value) || 0;
          const currency = card.querySelector('.offer-field-curr').value.trim();
          const badge = card.querySelector('.offer-field-badge').value.trim();
          const checkoutUrl = card.querySelector('.offer-field-url').value.trim();
          const description = card.querySelector('.offer-field-desc').value.trim();
          const rawFeatures = card.querySelector('.offer-field-features').value;
          const features = rawFeatures.split('\n').map(f => f.trim()).filter(f => f.length > 0);

          updatedOffers.push({
            id,
            name,
            price,
            currency,
            badge,
            checkoutUrl,
            description,
            features
          });
        });

        this.config.offers = updatedOffers;
        this.storage.saveCustomProduct(this.config);
        alert('Ofertas salvas com sucesso!');
        if (this.onSaveSuccess) this.onSaveSuccess(this.config);
      });
    }
  }
}
