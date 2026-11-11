/**
 * Universal Sales Chat Engine - Interactions Manager
 * Handles input dock, keyboard events, voice recording, option selection, and polite fallback responses.
 */

import { formatSecondsToTime } from '../utils/helpers.js';

export class InteractionManager {
  constructor({
    inputForm,
    textInput,
    sendButton,
    dockContainer,
    micButton,
    recordingPanel,
    voiceRecorderService,
    permissionModal,
    onSendMessage,
    onSendVoiceMessage,
    onOptionSelected
  }) {
    this.form = inputForm;
    this.input = textInput;
    this.sendBtn = sendButton;
    this.dock = dockContainer;
    this.micBtn = micButton;
    this.recPanel = recordingPanel;
    this.voiceRecorder = voiceRecorderService;
    this.permModal = permissionModal;
    this.onSendMessage = onSendMessage;
    this.onSendVoiceMessage = onSendVoiceMessage;
    this.onOptionSelected = onOptionSelected;

    this.pendingInputNode = null;
    this.currentOptions = [];
    this.previewAudio = null;
    this.isRecordingAudio = false;

    this._bindEvents();
    this._bindVoiceRecorderEvents();
  }

  _bindEvents() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleSubmit();
      });
    }

    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._handleSubmit();
        }
      });
    }
  }

  _bindVoiceRecorderEvents() {
    if (!this.micBtn || !this.voiceRecorder) return;

    // Check if voice recording is supported in this browser
    if (!this.voiceRecorder.isSupported()) {
      this.micBtn.style.display = 'none';
      return;
    }

    // Modal elements
    const modalClose = this.permModal?.querySelector('#btn-close-mic-modal');
    const modalCancel = this.permModal?.querySelector('#btn-cancel-mic-modal');
    const modalConfirm = this.permModal?.querySelector('#btn-confirm-mic-modal');

    if (modalClose) modalClose.addEventListener('click', () => this._hidePermModal());
    if (modalCancel) modalCancel.addEventListener('click', () => this._hidePermModal());
    if (modalConfirm) {
      modalConfirm.addEventListener('click', async () => {
        this._hidePermModal();
        sessionStorage.setItem('usc_mic_notified', 'true');
        await this._startVoiceRecording();
      });
    }

    // Mic click handler
    this.micBtn.addEventListener('click', async () => {
      if (this.isRecordingAudio) {
        this.voiceRecorder.stopRecording();
        return;
      }

      // Check if user has already acknowledged privacy notice
      const alreadyAcknowledged = sessionStorage.getItem('usc_mic_notified') === 'true';
      if (!alreadyAcknowledged && this.permModal) {
        this.permModal.style.display = 'flex';
      } else {
        await this._startVoiceRecording();
      }
    });

    // Recording dock panel elements
    if (this.recPanel) {
      const btnPause = this.recPanel.querySelector('#btn-pause-record');
      const btnStop = this.recPanel.querySelector('#btn-stop-record');
      const btnDiscard = this.recPanel.querySelector('#btn-discard-record');
      const btnDiscardPreview = this.recPanel.querySelector('#btn-discard-preview');
      const btnPlayPreview = this.recPanel.querySelector('#btn-play-preview');
      const btnSendVoice = this.recPanel.querySelector('#btn-send-voice');

      if (btnPause) {
        btnPause.addEventListener('click', () => {
          if (this.voiceRecorder.state === 'recording') {
            this.voiceRecorder.pauseRecording();
            btnPause.textContent = '▶️ Retomar';
            btnPause.title = 'Reanudar grabación';
          } else if (this.voiceRecorder.state === 'paused') {
            this.voiceRecorder.resumeRecording();
            btnPause.textContent = '⏸️';
            btnPause.title = 'Pausar grabación';
          }
        });
      }

      if (btnStop) {
        btnStop.addEventListener('click', () => {
          this.voiceRecorder.stopRecording();
        });
      }

      if (btnDiscard) {
        btnDiscard.addEventListener('click', () => {
          this._discardAndResetVoice();
        });
      }

      if (btnDiscardPreview) {
        btnDiscardPreview.addEventListener('click', () => {
          this._discardAndResetVoice();
        });
      }

      if (btnPlayPreview) {
        btnPlayPreview.addEventListener('click', () => {
          const recData = this.voiceRecorder.getRecordingData();
          if (!recData.url) return;

          if (this.previewAudio && !this.previewAudio.paused) {
            this.previewAudio.pause();
            btnPlayPreview.textContent = '▶️ Escuchar';
          } else {
            if (!this.previewAudio || this.previewAudio.src !== recData.url) {
              this.previewAudio = new Audio(recData.url);
              this.previewAudio.addEventListener('ended', () => {
                btnPlayPreview.textContent = '▶️ Escuchar';
              });
            }
            this.previewAudio.play().catch(() => {});
            btnPlayPreview.textContent = '⏸️ Pausar';
          }
        });
      }

      if (btnSendVoice) {
        btnSendVoice.addEventListener('click', () => {
          const recData = this.voiceRecorder.getRecordingData();
          if (recData.url && this.onSendVoiceMessage) {
            this.onSendVoiceMessage({
              blob: recData.blob,
              url: recData.url,
              durationSeconds: recData.durationSeconds,
              pendingNode: this.pendingInputNode
            });
            this.pendingInputNode = null;
          }
          this._stopPreviewAudio();
          this._discardAndResetVoice();
        });
      }
    }

    // Voice Recorder state changes
    this.voiceRecorder.onStateChange = (state) => {
      this._handleRecorderState(state);
    };

    this.voiceRecorder.onTimerTick = (elapsed, max) => {
      const timerEl = this.recPanel?.querySelector('#recording-timer');
      if (timerEl) {
        timerEl.textContent = `${formatSecondsToTime(elapsed)} / ${formatSecondsToTime(max)}`;
      }
    };

    this.voiceRecorder.onError = (errMsg) => {
      alert(errMsg);
      this._discardAndResetVoice();
    };
  }

  _hidePermModal() {
    if (this.permModal) {
      this.permModal.style.display = 'none';
    }
  }

  async _startVoiceRecording() {
    const success = await this.voiceRecorder.startRecording();
    if (success) {
      this.isRecordingAudio = true;
      if (this.micBtn) this.micBtn.classList.add('recording-active');
    }
  }

  _handleRecorderState(state) {
    const liveBox = this.recPanel?.querySelector('#recording-live-actions');
    const previewBox = this.recPanel?.querySelector('#recording-preview-box');
    const pulseDot = this.recPanel?.querySelector('#recording-pulse-dot');
    const previewDuration = this.recPanel?.querySelector('#preview-duration-text');

    if (state === 'recording') {
      if (this.form) this.form.style.display = 'none';
      if (this.recPanel) this.recPanel.style.display = 'flex';
      if (liveBox) liveBox.style.display = 'flex';
      if (previewBox) previewBox.style.display = 'none';
      if (pulseDot) pulseDot.style.display = 'inline-block';
    } else if (state === 'paused') {
      if (pulseDot) pulseDot.style.display = 'none';
    } else if (state === 'preview') {
      this.isRecordingAudio = false;
      if (this.micBtn) this.micBtn.classList.remove('recording-active');
      if (liveBox) liveBox.style.display = 'none';
      if (previewBox) previewBox.style.display = 'flex';
      if (pulseDot) pulseDot.style.display = 'none';

      const recData = this.voiceRecorder.getRecordingData();
      if (previewDuration) {
        previewDuration.textContent = formatSecondsToTime(recData.durationSeconds);
      }
    } else if (state === 'idle') {
      this.isRecordingAudio = false;
      if (this.micBtn) this.micBtn.classList.remove('recording-active');
      if (this.recPanel) this.recPanel.style.display = 'none';
      if (this.form) this.form.style.display = 'flex';
      this._stopPreviewAudio();
    }
  }

  _stopPreviewAudio() {
    if (this.previewAudio) {
      this.previewAudio.pause();
      this.previewAudio = null;
    }
  }

  _discardAndResetVoice() {
    this._stopPreviewAudio();
    this.voiceRecorder.discardRecording();
    this.isRecordingAudio = false;
    if (this.micBtn) this.micBtn.classList.remove('recording-active');
    if (this.recPanel) this.recPanel.style.display = 'none';
    if (this.form) this.form.style.display = 'flex';
  }

  _handleSubmit() {
    if (!this.input) return;
    const value = this.input.value.trim();
    if (!value) return;

    this.input.value = '';

    if (this.pendingInputNode) {
      const node = this.pendingInputNode;
      this.pendingInputNode = null;
      if (this.onSendMessage) {
        this.onSendMessage({
          type: 'input_response',
          value,
          node
        });
      }
    } else {
      if (this.onSendMessage) {
        this.onSendMessage({
          type: 'free_text',
          value,
          availableOptions: this.currentOptions
        });
      }
    }
  }

  enableInputForNode(inputNode) {
    this.pendingInputNode = inputNode;
    if (this.input) {
      this.input.disabled = false;
      this.input.placeholder = inputNode.placeholder || 'Escribe tu respuesta aquí...';
      this.input.type = inputNode.inputType || 'text';
      this.input.focus();
    }
    if (this.sendBtn) {
      this.sendBtn.disabled = false;
    }
  }

  setFreeInputState(enabled, placeholder = '') {
    this.pendingInputNode = null;
    if (this.input) {
      this.input.disabled = !enabled;
      if (placeholder) this.input.placeholder = placeholder;
    }
    if (this.sendBtn) {
      this.sendBtn.disabled = !enabled;
    }
  }

  setCurrentOptions(options = []) {
    this.currentOptions = options;
  }

  clearPendingInput() {
    this.pendingInputNode = null;
    if (this.input) {
      this.input.value = '';
    }
  }
}
