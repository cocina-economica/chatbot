/**
 * Universal Sales Chat Engine - UI Renderer
 * Generates and appends accessible, responsive chat components to the DOM.
 */

import { renderMarkdown, interpolate, escapeHtml, formatCurrency, sanitizeUrl, formatSecondsToTime } from '../utils/helpers.js';

export class ChatRenderer {
  constructor(containerElement, liveAnnouncerElement = null) {
    this.container = containerElement;
    this.liveAnnouncer = liveAnnouncerElement;
  }

  clear() {
    if (this.container) {
      const hero = this.container.querySelector('.chat-profile-hero');
      this.container.innerHTML = '';
      if (hero) {
        this.container.appendChild(hero);
      }
    }
  }

  scrollToBottom(smooth = true) {
    if (!this.container) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.container.scrollTo({
      top: this.container.scrollHeight,
      behavior: smooth && !prefersReducedMotion ? 'smooth' : 'auto'
    });
  }

  announceForAccessibility(text) {
    if (this.liveAnnouncer) {
      this.liveAnnouncer.textContent = text;
    }
  }

  // --- Typing Indicator ---

  showTypingIndicator(agentName = 'Asesora') {
    this.hideTypingIndicator();

    const typingEl = document.createElement('div');
    typingEl.id = 'chat-typing-indicator';
    typingEl.className = 'chat-bubble-row bot-row typing-row';
    typingEl.setAttribute('aria-label', `${agentName} está escribiendo...`);
    typingEl.innerHTML = `
      <div class="chat-bubble bot-bubble typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;

    this.container.appendChild(typingEl);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const existing = document.getElementById('chat-typing-indicator');
    if (existing) {
      existing.remove();
    }
  }

  // --- Messages ---

  renderBotMessage(content, context = {}) {
    const interpolated = interpolate(content, context);
    const html = renderMarkdown(interpolated);

    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';
    row.innerHTML = `
      <div class="chat-bubble bot-bubble">
        <div class="message-content">${html}</div>
      </div>
    `;

    this.container.appendChild(row);
    this.announceForAccessibility(interpolated.replace(/[*_#`]/g, ''));
    this.scrollToBottom();
    return row;
  }

  renderUserMessage(text) {
    const safeText = escapeHtml(text);

    const row = document.createElement('div');
    row.className = 'chat-bubble-row user-row animate-fade-in';
    row.innerHTML = `
      <div class="chat-bubble user-bubble">
        <div class="message-content">${safeText}</div>
      </div>
    `;

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Image Message ---

  renderImageMessage(imageUrl, caption = '', context = {}) {
    const safeUrl = escapeHtml(imageUrl);
    const safeCaption = interpolate(caption, context);

    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';
    row.innerHTML = `
      <div class="chat-bubble bot-bubble image-bubble">
        <div class="chat-image-wrap">
          <img src="${safeUrl}" alt="${escapeHtml(safeCaption || 'Imagen del producto')}" loading="lazy" class="chat-media-img" />
        </div>
        ${safeCaption ? `<div class="chat-media-caption">${renderMarkdown(safeCaption)}</div>` : ''}
      </div>
    `;

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Video Message ---

  renderVideoMessage(videoUrl, title = '', caption = '', context = {}) {
    const safeTitle = interpolate(title, context);
    const safeCaption = interpolate(caption, context);
    const safeVideoUrl = sanitizeUrl(videoUrl) || '';

    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';

    let videoContentHtml = '';
    if (safeVideoUrl && (safeVideoUrl.includes('youtube') || safeVideoUrl.includes('vimeo') || safeVideoUrl.includes('embed'))) {
      videoContentHtml = `
        <div class="chat-video-container">
          <iframe src="${escapeHtml(safeVideoUrl)}" title="${escapeHtml(safeTitle || 'Video')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    } else if (safeVideoUrl) {
      videoContentHtml = `
        <div class="chat-video-container">
          <video controls preload="metadata" class="chat-video-player">
            <source src="${escapeHtml(safeVideoUrl)}" type="video/mp4">
            Tu navegador no soporta reproducción de video HTML5.
          </video>
        </div>
      `;
    } else {
      videoContentHtml = `
        <div class="chat-video-container" style="background:#1E293B; color:#94A3B8; display:flex; align-items:center; justify-content:center; padding:20px; font-size:12px;">
          Video no disponible o enlace no permitido.
        </div>
      `;
    }

    row.innerHTML = `
      <div class="chat-bubble bot-bubble video-bubble">
        ${safeTitle ? `<div class="chat-card-title">${escapeHtml(safeTitle)}</div>` : ''}
        ${videoContentHtml}
        ${safeCaption ? `<div class="chat-media-caption">${renderMarkdown(safeCaption)}</div>` : ''}
      </div>
    `;

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Voice Note / Audio Message (System Bot) ---

  renderAudioVoiceNote(audioNode, agentAvatar = '', agentName = '', context = {}) {
    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';
    row.setAttribute('role', 'region');
    row.setAttribute('aria-label', `Mensaje de voz de ${agentName || 'Asesora'}`);

    const rawUrl = audioNode.src || audioNode.audioUrl || '';
    const safeAudioUrl = rawUrl ? sanitizeUrl(rawUrl) : null;
    const durationSeconds = audioNode.durationSeconds || 14;
    const caption = audioNode.caption ? interpolate(audioNode.caption, context) : '';

    row.innerHTML = `
      <div class="chat-bubble bot-bubble voice-note-bubble">
        <div class="voice-note-player">
          <div class="voice-note-avatar-box">
            <img src="${escapeHtml(agentAvatar || 'assets/images/default-avatar.svg')}" alt="${escapeHtml(agentName)}" class="voice-avatar-thumb">
            <span class="voice-mic-badge" aria-hidden="true">🎤</span>
          </div>

          <button type="button" class="btn-voice-play" aria-label="Reproducir mensaje de voz" title="Reproducir audio">
            <svg class="icon-play" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg class="icon-pause" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display:none;">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>

          <div class="voice-waveform-wrap">
            <div class="voice-waveform-bars" aria-hidden="true">
              <span class="v-bar" style="height:40%;"></span>
              <span class="v-bar" style="height:70%;"></span>
              <span class="v-bar" style="height:100%;"></span>
              <span class="v-bar" style="height:60%;"></span>
              <span class="v-bar" style="height:85%;"></span>
              <span class="v-bar" style="height:50%;"></span>
              <span class="v-bar" style="height:90%;"></span>
              <span class="v-bar" style="height:65%;"></span>
              <span class="v-bar" style="height:45%;"></span>
              <span class="v-bar" style="height:80%;"></span>
              <span class="v-bar" style="height:60%;"></span>
              <span class="v-bar" style="height:75%;"></span>
              <span class="v-bar" style="height:35%;"></span>
            </div>

            <!-- Scrubber / Progress slider -->
            <div class="voice-progress-container">
              <input 
                type="range" 
                class="voice-progress-slider" 
                min="0" 
                max="${durationSeconds}" 
                step="0.1" 
                value="0" 
                aria-label="Posición de reproducción de audio"
              />
            </div>

            <div class="voice-timer-row">
              <span class="voice-current-time">0:00</span>
              <div class="voice-controls-right">
                <button type="button" class="btn-voice-volume" aria-label="Silenciar o activar sonido" title="Control de volumen">
                  <span class="icon-vol-unmuted">🔊</span>
                  <span class="icon-vol-muted" style="display:none;">🔇</span>
                </button>
                <span class="voice-total-time">${formatSecondsToTime(durationSeconds)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="voice-error-banner" style="display:none; margin-top:8px; font-size:11px; color:#EF4444;">
          ⚠️ No se pudo cargar el archivo de audio. Reproduciendo simulación interactiva.
        </div>

        ${caption ? `<div class="voice-note-caption">${renderMarkdown(caption)}</div>` : ''}
      </div>
    `;

    // Interactive Audio Playback logic
    const playBtn = row.querySelector('.btn-voice-play');
    const iconPlay = row.querySelector('.icon-play');
    const iconPause = row.querySelector('.icon-pause');
    const currentTimeEl = row.querySelector('.voice-current-time');
    const totalTimeEl = row.querySelector('.voice-total-time');
    const progressSlider = row.querySelector('.voice-progress-slider');
    const volumeBtn = row.querySelector('.btn-voice-volume');
    const iconVolUnmuted = row.querySelector('.icon-vol-unmuted');
    const iconVolMuted = row.querySelector('.icon-vol-muted');
    const errorBanner = row.querySelector('.voice-error-banner');
    const bars = row.querySelectorAll('.v-bar');

    let isPlaying = false;
    let timerInterval = null;
    let currentSeconds = 0;
    let audioElement = null;
    let hasAudioError = false;

    if (safeAudioUrl) {
      try {
        audioElement = new Audio(safeAudioUrl);
        audioElement.preload = 'metadata';

        audioElement.addEventListener('loadedmetadata', () => {
          if (audioElement.duration && !isNaN(audioElement.duration)) {
            const actualDuration = Math.round(audioElement.duration);
            progressSlider.max = actualDuration;
            totalTimeEl.textContent = formatSecondsToTime(actualDuration);
          }
        });

        audioElement.addEventListener('timeupdate', () => {
          if (audioElement && !progressSlider.matches(':active')) {
            currentTimeEl.textContent = formatSecondsToTime(audioElement.currentTime);
            progressSlider.value = audioElement.currentTime;
          }
        });

        audioElement.addEventListener('ended', () => {
          stopPlayback();
          progressSlider.value = 0;
          currentTimeEl.textContent = '0:00';
        });

        audioElement.addEventListener('error', () => {
          hasAudioError = true;
          errorBanner.style.display = 'block';
          audioElement = null;
        });
      } catch (e) {
        audioElement = null;
      }
    }

    const startPlayback = () => {
      isPlaying = true;
      iconPlay.style.display = 'none';
      iconPause.style.display = 'inline-block';
      playBtn.setAttribute('aria-label', 'Pausar mensaje de voz');
      bars.forEach(b => b.classList.add('dancing'));

      if (audioElement && !hasAudioError) {
        audioElement.play().catch((err) => {
          console.warn('[AudioPlayer] Playback blocked or failed:', err);
          hasAudioError = true;
          errorBanner.style.display = 'block';
          // Fall back to simulated playback
          _startSimulatedTimer();
        });
      } else {
        _startSimulatedTimer();
      }
    };

    const _startSimulatedTimer = () => {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        currentSeconds += 0.5;
        const maxSecs = parseFloat(progressSlider.max) || durationSeconds;
        if (currentSeconds >= maxSecs) {
          stopPlayback();
          currentSeconds = 0;
          progressSlider.value = 0;
          currentTimeEl.textContent = '0:00';
          return;
        }
        currentTimeEl.textContent = formatSecondsToTime(currentSeconds);
        progressSlider.value = currentSeconds;
      }, 500);
    };

    const stopPlayback = () => {
      isPlaying = false;
      iconPlay.style.display = 'inline-block';
      iconPause.style.display = 'none';
      playBtn.setAttribute('aria-label', 'Reproducir mensaje de voz');
      bars.forEach(b => b.classList.remove('dancing'));

      if (audioElement) {
        audioElement.pause();
      }
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    };

    playBtn.addEventListener('click', () => {
      if (isPlaying) {
        stopPlayback();
      } else {
        startPlayback();
      }
    });

    // Scrubber interaction
    progressSlider.addEventListener('input', (e) => {
      const targetSec = parseFloat(e.target.value);
      currentTimeEl.textContent = formatSecondsToTime(targetSec);
      if (audioElement && !hasAudioError) {
        audioElement.currentTime = targetSec;
      } else {
        currentSeconds = targetSec;
      }
    });

    // Volume / Mute control
    let isMuted = false;
    volumeBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      if (audioElement) {
        audioElement.muted = isMuted;
      }
      iconVolUnmuted.style.display = isMuted ? 'none' : 'inline';
      iconVolMuted.style.display = isMuted ? 'inline' : 'none';
      volumeBtn.title = isMuted ? 'Activar sonido' : 'Silenciar';
    });

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Voice Note / Audio Message (Visitor Audio) ---

  renderUserAudioVoiceNote(blobUrl, durationSeconds = 5) {
    const safeUrl = sanitizeUrl(blobUrl);
    const row = document.createElement('div');
    row.className = 'chat-bubble-row user-row animate-fade-in';
    row.setAttribute('role', 'region');
    row.setAttribute('aria-label', 'Tu nota de voz enviada');

    row.innerHTML = `
      <div class="chat-bubble user-bubble voice-note-user-bubble">
        <div class="voice-note-player user-voice-player">
          <button type="button" class="btn-voice-play btn-user-voice-play" aria-label="Reproducir tu nota de voz">
            <svg class="icon-play" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg class="icon-pause" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:none;">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>

          <div class="voice-waveform-wrap">
            <input 
              type="range" 
              class="voice-progress-slider user-slider" 
              min="0" 
              max="${durationSeconds}" 
              step="0.1" 
              value="0" 
              aria-label="Progreso de tu nota de voz"
            />
            <div class="voice-timer-row">
              <span class="user-voice-current">0:00</span>
              <span class="user-voice-total">${formatSecondsToTime(durationSeconds)}</span>
            </div>
          </div>
        </div>
        <div class="voice-local-badge" title="Este audio se procesó únicamente en tu dispositivo">
          🔒 Audio procesado localmente en tu dispositivo
        </div>
      </div>
    `;

    const playBtn = row.querySelector('.btn-user-voice-play');
    const iconPlay = row.querySelector('.icon-play');
    const iconPause = row.querySelector('.icon-pause');
    const currentEl = row.querySelector('.user-voice-current');
    const slider = row.querySelector('.user-slider');

    let audio = null;
    let isPlaying = false;

    if (safeUrl) {
      try {
        audio = new Audio(safeUrl);
        audio.addEventListener('timeupdate', () => {
          if (audio && !slider.matches(':active')) {
            currentEl.textContent = formatSecondsToTime(audio.currentTime);
            slider.value = audio.currentTime;
          }
        });
        audio.addEventListener('ended', () => {
          isPlaying = false;
          iconPlay.style.display = 'inline-block';
          iconPause.style.display = 'none';
          slider.value = 0;
          currentEl.textContent = '0:00';
        });
      } catch (e) {
        audio = null;
      }
    }

    playBtn.addEventListener('click', () => {
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
        iconPlay.style.display = 'inline-block';
        iconPause.style.display = 'none';
      } else {
        audio.play().catch(() => {});
        isPlaying = true;
        iconPlay.style.display = 'none';
        iconPause.style.display = 'inline-block';
      }
    });

    slider.addEventListener('input', (e) => {
      if (audio) {
        audio.currentTime = parseFloat(e.target.value);
        currentEl.textContent = formatSecondsToTime(audio.currentTime);
      }
    });

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Product Card ---

  renderProductCard(productData, customIntro = '', context = {}) {
    const p = productData || {};
    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';

    const highlightsList = (p.highlights || [])
      .map(item => `<li><span class="icon-check">✓</span> ${escapeHtml(item)}</li>`)
      .join('');

    row.innerHTML = `
      <div class="chat-bubble bot-bubble product-card-bubble">
        ${customIntro ? `<div class="product-intro-text">${renderMarkdown(interpolate(customIntro, context))}</div>` : ''}
        <div class="product-card">
          ${p.coverImage ? `
            <div class="product-card-cover">
              <img src="${escapeHtml(p.coverImage)}" alt="${escapeHtml(p.name || 'Portada')}" loading="lazy" />
            </div>
          ` : ''}
          <div class="product-card-body">
            <span class="product-format-badge">${escapeHtml(p.format || 'Digital')}</span>
            <h3 class="product-title">${escapeHtml(p.name || '')}</h3>
            <p class="product-desc">${escapeHtml(p.description || '')}</p>
            ${highlightsList ? `<ul class="product-highlights">${highlightsList}</ul>` : ''}
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Offer Cards (Pricing & Tiers) ---

  renderOffersBlock(offers = [], intro = '', context = {}, onCheckoutClick = null) {
    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';

    const targetOfferId = context?.targetOfferId || null;
    const isSingleMode = context?.isSingleMode || false;

    let displayOffers = offers;
    if (isSingleMode && targetOfferId) {
      const filtered = offers.filter(tier => tier.id === targetOfferId);
      if (filtered.length > 0) {
        displayOffers = filtered;
      }
    }

    const tiersHtml = displayOffers.map(tier => {
      const isTargeted = targetOfferId && (tier.id === targetOfferId);
      const features = (tier.features || [])
        .map(f => `<li>✓ ${escapeHtml(f)}</li>`)
        .join('');

      const priceFormatted = formatCurrency(tier.price, tier.currency || 'MXN');

      return `
        <div class="offer-tier-card ${tier.isPopular ? 'popular-tier' : ''} ${isTargeted ? 'targeted-offer-highlight' : ''}" data-tier-id="${escapeHtml(tier.id)}">
          ${isTargeted ? `<div class="targeted-badge">⭐ Oferta Recomendada</div>` : (tier.badge ? `<div class="tier-badge">${escapeHtml(tier.badge)}</div>` : '')}
          <h4 class="tier-name">${escapeHtml(tier.name)}</h4>
          <div class="tier-price-box">
            <span class="tier-price">${priceFormatted}</span>
          </div>
          <p class="tier-description">${escapeHtml(tier.description || '')}</p>
          <ul class="tier-features">${features}</ul>
          <button type="button" class="btn-tier-select ${isTargeted ? 'btn-targeted-select' : ''}" data-offer-id="${escapeHtml(tier.id)}">
            ${isTargeted ? `👉 Adquirir ${escapeHtml(tier.name)}` : `Elegir ${escapeHtml(tier.name)}`}
          </button>
        </div>
      `;
    }).join('');

    row.innerHTML = `
      <div class="chat-bubble bot-bubble offers-bubble">
        ${intro ? `<div class="offers-intro">${renderMarkdown(interpolate(intro, context))}</div>` : ''}
        <div class="offers-grid">
          ${tiersHtml}
        </div>
      </div>
    `;

    if (onCheckoutClick) {
      row.querySelectorAll('.btn-tier-select').forEach(btn => {
        btn.addEventListener('click', () => {
          const offerId = btn.getAttribute('data-offer-id');
          const chosen = offers.find(o => o.id === offerId);
          onCheckoutClick(chosen);
        });
      });
    }

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Downloadable File Card ---

  renderFileCard(fileNode, context = {}) {
    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';

    const title = interpolate(fileNode.title || 'Archivo de Muestra', context);
    const desc = interpolate(fileNode.description || '', context);
    const label = fileNode.downloadLabel || 'Descargar archivo';

    const safeFileUrl = sanitizeUrl(fileNode.fileUrl) || '#';

    row.innerHTML = `
      <div class="chat-bubble bot-bubble file-card-bubble">
        <div class="file-card">
          <div class="file-card-icon">📄</div>
          <div class="file-card-info">
            <h4 class="file-card-title">${escapeHtml(title)}</h4>
            <span class="file-meta">${escapeHtml(fileNode.fileType || 'PDF')} • ${escapeHtml(fileNode.fileSize || 'Descarga Inmediata')}</span>
            ${desc ? `<p class="file-card-desc">${renderMarkdown(desc)}</p>` : ''}
            <a href="${escapeHtml(safeFileUrl)}" download target="_blank" rel="noopener noreferrer" class="btn-file-download">
              📥 ${escapeHtml(label)}
            </a>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Checkout Action Card ---

  renderCheckoutCard(checkoutNode, context = {}, onCheckoutClick = null) {
    const row = document.createElement('div');
    row.className = 'chat-bubble-row bot-row animate-fade-in';

    const title = interpolate(checkoutNode.title || 'Finalizar Adquisición', context);
    const priceText = interpolate(checkoutNode.priceText || '', context);
    const desc = interpolate(checkoutNode.description || '', context);
    const guarantee = checkoutNode.guarantee || '🛡️ Compra 100% segura con garantía incondicional.';
    const buttonLabel = interpolate(checkoutNode.buttonLabel || 'Proceder al Pago Seguro', context);

    row.innerHTML = `
      <div class="chat-bubble bot-bubble checkout-card-bubble">
        <div class="checkout-card">
          ${checkoutNode.badge ? `<div class="checkout-badge">${escapeHtml(checkoutNode.badge)}</div>` : ''}
          <h3 class="checkout-title">${escapeHtml(title)}</h3>
          ${priceText ? `<div class="checkout-price-tag">${escapeHtml(priceText)}</div>` : ''}
          ${desc ? `<p class="checkout-desc">${renderMarkdown(desc)}</p>` : ''}
          
          <button type="button" class="btn-checkout-cta" id="btn-checkout-action">
            🔒 ${escapeHtml(buttonLabel)}
          </button>
          
          <div class="checkout-guarantee">
            <small>${escapeHtml(guarantee)}</small>
          </div>
        </div>
      </div>
    `;

    const btn = row.querySelector('#btn-checkout-action');
    if (btn && onCheckoutClick) {
      btn.addEventListener('click', () => {
        onCheckoutClick(checkoutNode);
      });
    }

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  // --- Button Options ---

  renderOptions(options = [], onSelect = null, context = {}) {
    const row = document.createElement('div');
    row.className = 'chat-options-container animate-fade-in';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Opciones de respuesta');

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-option-btn';
      btn.textContent = interpolate(opt.label, context);
      btn.addEventListener('click', () => {
        // Disable buttons in this container to prevent duplicate submissions
        row.querySelectorAll('.chat-option-btn').forEach(b => {
          b.disabled = true;
          b.classList.add('disabled');
        });
        btn.classList.add('selected');
        if (onSelect) onSelect(opt);
      });
      row.appendChild(btn);
    });

    this.container.appendChild(row);
    this.scrollToBottom();
    return row;
  }
}
