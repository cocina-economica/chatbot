/**
 * Universal Sales Chat Engine - Checkout Service & Adapters
 * Secure external checkout URL builder, sanitizer, and executor.
 */

import { sanitizeUrl } from '../utils/helpers.js';

export class CheckoutService {
  constructor(config = {}, analyticsService = null) {
    this.config = config || {};
    this.analytics = analyticsService;
    this.adapterType = config.adapter || 'url';
  }

  /**
   * Builds an enriched checkout URL according to the adapter
   * @param {string} rawUrl 
   * @param {Record<string, string>} extraParams 
   * @returns {string|null}
   */
  buildCheckoutUrl(rawUrl, extraParams = {}) {
    const cleanUrl = sanitizeUrl(rawUrl);
    if (!cleanUrl) return null;

    try {
      const url = new URL(cleanUrl);

      // Default tracking parameters
      const defaultParam = this.config.defaultTrackingParam || 'sck';
      const defaultValue = this.config.defaultTrackingValue || 'usc_chat';

      if (!url.searchParams.has(defaultParam)) {
        url.searchParams.set(defaultParam, defaultValue);
      }

      // Add extra custom tracking
      for (const [key, value] of Object.entries(extraParams)) {
        if (value && typeof value === 'string') {
          url.searchParams.set(key, value);
        }
      }

      return url.toString();
    } catch (e) {
      return cleanUrl;
    }
  }

  /**
   * Executes redirect to checkout securely in a new tab
   * @param {string} checkoutUrl 
   * @param {any} offerData 
   * @returns {boolean}
   */
  redirectToCheckout(checkoutUrl, offerData = {}) {
    const finalUrl = this.buildCheckoutUrl(checkoutUrl, {
      offer: offerData.id || '',
      currency: offerData.currency || ''
    });

    if (!finalUrl) {
      console.error('[CheckoutService] Invalid checkout URL:', checkoutUrl);
      if (typeof alert !== 'undefined') {
        alert('Enlace de checkout no configurado o inválido.');
      }
      return false;
    }

    // Log analytics event
    if (this.analytics) {
      this.analytics.track('checkout_clicked', {
        offerId: offerData.id || 'unknown',
        offerName: offerData.name || '',
        price: offerData.price || 0,
        currency: offerData.currency || '',
        checkoutUrl: finalUrl
      });
    }

    // Safe new window open
    const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    } else {
      // Fallback if popup blocked
      window.location.href = finalUrl;
    }

    return true;
  }
}
