/**
 * Universal Sales Chat Engine - Main Application Bootstrap
 * Resolves product from URL slug, binds modular services, and launches conversation.
 */

import { getUrlParam } from './utils/helpers.js';
import { resolveAuthorizedFlow, FLOW_CONFIG } from './config/flow-config.js';
import { StorageService } from './services/storage.js';
import { AnalyticsService } from './services/analytics.js';
import { CheckoutService } from './services/checkout.js';
import { SoundService } from './services/sound.js';
import { VoiceRecorderService } from './services/voice-recorder.js';
import { ChatRenderer } from './chat/renderer.js';
import { NavigationManager } from './chat/navigation.js';
import { InteractionManager } from './chat/interactions.js';
import { ChatEngine } from './chat/engine.js';
import { t } from './i18n.js';

class App {
  constructor() {
    // Resolve authorized product flow using centralized security policy
    const flowAuth = resolveAuthorizedFlow();
    this.productSlug = flowAuth.productSlug;
    this.authorizedEntryNode = flowAuth.entryNode;
    this.isPreviewMode = flowAuth.isPreviewMode;

    this.storage = new StorageService(this.productSlug);
    this.analytics = new AnalyticsService(this.productSlug);
    this.sound = new SoundService();
    this.voiceRecorder = new VoiceRecorderService({ maxDurationSeconds: 60 });
    this.engine = null;
  }

