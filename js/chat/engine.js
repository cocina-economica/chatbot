/**
 * Universal Sales Chat Engine - Core Engine
 * Independent conversational state machine executing configurable node flows.
 * Zero hardcoded product references.
 */

import { wait, interpolate } from '../utils/helpers.js';

export class ChatEngine {
  constructor({
    config,
    renderer,
    navigation,
    interactions,
    analytics,
    checkoutService,
    soundService
  }) {
    this.config = config;
    this.renderer = renderer;
    this.nav = navigation;
    this.interactions = interactions;
    this.analytics = analytics;
    this.checkout = checkoutService;
    this.sound = soundService;

    this.nodes = config.flows || {};
    this.startNodeId = config.flow_entry || Object.keys(this.nodes)[0];
    this.isRunning = false;
    this.currentOptions = [];

    this._applyTheme();
    this._setupInteractionHandlers();
  }

  _applyTheme() {
    if (!this.config.theme) return;
    const root = document.documentElement;
    const t = this.config.theme;

    if (t.primaryColor) root.style.setProperty('--color-primary', t.primaryColor);
    if (t.primaryHover) root.style.setProperty('--color-primary-hover', t.primaryHover);
    if (t.secondaryColor) root.style.setProperty('--color-secondary', t.secondaryColor);
    if (t.accentColor) root.style.setProperty('--color-accent', t.accentColor);
    if (t.bgBody) root.style.setProperty('--color-bg-body', t.bgBody);
    if (t.bgChat) root.style.setProperty('--color-bg-chat', t.bgChat);
    if (t.botBubbleBg) root.style.setProperty('--color-bot-bubble-bg', t.botBubbleBg);
    if (t.botBubbleText) root.style.setProperty('--color-bot-bubble-text', t.botBubbleText);
    if (t.userBubbleBg) root.style.setProperty('--color-user-bubble-bg', t.userBubbleBg);
    if (t.userBubbleText) root.style.setProperty('--color-user-bubble-text', t.userBubbleText);
    if (t.borderRadius) root.style.setProperty('--border-radius-base', t.borderRadius);
  }

  _setupInteractionHandlers() {
    if (!this.interactions) return;

    this.interactions.onSendMessage = (event) => {
      if (event.type === 'input_response') {
        const { value, node } = event;
        // Save to user state
        const key = node.inputKey || 'userInput';
        this.nav.updateUserState(key, value);

        // Render user response bubble
        this.renderer.renderUserMessage(value);

        // Proceed to next node
        if (node.next) {
          this.executeNode(node.next);
        }
      } else if (event.type === 'free_text') {
        const { value, availableOptions } = event;
        this.renderer.renderUserMessage(value);

        // Try fuzzy matching options
        const normalized = value.toLowerCase().trim();
        const matched = (availableOptions || []).find(opt => {
          const labelNorm = opt.label.toLowerCase();
          return labelNorm.includes(normalized) || normalized.includes(labelNorm);
        });

        if (matched) {
          this._handleOptionSelect(matched);
        } else {
          // Polite fallback response
          const fallback = this.config.settings?.fallbackResponse ||
            'Entendido. Para orientarte mejor, elige una de las opciones disponibles:';
          this.renderer.renderBotMessage(fallback, this.nav.getUserState());

          if (availableOptions && availableOptions.length > 0) {
            this.renderer.renderOptions(availableOptions, (opt) => this._handleOptionSelect(opt), this.nav.getUserState());
          }
        }
      }
    };

    this.interactions.onOptionSelected = (option) => {
      this._handleOptionSelect(option);
    };

    this.interactions.onSendVoiceMessage = (voiceData) => {
      const { url, durationSeconds, pendingNode } = voiceData;

      // Render visitor voice note bubble
      this.renderer.renderUserAudioVoiceNote(url, durationSeconds);

      if (this.analytics) {
        this.analytics.track('voice_message_sent', { durationSeconds });
      }

      if (pendingNode) {
        const key = pendingNode.inputKey || 'userVoiceNote';
        this.nav.updateUserState(key, `[Audio ${durationSeconds}s]`);

        if (pendingNode.next) {
          this.executeNode(pendingNode.next);
        }
      } else {
        // Courteous voice acknowledgement
        const ack = this.config.settings?.voiceAckResponse ||
          '¡Gracias por tu nota de voz! Para continuar orientándote paso a paso, elige una de las siguientes opciones:';
        
        setTimeout(() => {
          this.renderer.renderBotMessage(ack, this.nav.getUserState());
          if (this.currentOptions && this.currentOptions.length > 0) {
            this.renderer.renderOptions(this.currentOptions, (opt) => this._handleOptionSelect(opt), this.nav.getUserState());
          }
        }, 600);
      }
    };
  }

