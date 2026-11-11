/**
 * Universal Sales Chat Engine - Analytics Service
 * Local event logger and funnel calculator per product slug.
 * All metrics are strictly client-side.
 */

const ANALYTICS_PREFIX = 'usc_analytics_';

export class AnalyticsService {
  constructor(slug = 'default') {
    this.slug = slug;
    this.sessionId = this._getOrCreateSessionId();
  }

  setSlug(slug) {
    this.slug = slug;
  }

  _getOrCreateSessionId() {
    let sId = sessionStorage.getItem('usc_session_id');
    if (!sId) {
      sId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem('usc_session_id', sId);
    }
    return sId;
  }

  _getKey() {
    return `${ANALYTICS_PREFIX}${this.slug}`;
  }

  _getData() {
    try {
      const raw = localStorage.getItem(this._getKey());
      if (!raw) {
        return {
          slug: this.slug,
          totalSessions: 0,
          events: [],
          counters: {
            chat_started: 0,
            message_viewed: 0,
            button_clicked: 0,
            product_viewed: 0,
            offer_viewed: 0,
            checkout_clicked: 0,
            conversation_completed: 0
          },
          nodeViews: {},
          buttonClicks: {},
          checkoutOffers: {}
        };
      }
      return JSON.parse(raw);
    } catch (e) {
      return { totalSessions: 0, events: [], counters: {} };
    }
  }

  _saveData(data) {
    try {
      // Keep only last 200 raw events to conserve localStorage
      if (data.events && data.events.length > 200) {
        data.events = data.events.slice(-200);
      }
      localStorage.setItem(this._getKey(), JSON.stringify(data));
    } catch (e) {
      console.warn('[AnalyticsService] Storage quota reached:', e);
    }
  }

  track(eventType, payload = {}) {
    const data = this._getData();
    const timestamp = new Date().toISOString();

    // Increment counter
    if (data.counters[eventType] !== undefined) {
      data.counters[eventType] += 1;
    } else {
      data.counters[eventType] = 1;
    }

    if (eventType === 'chat_started') {
      data.totalSessions += 1;
    }

    if (eventType === 'message_viewed' && payload.nodeId) {
      data.nodeViews[payload.nodeId] = (data.nodeViews[payload.nodeId] || 0) + 1;
    }

    if (eventType === 'button_clicked' && payload.label) {
      data.buttonClicks[payload.label] = (data.buttonClicks[payload.label] || 0) + 1;
    }

    if (eventType === 'checkout_clicked' && payload.offerId) {
      data.checkoutOffers[payload.offerId] = (data.checkoutOffers[payload.offerId] || 0) + 1;
    }

    data.events.push({
      type: eventType,
      sessionId: this.sessionId,
      payload,
      timestamp
    });

    this._saveData(data);
  }

  getMetrics() {
    const data = this._getData();
    const sessions = data.counters.chat_started || data.totalSessions || 0;
    const offerViews = data.counters.offer_viewed || 0;
    const checkoutClicks = data.counters.checkout_clicked || 0;
    const completed = data.counters.conversation_completed || 0;

    const offerViewRate = sessions > 0 ? ((offerViewRateCalc(offerViews, sessions)) * 100).toFixed(1) : 0;
    const checkoutRate = sessions > 0 ? ((checkoutClicks / sessions) * 100).toFixed(1) : 0;
    const checkoutToOfferRate = offerViews > 0 ? ((checkoutClicks / offerViews) * 100).toFixed(1) : 0;

    return {
      totalSessions: sessions,
      counters: data.counters,
      nodeViews: data.nodeViews || {},
      buttonClicks: data.buttonClicks || {},
      checkoutOffers: data.checkoutOffers || {},
      rates: {
        offerViewRate: `${offerViewRate}%`,
        checkoutRate: `${checkoutRate}%`,
        checkoutToOfferRate: `${checkoutToOfferRate}%`
      },
      lastUpdated: new Date().toLocaleTimeString()
    };
  }

  clearMetrics() {
    localStorage.removeItem(this._getKey());
  }
}

function offerViewRateCalc(views, total) {
  return Math.min(1, views / total);
}
