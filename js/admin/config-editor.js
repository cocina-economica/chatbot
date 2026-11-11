/**
 * Universal Sales Chat Engine - General Config Editor Module
 */

export class ConfigEditorModule {
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
    const c = this.config;
    const b = c.branding || {};
    const a = c.avatar || {};
    const t = c.theme || {};
    const s = c.settings || {};

    this.container.innerHTML = `
      <form id="general-config-form">
        <!-- Branding Card -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">1. Identidade do Produto & Marca</h3>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Nome Comercial</label>
              <input type="text" id="cfg-name" class="form-input" value="${b.name || c.name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Subtítulo / Tagline</label>
              <input type="text" id="cfg-tagline" class="form-input" value="${b.tagline || c.description || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Idioma Padrão</label>
              <select id="cfg-lang" class="form-select">
                <option value="es-MX" ${c.language === 'es-MX' ? 'selected' : ''}>Español (México)</option>
                <option value="pt-BR" ${c.language === 'pt-BR' ? 'selected' : ''}>Português (Brasil)</option>
                <option value="en-US" ${c.language === 'en-US' ? 'selected' : ''}>English (US)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Moeda</label>
              <input type="text" id="cfg-currency" class="form-input" value="${c.currency || 'USD'}">
            </div>
          </div>
        </div>

        <!-- Agent Card -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">2. Atendente / Asesor Virtual</h3>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Nome do Atendente</label>
              <input type="text" id="cfg-agent-name" class="form-input" value="${a.name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Cargo / Especialidade</label>
              <input type="text" id="cfg-agent-role" class="form-input" value="${a.role || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Texto de Status</label>
              <input type="text" id="cfg-agent-status" class="form-input" value="${a.status || 'En línea ahora'}">
            </div>
            <div class="form-group">
              <label class="form-label">Caminho da Imagem / Avatar (SVG/PNG)</label>
              <input type="text" id="cfg-agent-img" class="form-input" value="${a.image || ''}">
            </div>
          </div>
        </div>

        <!-- Theme & Colors Card -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">3. Tema & Cores da Interface</h3>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Cor Primária (Destaque/Botões)</label>
              <input type="color" id="cfg-color-primary" class="form-input" value="${t.primaryColor || '#E65100'}" style="height:42px; padding:4px;">
            </div>
            <div class="form-group">
              <label class="form-label">Cor Secundária (Garantia/Verde)</label>
              <input type="color" id="cfg-color-secondary" class="form-input" value="${t.secondaryColor || '#15803D'}" style="height:42px; padding:4px;">
            </div>
            <div class="form-group">
              <label class="form-label">Fundo do Balão do Bot</label>
              <input type="color" id="cfg-bot-bg" class="form-input" value="${t.botBubbleBg || '#F1F5F9'}" style="height:42px; padding:4px;">
            </div>
            <div class="form-group">
              <label class="form-label">Fundo do Balão do Usuário</label>
              <input type="color" id="cfg-user-bg" class="form-input" value="${t.userBubbleBg || '#E65100'}" style="height:42px; padding:4px;">
            </div>
          </div>
        </div>

        <!-- Chat Settings Card -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h3 class="admin-card-title">4. Comportamento do Chat</h3>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Velocidade da Digitação (ms)</label>
              <input type="number" id="cfg-delay-ms" class="form-input" value="${s.defaultTypingDelayMs || 600}" min="0" step="50">
            </div>
            <div class="form-group">
              <label class="form-label">Permitir Digitação Livre</label>
              <select id="cfg-allow-input" class="form-select">
                <option value="true" ${s.allowFreeTextInput !== false ? 'selected' : ''}>Sim (Habilitado)</option>
                <option value="false" ${s.allowFreeTextInput === false ? 'selected' : ''}>Não (Apenas Botões)</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label class="form-label">Resposta Padrão para Entradas Não Reconhecidas (Fallback)</label>
              <textarea id="cfg-fallback" class="form-textarea" rows="2">${s.fallbackResponse || ''}</textarea>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="submit" class="btn-primary" style="padding:12px 28px; font-size:15px;">💾 Salvar Configurações</button>
        </div>
      </form>
    `;

    const form = this.container.querySelector('#general-config-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleSave();
      });
    }
  }

  _handleSave() {
    const c = this.config;
    c.name = this.container.querySelector('#cfg-name').value.trim();
    c.description = this.container.querySelector('#cfg-tagline').value.trim();
    c.language = this.container.querySelector('#cfg-lang').value;
    c.currency = this.container.querySelector('#cfg-currency').value.trim();

    c.branding = c.branding || {};
    c.branding.name = c.name;
    c.branding.tagline = c.description;

    c.avatar = c.avatar || {};
    c.avatar.name = this.container.querySelector('#cfg-agent-name').value.trim();
    c.avatar.role = this.container.querySelector('#cfg-agent-role').value.trim();
    c.avatar.status = this.container.querySelector('#cfg-agent-status').value.trim();
    c.avatar.image = this.container.querySelector('#cfg-agent-img').value.trim();

    c.theme = c.theme || {};
    c.theme.primaryColor = this.container.querySelector('#cfg-color-primary').value;
    c.theme.secondaryColor = this.container.querySelector('#cfg-color-secondary').value;
    c.theme.botBubbleBg = this.container.querySelector('#cfg-bot-bg').value;
    c.theme.userBubbleBg = this.container.querySelector('#cfg-user-bg').value;

    c.settings = c.settings || {};
    c.settings.defaultTypingDelayMs = parseInt(this.container.querySelector('#cfg-delay-ms').value, 10) || 600;
    c.settings.allowFreeTextInput = this.container.querySelector('#cfg-allow-input').value === 'true';
    c.settings.fallbackResponse = this.container.querySelector('#cfg-fallback').value.trim();

    this.storage.saveCustomProduct(c);
    alert('Configurações salvas no armazenamento local com sucesso!');
    if (this.onSaveSuccess) this.onSaveSuccess(c);
  }
}