  async start(resume = false) {
    if (this.analytics) {
      this.analytics.track('chat_started', { slug: this.config.slug });
    }

    if (resume && this.nav.history.length > 0) {
      // Re-run from current position
      const last = this.nav.history[this.nav.history.length - 1];
      await this.executeNode(last.nodeId);
    } else {
      this.nav.reset();
      this.renderer.clear();
      await this.executeNode(this.startNodeId);
    }
  }

  async restart() {
    this.nav.reset();
    this.renderer.clear();
    if (this.interactions) {
      this.interactions.clearPendingInput();
    }
    await this.start(false);
  }

  async executeNode(nodeId, depth = 0) {
    if (depth > 20) {
      console.error('[ChatEngine] Maximum execution recursion depth reached for node:', nodeId);
      return;
    }

    const node = this.nodes[nodeId];
    if (!node) {
      console.warn(`[ChatEngine] Node not found: "${nodeId}".`);
      const errorMsg = this.config.messages?.errorNodeNotFound ||
        'Paso no encontrado. Regresando al menú principal.';
      this.renderer.renderBotMessage(errorMsg);
      if (nodeId !== this.startNodeId) {
        await wait(1000);
        await this.executeNode(this.startNodeId, depth + 1);
      }
      return;
    }

    this.nav.setCurrentNode(nodeId);

    if (this.analytics) {
      this.analytics.track('message_viewed', { nodeId, type: node.type });
    }

    const typingDelay = this.config.settings?.enableTypingIndicator
      ? (this.config.settings?.defaultTypingDelayMs || 500)
      : 50;

    const agentName = this.config.avatar?.name || 'Asesora';
    const context = this.nav.getUserState();

    switch (node.type) {
      case 'message': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();
        if (this.sound) this.sound.playMessageSound();
        this.renderer.renderBotMessage(node.content, context);

        if (node.next) {
          await wait(300);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'audio': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();
        if (this.sound) this.sound.playMessageSound();
        this.renderer.renderAudioVoiceNote(node, this.config.avatar?.image, agentName, context);

        if (node.next) {
          await wait(400);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'image': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();
        this.renderer.renderImageMessage(node.imageUrl, node.caption || '', context);

        if (node.next) {
          await wait(300);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'video': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();
        this.renderer.renderVideoMessage(node.videoUrl, node.title || '', node.caption || '', context);

        if (node.next) {
          await wait(300);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'product': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();

        let prodData = (this.config.products || []).find(p => p.id === node.productId);
        if (!prodData && this.config.products?.length > 0) {
          prodData = this.config.products[0];
        }

        this.renderer.renderProductCard(prodData, node.content || '', context);

        if (this.analytics) {
          this.analytics.track('product_viewed', { productId: prodData?.id });
        }

        if (node.next) {
          await wait(300);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'offer': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();

        const offers = this.config.offers || [];
        this.renderer.renderOffersBlock(offers, node.content || '', context, (chosenOffer) => {
          if (this.analytics) {
            this.analytics.track('offer_viewed', { offerId: chosenOffer?.id });
          }
          if (chosenOffer && chosenOffer.checkoutUrl) {
            this.checkout.redirectToCheckout(chosenOffer.checkoutUrl, chosenOffer);
          }
        });

        if (this.analytics) {
          this.analytics.track('offer_viewed', { count: offers.length });
        }

        if (node.next) {
          await wait(300);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'file': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();
        this.renderer.renderFileCard(node, context);

        if (node.next) {
          await wait(300);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'checkout': {
        this.renderer.showTypingIndicator(agentName);
        await wait(typingDelay);
        this.renderer.hideTypingIndicator();

        let offerData = (this.config.offers || []).find(o => o.id === node.offerId);
        if (!offerData) {
          offerData = {
            id: node.offerId || 'checkout_offer',
            name: node.title,
            price: 0,
            currency: this.config.currency || 'USD'
          };
        }

        this.renderer.renderCheckoutCard(node, context, () => {
          const url = node.checkoutUrl || offerData?.checkoutUrl;
          this.checkout.redirectToCheckout(url, offerData);
        });

        if (node.next) {
          await wait(400);
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'buttons': {
        if (node.content) {
          this.renderer.showTypingIndicator(agentName);
          await wait(typingDelay);
          this.renderer.hideTypingIndicator();
          this.renderer.renderBotMessage(node.content, context);
        }

        const options = node.options || [];
        this.currentOptions = options;

        if (this.interactions) {
          this.interactions.setCurrentOptions(options);
          this.interactions.setFreeInputState(
            this.config.settings?.allowFreeTextInput !== false,
            this.config.messages?.inputPlaceholder
          );
        }

        this.renderer.renderOptions(options, (opt) => {
          this._handleOptionSelect(opt);
        }, context);
        break;
      }

      case 'input': {
        if (node.content) {
          this.renderer.showTypingIndicator(agentName);
          await wait(typingDelay);
          this.renderer.hideTypingIndicator();
          this.renderer.renderBotMessage(node.content, context);
        }

        if (this.interactions) {
          this.interactions.enableInputForNode(node);
        }
        break;
      }

      case 'condition': {
        const key = node.variableKey || 'userName';
        const expected = node.expectedValue;
        const actual = context[key];

        let target = node.ifFalse;
        if (expected !== undefined) {
          if (actual == expected) target = node.ifTrue;
        } else {
          // Check truthiness
          if (actual) target = node.ifTrue;
        }

        if (target) {
          await this.executeNode(target, depth + 1);
        }
        break;
      }

      case 'delay': {
        const ms = node.delayMs || 600;
        await wait(ms);
        if (node.next) {
          await this.executeNode(node.next, depth + 1);
        }
        break;
      }

      case 'end': {
        if (node.content) {
          this.renderer.showTypingIndicator(agentName);
          await wait(typingDelay);
          this.renderer.hideTypingIndicator();
          this.renderer.renderBotMessage(node.content, context);
        }

        if (this.analytics) {
          this.analytics.track('conversation_completed', { slug: this.config.slug });
        }

        if (node.allowRestart !== false && this.config.settings?.showRestartButton) {
          const restartOpt = [{
            label: '🔄 ' + (this.config.messages?.restartButtonLabel || 'Reiniciar conversación'),
            isRestart: true
          }];
          this.renderer.renderOptions(restartOpt, () => this.restart());
        }
        break;
      }

      default:
        console.warn('[ChatEngine] Unknown node type:', node.type);
        if (node.next) {
          await this.executeNode(node.next, depth + 1);
        }
    }
  }

  _handleOptionSelect(option) {
    if (option.isRestart) {
      this.restart();
      return;
    }

    if (this.analytics) {
      this.analytics.track('button_clicked', {
        label: option.label,
        next: option.next
      });
    }

    // Render user choice bubble
    this.renderer.renderUserMessage(option.label);

    if (option.next) {
      this.executeNode(option.next);
    }
  }
}