  async init() {
    try {
      const config = await this.loadProductConfig(this.productSlug);
      this.setupHeader(config);

      const messagesContainer = document.getElementById('chat-messages');
      const liveAnnouncer = document.getElementById('chat-announcer');
      const inputForm = document.getElementById('chat-input-form');
      const textInput = document.getElementById('chat-text-input');
      const sendButton = document.getElementById('chat-send-btn');
      const micButton = document.getElementById('chat-mic-btn');
      const recordingPanel = document.getElementById('chat-recording-panel');
      const permissionModal = document.getElementById('mic-permission-modal');
      const dockContainer = document.getElementById('chat-dock');
      const restartHeaderBtn = document.getElementById('header-restart-btn');
      const soundHeaderBtn = document.getElementById('header-sound-btn');
      const fullscreenHeaderBtn = document.getElementById('header-fullscreen-btn');
      const avatarImg = document.getElementById('header-avatar');

      const renderer = new ChatRenderer(messagesContainer, liveAnnouncer);
      const navigation = new NavigationManager(this.storage);
      const checkoutService = new CheckoutService(config.checkout, this.analytics);

      // --- Process URL Campaign Parameters (Targeted Offers, Custom Entry, Direct Flow) ---
      const targetOfferId = getUrlParam('offer') || getUrlParam('off');
      const isDirectMode = getUrlParam('direct') === 'true' || getUrlParam('direto') === 'true';
      const isSingleMode = getUrlParam('single') === 'true' || getUrlParam('only') === 'true';
      const disableAutoFs = getUrlParam('nofs') === 'true';

      // Validate that targetOfferId actually belongs to this authorized product
      const validOffer = (config.offers || []).find(o => o.id === targetOfferId);

      if (validOffer) {
        navigation.updateUserState('targetOfferId', validOffer.id);
      }
      if (isSingleMode && validOffer) {
        navigation.updateUserState('isSingleMode', true);
      }

      if (isDirectMode && validOffer) {
        // Direct mode: jump directly to the authorized offer node
        const flows = config.flows || {};
        const offerNode = Object.values(flows).find(n => n.type === 'offer');
        if (offerNode) {
          config.flow_entry = offerNode.id;
        }
      } else if (this.isPreviewMode && this.authorizedEntryNode && config.flows && config.flows[this.authorizedEntryNode]) {
        // Authorized developer preview mode only
        config.flow_entry = this.authorizedEntryNode;
      } else {
        // Production: Strictly locked to the centralized default entry node
        config.flow_entry = FLOW_CONFIG.PUBLIC_DEFAULT_ENTRY;
      }

      const interactions = new InteractionManager({
        inputForm,
        textInput,
        sendButton,
        dockContainer,
        micButton,
        recordingPanel,
        voiceRecorderService: this.voiceRecorder,
        permissionModal
      });

      this.engine = new ChatEngine({
        config,
        renderer,
        navigation,
        interactions,
        analytics: this.analytics,
        checkoutService,
        soundService: this.sound
      });

      if (restartHeaderBtn) {
        restartHeaderBtn.addEventListener('click', () => {
          const confirmMsg = t('chat.restartConfirm', config.language || 'es-MX');
          if (confirm(confirmMsg)) {
            this.engine.restart();
          }
        });
      }

      if (soundHeaderBtn) {
        const updateSoundIcon = () => {
          soundHeaderBtn.textContent = this.sound.isEnabled() ? '🔔' : '🔕';
          soundHeaderBtn.title = this.sound.isEnabled() ? 'Notificaciones con sonido: Activadas' : 'Notificaciones con sonido: Desactivadas';
        };
        updateSoundIcon();
        soundHeaderBtn.addEventListener('click', () => {
          this.sound.toggle();
          updateSoundIcon();
        });
      }

      if (fullscreenHeaderBtn) {
        const updateFullscreenIcon = () => {
          const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
          fullscreenHeaderBtn.textContent = isFs ? '🗗' : '⛶';
          fullscreenHeaderBtn.title = isFs ? 'Salir de pantalla completa' : 'Pantalla completa sin distracciones';
        };

        fullscreenHeaderBtn.addEventListener('click', async () => {
          try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
              if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
              } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
              }
            } else {
              if (document.exitFullscreen) {
                await document.exitFullscreen();
              } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
              }
            }
          } catch (err) {
            console.warn('[App] Native fullscreen toggle not permitted or failed:', err);
          }
          updateFullscreenIcon();
        });

        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
      }

      // Distraction-free: seamlessly enter native full screen on first visitor gesture (click / tap)
      if (!disableAutoFs) {
        const enterFullscreenOnFirstGesture = async () => {
          try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
              if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
              } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
              }
            }
          } catch (e) {
            // Silently ignore if blocked by browser policy (e.g. iframe restrictions or iOS Safari)
          }
        };

        window.addEventListener('click', enterFullscreenOnFirstGesture, { once: true, passive: true });
        window.addEventListener('touchstart', enterFullscreenOnFirstGesture, { once: true, passive: true });
      }

      await this.engine.start(false);
    } catch (err) {
      console.error('[App] Failed to initialize sales chat:', err);
      const container = document.getElementById('chat-messages');
      if (container) {
        container.innerHTML = `
          <div class="chat-bubble-row bot-row">
            <div class="chat-bubble bot-bubble">
              <p><strong>Error al cargar el producto.</strong></p>
              <p>Verifica la conexión a los archivos de configuración.</p>
            </div>
          </div>
        `;
      }
    }
  }

  async loadProductConfig(slug) {
    // In production, strictly load the authoritative static JSON file from repository
    // to prevent local browser draft tampering from hijacking the public experience
    if (!this.isPreviewMode) {
      try {
        const res = await fetch(`data/products/${slug}.json`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn(`[App] Failed to load data/products/${slug}.json:`, e);
      }
    } else {
      // In dev / preview mode, allow custom draft from localStorage
      const cached = this.storage.loadCustomProduct(slug);
      if (cached) return cached;

      try {
        const res = await fetch(`data/products/${slug}.json`);
        if (res.ok) return await res.json();
      } catch (e) {}
    }

    // Fallback to default product static JSON
    const fallbackRes = await fetch(`data/products/${FLOW_CONFIG.PUBLIC_PRODUCT_SLUG}.json`);
    if (!fallbackRes.ok) {
      throw new Error('Default product configuration could not be loaded.');
    }
    return await fallbackRes.json();
  }

  setupHeader(config) {
    const avatarImg = document.getElementById('header-avatar');
    const agentName = document.getElementById('header-agent-name');
    const agentRole = document.getElementById('header-agent-role');
    const statusText = document.getElementById('header-status-text');
    const headerTitle = document.getElementById('header-title');
    const backBtn = document.getElementById('header-back-btn');

    // Centered Hero in chat conversation (Facebook / Instagram style)
    const heroAvatar = document.getElementById('hero-avatar-img');
    const heroName = document.getElementById('hero-agent-name');
    const heroRole = document.getElementById('hero-agent-role');
    const heroBio = document.getElementById('hero-agent-bio');

    if (avatarImg && config.avatar?.image) {
      avatarImg.src = config.avatar.image;
      avatarImg.alt = config.avatar.name || 'Avatar';
    }
    if (heroAvatar && config.avatar?.image) {
      heroAvatar.src = config.avatar.image;
      heroAvatar.alt = config.avatar.name || 'Avatar';
    }

    const displayName = config.avatar?.name || config.brand?.name || 'Asistente';
    if (agentName) agentName.textContent = displayName;
    if (heroName) heroName.textContent = displayName;

    const displayRole = config.avatar?.role || 'Página do Facebook • Ativo(a) agora';
    if (agentRole) agentRole.textContent = displayRole;
    if (heroRole) heroRole.textContent = `${config.brand?.name || config.name || 'Página'} • ${config.avatar?.role || 'Atendimento Oficial'}`;

    if (heroBio) {
      heroBio.textContent = config.avatar?.description || config.description || 'Página Oficial • Suporte e atendimento comercial';
    }

    if (statusText) {
      statusText.textContent = config.avatar?.status || t('chat.statusOnline', config.language || 'es-MX');
    }

    if (headerTitle) {
      headerTitle.textContent = config.brand?.name || 'Ventas';
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.reload();
        }
      });
    }

    // Page title
    document.title = `${displayName} — Messenger`;
  }
}

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App().init());
} else {
  new App().init();
}
