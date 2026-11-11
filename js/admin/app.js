/**
 * Universal Sales Chat Engine - Admin Application Controller
 */

import { StorageService } from '../services/storage.js';
import { AnalyticsService } from '../services/analytics.js';
import { DashboardModule } from './dashboard.js';
import { ProductManagerModule } from './product-manager.js';
import { ConfigEditorModule } from './config-editor.js';
import { OfferManagerModule } from './offer-manager.js';
import { FlowEditorModule } from './flow-editor.js';
import { downloadFile, getProductSlugFromUrl } from '../utils/helpers.js';

class AdminApp {
  constructor() {
    this.currentSlug = getProductSlugFromUrl('cocina-inteligente');
    this.storage = new StorageService(this.currentSlug);
    this.analytics = new AnalyticsService(this.currentSlug);
    this.currentConfig = null;

    this.modules = {};
  }

  async init() {
    this.currentConfig = await this.loadConfig(this.currentSlug);

    this._populateProductSwitcher();
    this._initModules();
    this._setupTabs();
    this._setupBackupTab();
    this._updateChatLink();

    // Default tab
    this.switchTab('overview');
  }

  async loadConfig(slug) {
    const cached = this.storage.loadCustomProduct(slug);
    if (cached) return cached;

    try {
      const res = await fetch(`data/products/${slug}.json`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Could not load static file:', e);
    }

    const fallbackRes = await fetch('data/products/cocina-inteligente.json');
    return await fallbackRes.json();
  }

  async _populateProductSwitcher() {
    const select = document.getElementById('admin-product-select');
    if (!select) return;

    let registry = { products: [] };
    try {
      const res = await fetch('data/registry.json');
      if (res.ok) registry = await res.json();
    } catch (e) {
      // ignore
    }

    const defaultSlugs = (registry.products || []).map(p => ({ slug: p.slug, name: p.name }));
    const customSlugs = (this.storage.listCustomProductSlugs() || []).map(slug => {
      const p = this.storage.loadCustomProduct(slug);
      return { slug, name: p?.name || slug };
    });

    const map = new Map();
    [...defaultSlugs, ...customSlugs].forEach(item => map.set(item.slug, item.name));

    select.innerHTML = Array.from(map.entries()).map(([slug, name]) => `
      <option value="${slug}" ${slug === this.currentSlug ? 'selected' : ''}>${name} (${slug})</option>
    `).join('');

    select.addEventListener('change', async (e) => {
      await this.switchProduct(e.target.value);
    });
  }

  async switchProduct(slug) {
    this.currentSlug = slug;
    this.storage.setNamespace(slug);
    this.analytics.setSlug(slug);
    this.currentConfig = await this.loadConfig(slug);

    this._updateChatLink();

    // Update modules
    if (this.modules.dashboard) this.modules.dashboard.analytics = this.analytics;
    if (this.modules.productManager) {
      this.modules.productManager.currentConfig = this.currentConfig;
      this.modules.productManager.render();
    }
    if (this.modules.configEditor) this.modules.configEditor.setConfig(this.currentConfig);
    if (this.modules.offerManager) this.modules.offerManager.setConfig(this.currentConfig);
    if (this.modules.flowEditor) this.modules.flowEditor.setConfig(this.currentConfig);

    // Refresh active tab
    const activeBtn = document.querySelector('.nav-link.active');
    const tabName = activeBtn ? activeBtn.getAttribute('data-tab') : 'overview';
    this.switchTab(tabName);
  }

  _updateChatLink() {
    const link = document.getElementById('btn-view-live-chat');
    if (link) {
      link.href = `index.html?product=${this.currentSlug}`;
    }
    const titleEl = document.getElementById('admin-active-product-title');
    if (titleEl) {
      titleEl.textContent = this.currentConfig?.name || this.currentSlug;
    }
  }

  _initModules() {
    const overviewContainer = document.getElementById('pane-overview');
    const productsContainer = document.getElementById('pane-products');
    const configContainer = document.getElementById('pane-config');
    const offersContainer = document.getElementById('pane-offers');
    const flowContainer = document.getElementById('pane-flow');

    this.modules.dashboard = new DashboardModule(this.analytics, overviewContainer);

    this.modules.productManager = new ProductManagerModule({
      storageService: this.storage,
      containerElement: productsContainer,
      currentConfig: this.currentConfig,
      onProductChange: (newSlug) => this.switchProduct(newSlug),
      onProductUpdated: () => this._populateProductSwitcher()
    });

    this.modules.configEditor = new ConfigEditorModule({
      storageService: this.storage,
      containerElement: configContainer,
      currentConfig: this.currentConfig,
      onSaveSuccess: (updated) => {
        this.currentConfig = updated;
        this._updateChatLink();
        this._populateProductSwitcher();
      }
    });

    this.modules.offerManager = new OfferManagerModule({
      storageService: this.storage,
      containerElement: offersContainer,
      currentConfig: this.currentConfig,
      onSaveSuccess: (updated) => {
        this.currentConfig = updated;
      }
    });

    this.modules.flowEditor = new FlowEditorModule({
      storageService: this.storage,
      containerElement: flowContainer,
      currentConfig: this.currentConfig,
      onSaveSuccess: (updated) => {
        this.currentConfig = updated;
      }
    });
  }

  _setupTabs() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const tab = link.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const targetPane = document.getElementById(`pane-${tabName}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Trigger tab specific renderers
    if (tabName === 'overview') this.modules.dashboard.render();
    if (tabName === 'products') this.modules.productManager.render();
    if (tabName === 'config') this.modules.configEditor.render();
    if (tabName === 'offers') this.modules.offerManager.render();
    if (tabName === 'flow') this.modules.flowEditor.render();
  }

  _setupBackupTab() {
    const exportBtn = document.getElementById('btn-export-backup');
    const importInput = document.getElementById('input-import-file');
    const importBtn = document.getElementById('btn-trigger-import');
    const resetBtn = document.getElementById('btn-factory-reset');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const backupJson = this.storage.exportBackup();
        const filename = `backup-universal-sales-engine-${new Date().toISOString().substring(0, 10)}.json`;
        downloadFile(filename, backupJson, 'application/json');
      });
    }

    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          const result = this.storage.importBackup(content);
          if (result.success) {
            alert(`Backup importado com sucesso (${result.count} registros carregados)!`);
            window.location.reload();
          } else {
            alert(`Erro na importação: ${result.error}`);
          }
        };
        reader.readAsText(file);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Atenção: isto apagará todas as configurações customizadas salvas no LocalStorage e restaurará os padrões estáticos. Continuar?')) {
          this.storage.resetAll();
          alert('Armazenamento limpo. A página será recarregada.');
          window.location.reload();
        }
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new AdminApp().init());
} else {
  new AdminApp().init();
}
