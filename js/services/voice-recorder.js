/**
 * Universal Sales Chat Engine - Voice Recorder Service
 * Handles visitor audio recording with MediaRecorder API, permissions management,
 * timer control, local audio previews, and safe resource disposal.
 * 100% Client-Side - Zero external transmission without explicit backend setup.
 */

export class VoiceRecorderService {
  constructor(options = {}) {
    this.maxDurationSeconds = options.maxDurationSeconds || 60;
    this.onStateChange = options.onStateChange || null;
    this.onTimerTick = options.onTimerTick || null;
    this.onError = options.onError || null;

    this.mediaStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedBlob = null;
    this.recordedUrl = null;
    this.durationSeconds = 0;
    this.timerInterval = null;
    this.state = 'idle'; // 'idle' | 'recording' | 'paused' | 'preview'
    this.activeUrls = new Set();
  }

  /**
   * Checks whether the current browser environment supports voice recording.
   * @returns {boolean}
   */
  isSupported() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
    if (typeof navigator.mediaDevices.getUserMedia !== 'function') return false;
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return false;
    return true;
  }

  /**
   * Determines the optimal audio MIME type supported by this browser.
   * @returns {string}
   */
  getSupportedMimeType() {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
      return 'audio/webm';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4'
    ];
    for (const mime of candidates) {
      if (window.MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return '';
  }

  _setState(newState) {
    this.state = newState;
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
  }

  /**
   * Requests microphone access and starts recording.
   * Explains permission intent explicitly before prompting.
   * @returns {Promise<boolean>}
   */
  async startRecording() {
    if (!this.isSupported()) {
      const err = 'La grabación de voz no es compatible con este navegador.';
      if (this.onError) this.onError(err);
      return false;
    }

    try {
      this.discardRecording();

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mimeType = this.getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      this.recordedChunks = [];
      this.durationSeconds = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const finalType = this.mediaRecorder.mimeType || mimeType || 'audio/webm';
        this.recordedBlob = new Blob(this.recordedChunks, { type: finalType });
        if (this.recordedBlob.size > 0) {
          this.recordedUrl = URL.createObjectURL(this.recordedBlob);
          this.activeUrls.add(this.recordedUrl);
        }
        this._releaseStream();
        this._stopTimer();
        this._setState('preview');
      };

      this.mediaRecorder.onerror = (e) => {
        console.error('[VoiceRecorder] MediaRecorder error:', e);
        this.cancelRecording();
        if (this.onError) this.onError('Error durante la grabación de audio.');
      };

      this.mediaRecorder.start(250); // Slice chunks every 250ms
      this._startTimer();
      this._setState('recording');
      return true;
    } catch (err) {
      this._releaseStream();
      let errorMsg = 'No se pudo acceder al micrófono.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permiso de micrófono denegado. Habilítalo en los ajustes del navegador para grabar notas de voz.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No se encontró ningún micrófono conectado en tu dispositivo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'El micrófono está siendo utilizado por otra aplicación.';
      }

      console.warn('[VoiceRecorder] Microphone request error:', err.name, err.message);
      if (this.onError) this.onError(errorMsg);
      return false;
    }
  }

  /**
   * Pauses the active recording session if supported.
   */
  pauseRecording() {
    if (this.mediaRecorder && this.state === 'recording') {
      try {
        if (typeof this.mediaRecorder.pause === 'function') {
          this.mediaRecorder.pause();
          this._stopTimer();
          this._setState('paused');
          return true;
        }
      } catch (e) {
        console.warn('[VoiceRecorder] Pause not supported:', e);
      }
    }
    return false;
  }

  /**
   * Resumes a paused recording session.
   */
  resumeRecording() {
    if (this.mediaRecorder && this.state === 'paused') {
      try {
        if (typeof this.mediaRecorder.resume === 'function') {
          this.mediaRecorder.resume();
          this._startTimer();
          this._setState('recording');
          return true;
        }
      } catch (e) {
        console.warn('[VoiceRecorder] Resume not supported:', e);
      }
    }
    return false;
  }

  /**
   * Stops recording and enters preview mode.
   */
  stopRecording() {
    if (this.mediaRecorder && (this.state === 'recording' || this.state === 'paused')) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.error('[VoiceRecorder] Error stopping MediaRecorder:', e);
        this.cancelRecording();
      }
    }
  }

  /**
   * Discards the recorded audio and cleans up resources.
   */
  discardRecording() {
    this._stopTimer();
    this._releaseStream();

    if (this.recordedUrl) {
      URL.revokeObjectURL(this.recordedUrl);
      this.activeUrls.delete(this.recordedUrl);
      this.recordedUrl = null;
    }

    this.recordedBlob = null;
    this.recordedChunks = [];
    this.durationSeconds = 0;
    this._setState('idle');
  }

  cancelRecording() {
    this.discardRecording();
  }

  /**
   * Returns current recording artifacts for chat submission.
   */
  getRecordingData() {
    return {
      blob: this.recordedBlob,
      url: this.recordedUrl,
      durationSeconds: Math.max(1, Math.round(this.durationSeconds)),
      mimeType: this.recordedBlob ? this.recordedBlob.type : ''
    };
  }

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      this.durationSeconds += 0.5;
      if (this.onTimerTick) {
        this.onTimerTick(this.durationSeconds, this.maxDurationSeconds);
      }
      if (this.durationSeconds >= this.maxDurationSeconds) {
        this.stopRecording();
      }
    }, 500);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  _releaseStream() {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        // ignore
      }
      this.mediaStream = null;
    }
  }

  /**
   * Releases all allocated Blob URLs on application exit.
   */
  cleanup() {
    this.discardRecording();
    this.activeUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
      }
    });
    this.activeUrls.clear();
  }
}
