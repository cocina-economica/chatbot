/**
 * Universal Sales Chat Engine - Storage Service
 * Namespaced LocalStorage management per product slug with export/import and fallback protection.
 */

import { deepClone } from '../utils/helpers.js';
import { validateProductConfig } from '../utils/validation.js';

const STORAGE_PREFIX = 'usc_v1_';

export class StorageService {
  constructor(namespace = 'global') {
    this.namespace = namespace;
  }

  setNamespace(namespace) {
    this.namespace = namespace;
  }

  _getKey(key) {
    return `${STORAGE_PREFIX}${this.namespace}_${key}`;
  }

  _safeGet(key, fallback = null) {
    try {
      const item = localStorage.getItem(this._getKey(key));
      if (!item) return fallback;
      return JSON.parse(item);
    } catch (e) {
      console.warn(`[StorageService] Failed to get ${key}:`, e);
      return fallback;
    }
  }

  _safeSet(key, value) {
    try {
      localStorage.setItem(this._getKey(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[StorageService] Failed to set ${key}:`, e);
      return false;
    }
  }

  _safeRemove(key) {
    try {
      localStorage.removeItem(this._getKey(key));
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- Chat State & History ---

  saveChatHistory(history) {
    return this._safeSet('chat_history', history);
  }

  loadChatHistory() {
    return this._safeGet('chat_history', []);
  }

  clearChatHistory() {
    return this._safeRemove('chat_history');
  }

  saveUserState(state) {
    return this._safeSet('user_state', state);
  }

  loadUserState() {
    return this._safeGet('user_state', {});
  }

  clearUserState() {
    return this._safeRemove('user_state');
  }

  // --- Product Configurations ---

  saveCustomProduct(productConfig) {
    const slug = productConfig.slug;
    if (!slug) return false;

    // Save product data
    const key = `product_data_${slug}`;
    const success = this._safeSet(key, productConfig);

    if (success) {
      // Update registered slugs list
      const customList = this.listCustomProductSlugs();
      if (!customList.includes(slug)) {
        customList.push(slug);
        this._safeSet('custom_product_slugs', customList);
      }
    }
    return success;
  }

  loadCustomProduct(slug) {
    return this._safeGet(`product_data_${slug}`, null);
  }

  deleteCustomProduct(slug) {
    this._safeRemove(`product_data_${slug}`);
    const customList = this.listCustomProductSlugs().filter(s => s !== slug);
    this._safeSet('custom_product_slugs', customList);
  }

  listCustomProductSlugs() {
    return this._safeGet('custom_product_slugs', []);
  }

  // --- Backup, Export & Import ---

  exportBackup() {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      products: {},
      analytics: {}
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          backup.products[key] = JSON.parse(localStorage.getItem(key));
        }
      }
    } catch (e) {
      console.error('[StorageService] Error during backup export:', e);
    }

    return JSON.stringify(backup, null, 2);
  }

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Arquivo JSON inválido.' };
      }

      if (data.products && typeof data.products === 'object') {
        for (const [key, value] of Object.entries(data.products)) {
          if (key.startsWith(STORAGE_PREFIX)) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }
        return { success: true, count: Object.keys(data.products).length };
      }

      // Check if it's a single product JSON export
      if (data.slug && data.flows) {
        const check = validateProductConfig(data);
        if (!check.valid) {
          return { success: false, error: `Configuração do produto inválida: ${check.errors.join(', ')}` };
        }
        this.saveCustomProduct(data);
        return { success: true, count: 1, slug: data.slug };
      }

      return { success: false, error: 'Estrutura de dados não reconhecida no arquivo JSON.' };
    } catch (e) {
      return { success: false, error: `Erro ao processar JSON: ${e.message}` };
    }
  }

  resetAll() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}
