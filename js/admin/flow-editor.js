/**
 * Universal Sales Chat Engine - Visual Flow Editor Module
 * Advanced conversational flowchart builder with Drag-and-Drop,
 * natural chronological conversation order, component palette, and 1-click templates.
 */

import { NODE_TYPES, validateFlowGraph } from '../utils/validation.js';
import { generateId, deepClone, escapeHtml } from '../utils/helpers.js';

export class FlowEditorModule {
  constructor({ storageService, containerElement, currentConfig, onSaveSuccess }) {
    this.storage = storageService;
    this.container = containerElement;
    this.config = currentConfig;
    this.onSaveSuccess = onSaveSuccess;
    this.editingNodeId = null;
    this.viewMode = 'timeline'; // 'timeline' (chronological order) | 'grid'
    this.searchFilter = '';
    this.draggedItem = null; // { type: 'palette_chip'|'card', nodeType?, nodeId? }
  }

  setConfig(newConfig) {
    this.config = newConfig;
    this.render();
  }

  /**
   * Computes nodes in exact conversational sequence starting from flow_entry
   */
  getConversationalSequence(nodes, startNodeId) {
    const visited = new Set();
    const ordered = [];
    const queue = [];

    if (startNodeId && nodes[startNodeId]) {
      queue.push({ id: startNodeId, branchInfo: null });
    }

    while (queue.length > 0) {
      const item = queue.shift();
      if (!visited.has(item.id) && nodes[item.id]) {
        visited.add(item.id);
        const node = nodes[item.id];
        ordered.push({
          id: item.id,
          node,
          branchInfo: item.branchInfo,
          isStart: item.id === startNodeId
        });

        // 1. Next linear node
        if (node.next && !visited.has(node.next)) {
          queue.push({ id: node.next, branchInfo: null });
        }

        // 2. Button options branches
        if (Array.isArray(node.options)) {
          node.options.forEach(opt => {
            if (opt.next && !visited.has(opt.next)) {
              queue.push({
                id: opt.next,
                branchInfo: `Via Botão: "${opt.label || 'Opção'}"`
              });
            }
          });
        }

        // 3. Condition branches
        if (node.type === 'condition') {
          if (node.ifTrue && !visited.has(node.ifTrue)) {
            queue.push({ id: node.ifTrue, branchInfo: 'Ramo: Se Verdadeiro' });
          }
          if (node.ifFalse && !visited.has(node.ifFalse)) {
            queue.push({ id: node.ifFalse, branchInfo: 'Ramo: Se Falso' });
          }
        }
      }
    }

    // Unconnected / orphan nodes
    const unconnected = [];
    for (const [id, node] of Object.entries(nodes)) {
      if (!visited.has(id)) {
        unconnected.push({ id, node, branchInfo: 'Não conectado ao início', isStart: false });
      }
    }

    return { ordered, unconnected };
  }

  render() {
    if (!this.container) return;
    const nodes = this.config.flows || {};
    const startNodeId = this.config.flow_entry || Object.keys(nodes)[0];
    const validation = validateFlowGraph(nodes, startNodeId);

    // Build validator banner
    let bannerClass = 'valid';
    let bannerIcon = '✅';
    let bannerText = `Fluxo validado: ${validation.stats.totalNodes} etapas, todas conectadas na conversa.`;

    if (!validation.valid) {
      bannerClass = 'invalid';
      bannerIcon = '⚠️';
      bannerText = `Erros detectados no fluxo: ${validation.errors.join(' | ')}`;
    } else if (validation.warnings.length > 0) {
      bannerClass = 'warning';
      bannerIcon = '⚡';
      bannerText = `Avisos no fluxo: ${validation.warnings.join(' | ')}`;
    }

    const { ordered, unconnected } = this.getConversationalSequence(nodes, startNodeId);

    // Filter nodes if search active
    const filterFn = (item) => {
      if (!this.searchFilter) return true;
      const q = this.searchFilter.toLowerCase();
      const text = (item.node.content || item.node.caption || item.node.title || item.id || '').toLowerCase();
      return text.includes(q) || item.id.toLowerCase().includes(q) || (item.node.type || '').toLowerCase().includes(q);
    };

    const filteredOrdered = ordered.filter(filterFn);
    const filteredUnconnected = unconnected.filter(filterFn);

    this.container.innerHTML = `
      <!-- Editor Top Toolbar -->
      <div class="flow-editor-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <h3 style="font-size:18px; font-weight:800; color:#FFFFFF; margin-bottom:4px;">Editor Visual de Fluxos Conversacionais</h3>
          <p style="font-size:12px; color:#94A3B8;">Criação facilitada com arrastar e soltar na ordem natural da conversa.</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <!-- View Mode Toggle -->
          <div style="background:#0F172A; border:1px solid #334155; border-radius:8px; padding:3px; display:inline-flex;">
            <button type="button" class="btn-view-toggle ${this.viewMode === 'timeline' ? 'active' : ''}" id="btn-view-timeline" style="background:${this.viewMode === 'timeline' ? '#2563EB' : 'transparent'}; color:#FFFFFF; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
              📑 Ordem da Conversa
            </button>
            <button type="button" class="btn-view-toggle ${this.viewMode === 'grid' ? 'active' : ''}" id="btn-view-grid" style="background:${this.viewMode === 'grid' ? '#2563EB' : 'transparent'}; color:#FFFFFF; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">
              🔲 Grade Livre
            </button>
          </div>

          <button type="button" class="btn-secondary" id="btn-open-templates" style="font-size:12px;">
            ⚡ Modelos Prontos
          </button>
          <button type="button" class="btn-secondary" id="btn-run-diagnostics" style="font-size:12px;">
            🔍 Diagnóstico
          </button>
          <button type="button" class="btn-primary" id="btn-add-new-node" style="font-size:12px;">
            + Criar Etapa
          </button>
        </div>
      </div>

      <!-- Quick Component Palette Bar (Drag & Drop or Click to Add) -->
      <div class="flow-palette-bar">
        <div class="flow-palette-title">
          <span>🧩 Paleta de Componentes (Clique para adicionar ou Arraste para o fluxo):</span>
          <span style="font-size:11px; color:#38BDF8;">✨ Arraste para qualquer posição</span>
        </div>
        <div class="flow-palette-chips" id="palette-chips-container">
          <div class="palette-chip" draggable="true" data-type="message">💬 Mensagem</div>
          <div class="palette-chip" draggable="true" data-type="audio" style="border-color:#A855F7;">🎧 Áudio Atendente</div>
          <div class="palette-chip" draggable="true" data-type="buttons" style="border-color:#F97316;">🔘 Botões Menu</div>
          <div class="palette-chip" draggable="true" data-type="input" style="border-color:#8B5CF6;">📥 Pergunta / Nome</div>
          <div class="palette-chip" draggable="true" data-type="product" style="border-color:#10B981;">📦 Card Produto</div>
          <div class="palette-chip" draggable="true" data-type="offer" style="border-color:#EC4899;">🏷️ Pacotes Ofertas</div>
          <div class="palette-chip" draggable="true" data-type="file" style="border-color:#14B8A6;">📄 Amostra Grátis</div>
          <div class="palette-chip" draggable="true" data-type="checkout" style="border-color:#22C55E;">🔒 Botão Checkout</div>
          <div class="palette-chip" draggable="true" data-type="delay">⏱️ Pausa</div>
          <div class="palette-chip" draggable="true" data-type="end">🏁 Fim do Fluxo</div>
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px;">
        <div style="flex:1; max-width:400px; position:relative;">
          <input 
            type="text" 
            id="input-filter-nodes" 
            class="form-input" 
            placeholder="🔍 Filtrar etapas por texto, ID ou tipo..." 
            value="${escapeHtml(this.searchFilter)}"
            style="padding-left:12px; font-size:13px;"
          />
        </div>
        <div style="font-size:12px; color:#94A3B8;">
          Mostrando <strong>${filteredOrdered.length + filteredUnconnected.length}</strong> de ${Object.keys(nodes).length} etapas
        </div>
      </div>

      <!-- Validator Status Banner -->
      <div class="flow-validator-banner ${bannerClass}" id="flow-validator-banner">
        <span>${bannerIcon}</span>
        <div style="flex:1;">${bannerText}</div>
      </div>

      <!-- Views Container -->
      ${this.viewMode === 'timeline'
        ? this._renderTimelineView(filteredOrdered, filteredUnconnected, startNodeId)
        : this._renderGridView(filteredOrdered, filteredUnconnected, startNodeId)
      }

      <!-- Node Inspector Modal -->
      <div id="node-modal" class="admin-modal-backdrop" style="display:none;">
        <div class="admin-modal">
          <div class="modal-header">
            <h3 class="modal-title" id="node-modal-title">Editar Etapa da Conversa</h3>
            <button type="button" class="btn-modal-close" id="btn-close-node-modal">&times;</button>
          </div>
          <form id="node-edit-form">
            <div class="modal-body" id="node-modal-body"></div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="btn-cancel-node">Cancelar</button>
              <button type="submit" class="btn-primary">Salvar Etapa</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Pre-built Funnel Templates Modal -->
      <div id="templates-modal" class="admin-modal-backdrop" style="display:none;">
        <div class="admin-modal" style="max-width:760px;">
          <div class="modal-header">
            <h3 class="modal-title">⚡ Modelos Prontos de Fluxos Conversacionais</h3>
            <button type="button" class="btn-modal-close" id="btn-close-templates-modal">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size:13px; color:#CBD5E1; margin-bottom:16px;">
              Carregue um fluxo de alta conversão estruturado com apenas 1 clique. Você poderá editar os textos, valores e mensagens livremente depois.
            </p>
            <div class="template-grid">
              
              <!-- Template 1 -->
              <div class="template-card">
                <div>
                  <span class="template-badge">Recomendado</span>
                  <h4 style="font-size:15px; font-weight:800; color:#FFFFFF; margin:8px 0 4px;">Venda Direta com Nota de Voz</h4>
                  <p style="font-size:12px; color:#94A3B8; line-height:1.4;">
                    Boas-vindas calorosa ➔ Mensagem de voz do mentor (áudio) ➔ Apresentação do produto digital ➔ Card de ofertas com desconto ➔ Checkout Hotmart com garantia.
                  </p>
                </div>
                <button type="button" class="btn-primary btn-apply-template" data-template="direct_audio" style="width:100%; font-size:12px;">
                  Aplicar Este Modelo
                </button>
              </div>

              <!-- Template 2 -->
              <div class="template-card">
                <div>
                  <span class="template-badge" style="border-color:#38BDF8; color:#38BDF8; background:rgba(56,189,248,0.15);">Engajamento</span>
                  <h4 style="font-size:15px; font-weight:800; color:#FFFFFF; margin:8px 0 4px;">Qualificação e Nome do Visitante</h4>
                  <p style="font-size:12px; color:#94A3B8; line-height:1.4;">
                    Pergunta o nome do lead ➔ Mensagem personalizada com {{userName}} ➔ Menu com botões de interesses ➔ Oferta orientada ao perfil escolhido.
                  </p>
                </div>
                <button type="button" class="btn-primary btn-apply-template" data-template="qualification" style="width:100%; font-size:12px;">
                  Aplicar Este Modelo
                </button>
              </div>

              <!-- Template 3 -->
              <div class="template-card">
                <div>
                  <span class="template-badge" style="border-color:#F59E0B; color:#F59E0B; background:rgba(245,158,11,0.15);">Isca Digital</span>
                  <h4 style="font-size:15px; font-weight:800; color:#FFFFFF; margin:8px 0 4px;">Entrega de Ebook / Degustação Grátis</h4>
                  <p style="font-size:12px; color:#94A3B8; line-height:1.4;">
                    Saudação inicial ➔ Card para download imediato do PDF de amostra ➔ Convite persuasivo para upgrade para a versão completa ➔ Checkout.
                  </p>
                </div>
                <button type="button" class="btn-primary btn-apply-template" data-template="lead_magnet" style="width:100%; font-size:12px;">
                  Aplicar Este Modelo
                </button>
              </div>

            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btn-cancel-templates">Fechar</button>
          </div>
        </div>
      </div>
    `;

    this._bindAllEvents(nodes, startNodeId, ordered);
  }

  /**
   * Renders the chronological conversation timeline view (Ordem da Conversa)
   */
  _renderTimelineView(orderedNodes, unconnectedNodes, startNodeId) {
    let timelineHtml = `
      <div class="flow-timeline-container" id="flow-timeline-container">
        <!-- Top Dropzone to insert as new start -->
        <div class="flow-drop-zone" data-drop-index="0" data-target-id="${startNodeId}" data-position="before" title="Solte aqui para inserir no topo"></div>
    `;

    orderedNodes.forEach((item, index) => {
      const { id, node, branchInfo, isStart } = item;
      const typeClass = `type-${node.type || 'message'}`;
      const previewText = node.content || node.caption || node.title || (node.imageUrl ? `[Imagem: ${node.imageUrl}]` : (node.audioUrl || node.src ? '[Áudio configurado]' : '[Sem texto]'));

      let connectionsDesc = '';
      if (node.next) {
        connectionsDesc += `<span style="color:#94A3B8;">Segue para ➔ <strong style="color:#38BDF8;">${escapeHtml(node.next)}</strong></span>`;
      }
      if (Array.isArray(node.options) && node.options.length > 0) {
        const list = node.options.map(opt => `[${escapeHtml(opt.label)}] ➔ <strong>${escapeHtml(opt.next || 'nenhum')}</strong>`).join(' | ');
        connectionsDesc += `<div style="font-size:11px; color:#CBD5E1; margin-top:4px;">🔘 Botões: ${list}</div>`;
      }
      if (node.type === 'end') {
        connectionsDesc = '<span style="color:#10B981; font-weight:700;">🏁 Nó Final da Conversa</span>';
      }

      timelineHtml += `
        <div class="timeline-step-row" data-node-id="${escapeHtml(id)}" data-step-index="${index}">
          
          <div class="timeline-step-card ${isStart ? 'start-node' : ''}" draggable="true" data-node-id="${escapeHtml(id)}">
            <div class="timeline-step-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="drag-handle" title="Arraste para mover de posição na conversa">⠿</span>
                <span class="timeline-step-badge">#${index + 1}</span>
                <span class="node-id-badge">${escapeHtml(id)}</span>
                ${isStart ? '<span style="background:#10B981; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">INÍCIO</span>' : ''}
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="node-type-tag ${typeClass}">${escapeHtml(node.type || 'message')}</span>
              </div>
            </div>

            ${branchInfo ? `<div><span class="timeline-branch-hint">↳ ${escapeHtml(branchInfo)}</span></div>` : ''}

            <div class="node-preview-content" style="margin:8px 0;">
              ${escapeHtml(previewText)}
            </div>

            <div style="font-size:12px; margin-bottom:10px;">
              ${connectionsDesc || '<span style="color:#64748B;">[Sem saída linear definida]</span>'}
            </div>

            <div class="node-actions-footer">
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn-secondary btn-edit-node" data-id="${escapeHtml(id)}" style="padding:4px 10px; font-size:12px;">✏️ Editar</button>
                ${!isStart ? `<button type="button" class="btn-secondary btn-set-start" data-id="${escapeHtml(id)}" style="padding:4px 8px; font-size:11px;" title="Tornar esta a 1ª mensagem do chat">⭐ Início</button>` : ''}
              </div>
              <button type="button" class="btn-danger btn-delete-node" data-id="${escapeHtml(id)}" style="padding:4px 8px; font-size:11px;" title="Excluir etapa">🗑️</button>
            </div>
          </div>

          <!-- Connector with Quick Insert between steps -->
          <div class="timeline-connector">
            <div class="timeline-line"></div>
            <button type="button" class="btn-quick-insert-connector" data-after-id="${escapeHtml(id)}" data-next-target="${escapeHtml(node.next || '')}" title="Inserir nova etapa aqui no meio">+</button>
            <div class="timeline-line"></div>
          </div>

          <!-- Drop Zone between cards -->
          <div class="flow-drop-zone" data-drop-index="${index + 1}" data-target-id="${escapeHtml(id)}" data-position="after" title="Solte aqui para posicionar"></div>

        </div>
      `;
    });

    timelineHtml += `</div>`;

    // Unconnected Section if any
    if (unconnectedNodes.length > 0) {
      timelineHtml += `
        <div style="max-width:780px; margin:32px auto 0; padding-top:20px; border-top:1px dashed #334155;">
          <h4 style="font-size:14px; font-weight:800; color:#F59E0B; margin-bottom:6px;">⚠️ Etapas Secundárias / Não Conectadas ao Início (${unconnectedNodes.length})</h4>
          <p style="font-size:12px; color:#94A3B8; margin-bottom:14px;">Estes nós existem no produto, mas nenhum caminho a partir da mensagem inicial conduz até eles.</p>
          <div class="nodes-container">
            ${this._renderCardList(unconnectedNodes)}
          </div>
        </div>
      `;
    }

    return timelineHtml;
  }

  /**
   * Renders traditional grid view
   */
  _renderGridView(orderedNodes, unconnectedNodes, startNodeId) {
    const all = [...orderedNodes, ...unconnectedNodes];
    return `
      <div class="nodes-container">
        ${this._renderCardList(all, startNodeId)}
      </div>
    `;
  }

  _renderCardList(list, startNodeId = '') {
    return list.map(item => {
      const { id, node, isStart } = item;
      const typeClass = `type-${node.type || 'message'}`;
      const previewText = node.content || node.caption || node.title || (node.imageUrl ? `[Imagem: ${node.imageUrl}]` : '[Sem texto]');

      let connectionsHtml = '';
      if (node.next) {
        connectionsHtml += `<div>➔ Próximo: <span class="node-target-pill">${escapeHtml(node.next)}</span></div>`;
      }
      if (Array.isArray(node.options)) {
        const btnsList = node.options.map(opt => `
          <div style="margin-top:2px;">• [${escapeHtml(opt.label)}] ➔ <span class="node-target-pill">${escapeHtml(opt.next || 'nenhum')}</span></div>
        `).join('');
        connectionsHtml += `<div><strong>Botões (${node.options.length}):</strong>${btnsList}</div>`;
      }

      return `
        <div class="node-card ${isStart ? 'start-node' : ''}" draggable="true" data-node-id="${escapeHtml(id)}">
          <div class="node-header">
            <span class="node-id-badge">${escapeHtml(id)}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              ${isStart ? '<span style="background:#10B981; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">INÍCIO</span>' : ''}
              <span class="node-type-tag ${typeClass}">${escapeHtml(node.type || 'message')}</span>
            </div>
          </div>

          <div class="node-preview-content">
            ${escapeHtml(previewText)}
          </div>

          <div class="node-connections">
            ${connectionsHtml || '<div style="color:#64748B;">[Nó final sem saídas]</div>'}
          </div>

          <div class="node-actions-footer">
            <button type="button" class="btn-secondary btn-edit-node" data-id="${escapeHtml(id)}" style="padding:4px 10px; font-size:12px;">✏️ Editar</button>
            ${!isStart ? `<button type="button" class="btn-secondary btn-set-start" data-id="${escapeHtml(id)}" style="padding:4px 8px; font-size:11px;">⭐ Início</button>` : ''}
            <button type="button" class="btn-danger btn-delete-node" data-id="${escapeHtml(id)}" style="padding:4px 8px; font-size:11px;">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  _bindAllEvents(nodes, startNodeId, orderedNodes) {
    // 1. Search / filter input
    const searchInput = this.container.querySelector('#input-filter-nodes');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchFilter = e.target.value.trim();
        this.render();
        const reInput = this.container.querySelector('#input-filter-nodes');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    // 2. View Mode Toggles
    const btnTimeline = this.container.querySelector('#btn-view-timeline');
    const btnGrid = this.container.querySelector('#btn-view-grid');
    if (btnTimeline) {
      btnTimeline.addEventListener('click', () => {
        this.viewMode = 'timeline';
        this.render();
      });
    }
    if (btnGrid) {
      btnGrid.addEventListener('click', () => {
        this.viewMode = 'grid';
        this.render();
      });
    }

    // 3. New Node Button
    const addBtn = this.container.querySelector('#btn-add-new-node');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._openNodeModal(null));
    }

    // 4. Diagnostics Button
    const diagBtn = this.container.querySelector('#btn-run-diagnostics');
    if (diagBtn) {
      diagBtn.addEventListener('click', () => {
        const v = validateFlowGraph(this.config.flows, this.config.flow_entry);
        alert(`Diagnóstico do Fluxo:\n- Total de Etapas: ${v.stats.totalNodes}\n- Etapas Alcançáveis: ${v.stats.reachableNodes}\n- Etapas Órfãs: ${v.stats.orphanNodes}\n- Erros: ${v.errors.length}\n- Avisos: ${v.warnings.length}\n\n${v.errors.join('\n') || '✅ Nenhum erro crítico encontrado! Fluxo 100% íntegro.'}`);
      });
    }

    // 5. Pre-built Funnels Modal
    const openTemplatesBtn = this.container.querySelector('#btn-open-templates');
    const templatesModal = this.container.querySelector('#templates-modal');
    const closeTemplatesBtn = this.container.querySelector('#btn-close-templates-modal');
    const cancelTemplatesBtn = this.container.querySelector('#btn-cancel-templates');

    if (openTemplatesBtn && templatesModal) {
      openTemplatesBtn.addEventListener('click', () => templatesModal.style.display = 'flex');
      if (closeTemplatesBtn) closeTemplatesBtn.addEventListener('click', () => templatesModal.style.display = 'none');
      if (cancelTemplatesBtn) cancelTemplatesBtn.addEventListener('click', () => templatesModal.style.display = 'none');

      this.container.querySelectorAll('.btn-apply-template').forEach(btn => {
        btn.addEventListener('click', () => {
          const tType = btn.getAttribute('data-template');
          if (confirm('Aplicar este modelo substituirá o fluxo de conversa atual pelo template pronto. Deseja continuar?')) {
            this._applyPrebuiltTemplate(tType);
            templatesModal.style.display = 'none';
          }
        });
      });
    }

    // 6. Quick Insert Connector '+' Buttons
    this.container.querySelectorAll('.btn-quick-insert-connector').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._showQuickInsertPopover(btn);
      });
    });

    // 7. Palette Chips Clicks (1-Click to append)
    this.container.querySelectorAll('.palette-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-type');
        this._appendNewStepOfType(type);
      });

      // HTML5 Drag for Palette Chips
      chip.addEventListener('dragstart', (e) => {
        const type = chip.getAttribute('data-type');
        this.draggedItem = { type: 'palette_chip', nodeType: type };
        e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedItem));
        e.dataTransfer.effectAllowed = 'copyMove';
      });
    });

    // 8. Card Drag & Drop (HTML5 Drag and Drop for Cards)
    this.container.querySelectorAll('.timeline-step-card, .node-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const nodeId = card.getAttribute('data-node-id');
        this.draggedItem = { type: 'card', nodeId };
        e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedItem));
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        this.container.querySelectorAll('.flow-drop-zone').forEach(z => z.classList.remove('active-zone'));
        this.draggedItem = null;
      });
    });

    // 9. Drop Zones
    this.container.querySelectorAll('.flow-drop-zone').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('active-zone');
        zone.textContent = '+ Solte aqui para posicionar etapa';
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('active-zone');
        zone.textContent = '';
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('active-zone');
        zone.textContent = '';

        const targetId = zone.getAttribute('data-target-id');
        const position = zone.getAttribute('data-position'); // 'before' | 'after'

        if (!this.draggedItem) return;

        if (this.draggedItem.type === 'palette_chip') {
          // Create new node of nodeType right at this position!
          this._insertNewStepAtPosition(this.draggedItem.nodeType, targetId, position);
        } else if (this.draggedItem.type === 'card') {
          // Reorder dragged card relative to targetId
          this._reorderStepCard(this.draggedItem.nodeId, targetId, position);
        }
      });
    });

    // 10. Card Actions: Edit, Set Start, Delete
    this.container.querySelectorAll('.btn-edit-node').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this._openNodeModal(id);
      });
    });

    this.container.querySelectorAll('.btn-set-start').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.config.flow_entry = id;
        this.storage.saveCustomProduct(this.config);
        alert(`⭐ Etapa "${id}" definida como o início da conversa!`);
        this.render();
        if (this.onSaveSuccess) this.onSaveSuccess(this.config);
      });
    });

    this.container.querySelectorAll('.btn-delete-node').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id === this.config.flow_entry) {
          alert('Você não pode excluir o nó inicial da conversa. Defina outro nó como início primeiro.');
          return;
        }
        if (confirm(`Tem certeza que deseja remover a etapa "${id}" do fluxo?`)) {
          // Remove from flows
          delete this.config.flows[id];
          // Clean references pointing to it
          for (const node of Object.values(this.config.flows)) {
            if (node.next === id) delete node.next;
            if (Array.isArray(node.options)) {
              node.options.forEach(opt => {
                if (opt.next === id) opt.next = '';
              });
            }
          }
          this.storage.saveCustomProduct(this.config);
          this.render();
          if (this.onSaveSuccess) this.onSaveSuccess(this.config);
        }
      });
    });

    // 11. Modal close controls
    const closeBtn = this.container.querySelector('#btn-close-node-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-node');
    const modal = this.container.querySelector('#node-modal');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  }

  /**
   * Displays quick popover to insert a new step in-between
   */
  _showQuickInsertPopover(connectorBtn) {
    // Remove any existing open popovers
    document.querySelectorAll('.quick-insert-menu').forEach(m => m.remove());

    const afterId = connectorBtn.getAttribute('data-after-id');
    const nextTarget = connectorBtn.getAttribute('data-next-target');

    const popover = document.createElement('div');
    popover.className = 'quick-insert-menu';
    popover.innerHTML = `
      <span style="font-size:11px; color:#94A3B8; margin-right:4px; align-self:center;">Inserir:</span>
      <button type="button" class="quick-menu-btn" data-type="message">💬 Mensagem</button>
      <button type="button" class="quick-menu-btn" data-type="audio">🎧 Áudio</button>
      <button type="button" class="quick-menu-btn" data-type="buttons">🔘 Botões</button>
      <button type="button" class="quick-menu-btn" data-type="offer">🏷️ Oferta</button>
      <button type="button" class="quick-menu-btn" data-type="input">📥 Pergunta</button>
      <button type="button" class="quick-menu-btn" data-type="checkout">🔒 Checkout</button>
    `;

    connectorBtn.parentElement.appendChild(popover);

    popover.querySelectorAll('.quick-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        popover.remove();
        this._insertStepBetween(afterId, nextTarget, type);
      });
    });

    // Close popover on outside click
    const outsideClick = (e) => {
      if (!popover.contains(e.target) && e.target !== connectorBtn) {
        popover.remove();
        document.removeEventListener('click', outsideClick);
      }
    };
    setTimeout(() => document.addEventListener('click', outsideClick), 50);
  }

  /**
   * Automatically splits connection: nodeAfter -> newNode -> nodeNext
   */
  _insertStepBetween(afterId, nextTarget, type) {
    const newId = this._generateCleanId(type);
    const newNode = this._buildDefaultNode(newId, type, nextTarget || undefined);

    this.config.flows = this.config.flows || {};
    this.config.flows[newId] = newNode;

    // Link previous node to this new node
    if (afterId && this.config.flows[afterId]) {
      this.config.flows[afterId].next = newId;
    }

    this.storage.saveCustomProduct(this.config);
    this.render();
    if (this.onSaveSuccess) this.onSaveSuccess(this.config);
  }

  /**
   * Inserts a new step at drop position from Palette Drag & Drop
   */
  _insertNewStepAtPosition(type, targetId, position) {
    const newId = this._generateCleanId(type);
    this.config.flows = this.config.flows || {};

    if (position === 'before' && targetId === this.config.flow_entry) {
      // Becomes the new start
      const newNode = this._buildDefaultNode(newId, type, targetId);
      this.config.flows[newId] = newNode;
      this.config.flow_entry = newId;
    } else if (position === 'after' && targetId && this.config.flows[targetId]) {
      const oldNext = this.config.flows[targetId].next;
      const newNode = this._buildDefaultNode(newId, type, oldNext || undefined);
      this.config.flows[newId] = newNode;
      this.config.flows[targetId].next = newId;
    } else {
      const newNode = this._buildDefaultNode(newId, type);
      this.config.flows[newId] = newNode;
    }

    this.storage.saveCustomProduct(this.config);
    this.render();
    if (this.onSaveSuccess) this.onSaveSuccess(this.config);
  }

  /**
   * Reorders an existing step card via Drag & Drop
   */
  _reorderStepCard(draggedId, targetId, position) {
    if (draggedId === targetId) return;
    if (!this.config.flows[draggedId] || !this.config.flows[targetId]) return;

    // Remove dragged node from current position in links
    for (const [id, node] of Object.entries(this.config.flows)) {
      if (node.next === draggedId && id !== targetId) {
        node.next = this.config.flows[draggedId].next || undefined;
      }
    }

    // Insert at target position
    if (position === 'after') {
      const oldTargetNext = this.config.flows[targetId].next;
      this.config.flows[targetId].next = draggedId;
      this.config.flows[draggedId].next = oldTargetNext || undefined;
    } else if (position === 'before') {
      if (targetId === this.config.flow_entry) {
        this.config.flows[draggedId].next = targetId;
        this.config.flow_entry = draggedId;
      }
    }

    this.storage.saveCustomProduct(this.config);
    this.render();
    if (this.onSaveSuccess) this.onSaveSuccess(this.config);
  }

  /**
   * Appends a new step of a given type at the end of the conversation
   */
  _appendNewStepOfType(type) {
    const newId = this._generateCleanId(type);
    const newNode = this._buildDefaultNode(newId, type);

    this.config.flows = this.config.flows || {};
    const keys = Object.keys(this.config.flows);

    // Find the last linear node in sequence to connect
    const { ordered } = this.getConversationalSequence(this.config.flows, this.config.flow_entry);
    const last = ordered.length > 0 ? ordered[ordered.length - 1] : null;

    if (last && last.node && last.node.type !== 'end' && !last.node.next) {
      last.node.next = newId;
    }

    this.config.flows[newId] = newNode;
    if (!this.config.flow_entry || keys.length === 0) {
      this.config.flow_entry = newId;
    }

    this.storage.saveCustomProduct(this.config);
    this.render();
    if (this.onSaveSuccess) this.onSaveSuccess(this.config);
  }

  _generateCleanId(type) {
    const prefix = type || 'etapa';
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}_${num}`;
  }

  _buildDefaultNode(id, type, next = '') {
    const defaults = {
      message: { id, type: 'message', content: 'Nova mensagem de texto para o visitante.', next },
      audio: { id, type: 'audio', caption: '🎧 Ouça esta breve mensagem de áudio:', durationSeconds: 15, audioUrl: '', src: '', next },
      buttons: {
        id,
        type: 'buttons',
        content: 'Como posso te orientar agora?',
        options: [
          { label: 'Opção 1', next: '' },
          { label: 'Opção 2', next: '' }
        ]
      },
      input: { id, type: 'input', content: 'Qual é o seu primeiro nome?', inputKey: 'userName', placeholder: 'Digite aqui...', next },
      product: { id, type: 'product', content: 'Conheça o nosso material principal:', productId: '', next },
      offer: { id, type: 'offer', content: 'Escolha a opção ideal para você:', next },
      file: { id, type: 'file', title: 'Amostra Grátis em PDF', description: 'Baixe um trecho do conteúdo para experimentar.', fileUrl: 'assets/products/muestra-5-recetas.svg', downloadLabel: 'Baixar Amostra Grátis', next },
      checkout: { id, type: 'checkout', title: 'Finalizar Adquisição com Garantia', description: 'Acesso imediato e garantia incondicional de 7 dias.', buttonLabel: 'Ir para o Pagamento Seguro', next },
      delay: { id, type: 'delay', delayMs: 800, next },
      end: { id, type: 'end', content: 'Agradecemos sua atenção! Estamos sempre à disposição.', allowRestart: true }
    };
    return defaults[type] || { id, type: 'message', content: '', next };
  }

  /**
   * Applies pre-built sales funnels with 1-click
   */
  _applyPrebuiltTemplate(templateType) {
    let newFlows = {};
    let entry = 'boas_vindas';

    if (templateType === 'direct_audio') {
      newFlows = {
        'boas_vindas': {
          id: 'boas_vindas',
          type: 'message',
          content: 'Olá! Que prazer ter você aqui. Preparei uma apresentação especial para você!',
          next: 'nota_voz_mentor'
        },
        'nota_voz_mentor': {
          id: 'nota_voz_mentor',
          type: 'audio',
          caption: '🎧 *Mensagem de voz exclusiva (15 seg):* Ouça como nosso método pode transformar seus resultados.',
          durationSeconds: 15,
          audioUrl: '',
          src: '',
          next: 'apresentacao_produto'
        },
        'apresentacao_produto': {
          id: 'apresentacao_produto',
          type: 'product',
          content: 'Veja todos os módulos e bônus inclusos no material:',
          next: 'pacotes_oferta'
        },
        'pacotes_oferta': {
          id: 'pacotes_oferta',
          type: 'offer',
          content: 'Selecione o plano ideal para dar esse passo hoje:',
          next: 'acao_checkout'
        },
        'acao_checkout': {
          id: 'acao_checkout',
          type: 'checkout',
          title: 'Garantia Incondicional de 7 Dias',
          description: 'Seu risco é absolutamente zero. Pagamento protegido e acesso imediato.',
          buttonLabel: 'Garantir Minha Vaga Agora',
          next: 'conclusao_sucesso'
        },
        'conclusao_sucesso': {
          id: 'conclusao_sucesso',
          type: 'end',
          content: 'Obrigado pelo contato! Conte conosco nessa jornada.',
          allowRestart: true
        }
      };
      entry = 'boas_vindas';
    } else if (templateType === 'qualification') {
      newFlows = {
        'saudacao_lead': {
          id: 'saudacao_lead',
          type: 'message',
          content: 'Olá! Seja muito bem-vindo/a ao nosso atendimento oficial.',
          next: 'coleta_nome'
        },
        'coleta_nome': {
          id: 'coleta_nome',
          type: 'input',
          content: 'Para que possamos te atender com exclusividade, como você se chama?',
          inputKey: 'userName',
          placeholder: 'Digite seu nome aqui...',
          next: 'boas_vindas_personalizada'
        },
        'boas_vindas_personalizada': {
          id: 'boas_vindas_personalizada',
          type: 'message',
          content: 'Muito prazer, {{userName}}! O que mais te motivou a nos procurar hoje?',
          next: 'menu_interesses'
        },
        'menu_interesses': {
          id: 'menu_interesses',
          type: 'buttons',
          content: 'Escolha uma das áreas de foco abaixo:',
          options: [
            { label: '🚀 Conhecer o Método Completo', next: 'apresentacao_detalhada' },
            { label: '💰 Ver Pacotes e Valores', next: 'tabela_precos' }
          ]
        },
        'apresentacao_detalhada': {
          id: 'apresentacao_detalhada',
          type: 'product',
          content: 'Excelente escolha, {{userName}}! Aqui estão todos os detalhes:',
          next: 'tabela_precos'
        },
        'tabela_precos': {
          id: 'tabela_precos',
          type: 'offer',
          content: 'Confira as opções com condições especiais ativas agora:',
          next: 'fim_qualificacao'
        },
        'fim_qualificacao': {
          id: 'fim_qualificacao',
          type: 'end',
          content: 'Qualquer dúvida adicional, estamos à disposição!',
          allowRestart: true
        }
      };
      entry = 'saudacao_lead';
    } else if (templateType === 'lead_magnet') {
      newFlows = {
        'boas_vindas_isca': {
          id: 'boas_vindas_isca',
          type: 'message',
          content: 'Olá! Parabéns por dar o primeiro passo. Aqui está o seu material gratuito de degustação:',
          next: 'card_download_pdf'
        },
        'card_download_pdf': {
          id: 'card_download_pdf',
          type: 'file',
          title: 'Guia Prático de Degustação (PDF)',
          description: 'Amostra gratuita com técnicas selecionadas para aplicar hoje.',
          fileUrl: 'assets/products/muestra-5-recetas.svg',
          downloadLabel: 'Baixar PDF Grátis',
          next: 'convite_upgrade'
        },
        'convite_upgrade': {
          id: 'convite_upgrade',
          type: 'message',
          content: 'Gostou da amostra? Você pode ter acesso à metodologia completa com todos os módulos e suporte prioritário!',
          next: 'oferta_upgrade'
        },
        'oferta_upgrade': {
          id: 'oferta_upgrade',
          type: 'offer',
          content: 'Aproveite a condição exclusiva para quem baixou a amostra:',
          next: 'fim_isca'
        },
        'fim_isca': {
          id: 'fim_isca',
          type: 'end',
          content: 'Bons estudos e conte com nossa equipe!',
          allowRestart: true
        }
      };
      entry = 'boas_vindas_isca';
    }

    this.config.flows = newFlows;
    this.config.flow_entry = entry;
    this.storage.saveCustomProduct(this.config);
    this.render();
    if (this.onSaveSuccess) this.onSaveSuccess(this.config);
    alert('Modelo pronto aplicado com sucesso! A ordem do fluxo foi atualizada na conversa.');
  }

  /**
   * Node Inspector Modal
   */
  _openNodeModal(nodeId) {
    this.editingNodeId = nodeId;
    const modal = this.container.querySelector('#node-modal');
    const modalTitle = this.container.querySelector('#node-modal-title');
    const body = this.container.querySelector('#node-modal-body');
    const form = this.container.querySelector('#node-edit-form');

    const nodes = this.config.flows || {};
    const isNew = !nodeId || !nodes[nodeId];
    const node = isNew
      ? { id: this._generateCleanId('etapa'), type: 'message', content: '', next: '' }
      : deepClone(nodes[nodeId]);

    modalTitle.textContent = isNew ? 'Nova Etapa da Conversa' : `Editar Etapa: ${node.id}`;

    const nodeTypeOptions = NODE_TYPES.map(t => `
      <option value="${t}" ${node.type === t ? 'selected' : ''}>${t.toUpperCase()}</option>
    `).join('');

    const allNodeIds = Object.keys(nodes);
    const nextOptionsHtml = `
      <option value="">-- Fim / Sem Próximo Linear --</option>
      ${allNodeIds.map(id => `<option value="${id}" ${node.next === id ? 'selected' : ''}>${id}</option>`).join('')}
    `;

    body.innerHTML = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Identificador (ID Único)</label>
          <input type="text" id="modal-node-id" class="form-input" value="${escapeHtml(node.id)}" ${!isNew ? 'readonly' : ''} required pattern="[a-zA-Z0-9_-]+">
        </div>

        <div class="form-group">
          <label class="form-label">Tipo da Etapa</label>
          <select id="modal-node-type" class="form-select">
            ${nodeTypeOptions}
          </select>
        </div>

        <div class="form-group full-width">
          <label class="form-label">Conteúdo / Texto (Suporta Markdown, negrito e {{userName}})</label>
          <textarea id="modal-node-content" class="form-textarea" rows="4">${escapeHtml(node.content || node.caption || '')}</textarea>
        </div>

        <div class="form-group full-width">
          <label class="form-label">Próxima Etapa Linear (Next)</label>
          <select id="modal-node-next" class="form-select">
            ${nextOptionsHtml}
          </select>
        </div>

        <!-- Conditional Container for Buttons -->
        <div id="modal-buttons-section" class="form-group full-width" style="${node.type === 'buttons' ? '' : 'display:none;'}">
          <label class="form-label">Opções de Botões e Destinos na Conversa</label>
          <div id="buttons-list-container" style="display:flex; flex-direction:column; gap:8px;">
            ${(node.options || []).map((opt, i) => `
              <div class="btn-row" style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="form-input opt-label" value="${escapeHtml(opt.label)}" placeholder="Texto do Botão" style="flex:2;">
                <select class="form-select opt-next" style="flex:2;">
                  <option value="">-- Destino --</option>
                  ${allNodeIds.map(nId => `<option value="${nId}" ${opt.next === nId ? 'selected' : ''}>${nId}</option>`).join('')}
                </select>
                <button type="button" class="btn-danger btn-remove-opt" style="padding:6px 10px;">✕</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="btn-secondary" id="btn-add-modal-btn" style="margin-top:8px; padding:6px 12px; font-size:12px;">+ Adicionar Botão</button>
        </div>

        <!-- Conditional Container for Media & Audio -->
        <div id="modal-media-section" class="form-group full-width" style="${(node.type === 'image' || node.type === 'video' || node.type === 'file' || node.type === 'audio') ? '' : 'display:none;'}">
          <label class="form-label" id="modal-media-label">URL da Mídia / Áudio / Arquivo</label>
          <input type="text" id="modal-node-mediaurl" class="form-input" value="${escapeHtml(node.imageUrl || node.videoUrl || node.fileUrl || node.audioUrl || node.src || '')}" placeholder="assets/... ou URL externa">
        </div>
      </div>
    `;

    // Dynamic type toggle
    const typeSelect = body.querySelector('#modal-node-type');
    const buttonsSection = body.querySelector('#modal-buttons-section');
    const mediaSection = body.querySelector('#modal-media-section');
    const mediaLabel = body.querySelector('#modal-media-label');

    const updateMediaLabel = (val) => {
      if (val === 'audio') mediaLabel.textContent = 'URL do Áudio (MP3, OGG, WAV) ou deixe vazio para simulação';
      else if (val === 'image') mediaLabel.textContent = 'URL da Imagem (assets/products/... ou https://)';
      else if (val === 'video') mediaLabel.textContent = 'URL do Vídeo (YouTube embed ou MP4)';
      else if (val === 'file') mediaLabel.textContent = 'URL do Arquivo para Download (PDF, ebook)';
      else mediaLabel.textContent = 'URL da Mídia / Áudio / Arquivo';
    };

    updateMediaLabel(node.type);

    typeSelect.addEventListener('change', () => {
      const val = typeSelect.value;
      buttonsSection.style.display = val === 'buttons' ? 'block' : 'none';
      mediaSection.style.display = (val === 'image' || val === 'video' || val === 'file' || val === 'audio') ? 'block' : 'none';
      updateMediaLabel(val);
    });

    // Add button row
    const addModalBtn = body.querySelector('#btn-add-modal-btn');
    const btnContainer = body.querySelector('#buttons-list-container');
    if (addModalBtn) {
      addModalBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'btn-row';
        div.style = 'display:flex; gap:8px; align-items:center;';
        div.innerHTML = `
          <input type="text" class="form-input opt-label" placeholder="Texto do Botão" style="flex:2;">
          <select class="form-select opt-next" style="flex:2;">
            <option value="">-- Destino --</option>
            ${allNodeIds.map(nId => `<option value="${nId}">${nId}</option>`).join('')}
          </select>
          <button type="button" class="btn-danger btn-remove-opt" style="padding:6px 10px;">✕</button>
        `;
        btnContainer.appendChild(div);
        div.querySelector('.btn-remove-opt').addEventListener('click', () => div.remove());
      });
    }

    // Bind remove button rows
    btnContainer.querySelectorAll('.btn-remove-opt').forEach(b => {
      b.addEventListener('click', (e) => e.target.closest('.btn-row').remove());
    });

    modal.style.display = 'flex';

    form.onsubmit = (e) => {
      e.preventDefault();
      const id = body.querySelector('#modal-node-id').value.trim();
      const type = body.querySelector('#modal-node-type').value;
      const content = body.querySelector('#modal-node-content').value;
      const next = body.querySelector('#modal-node-next').value;
      const mediaUrl = body.querySelector('#modal-node-mediaurl')?.value.trim();

      const updatedNode = {
        id,
        type,
        content,
        next: next || undefined
      };

      if (type === 'buttons') {
        const rows = btnContainer.querySelectorAll('.btn-row');
        const options = [];
        rows.forEach(r => {
          const l = r.querySelector('.opt-label').value.trim();
          const n = r.querySelector('.opt-next').value.trim();
          if (l && n) options.push({ label: l, next: n });
        });
        updatedNode.options = options;
      }

      if (type === 'image') updatedNode.imageUrl = mediaUrl;
      if (type === 'video') updatedNode.videoUrl = mediaUrl;
      if (type === 'file') updatedNode.fileUrl = mediaUrl;
      if (type === 'audio') {
        updatedNode.audioUrl = mediaUrl;
        updatedNode.src = mediaUrl;
        updatedNode.durationSeconds = 15;
        updatedNode.caption = content;
      }

      this.config.flows = this.config.flows || {};
      this.config.flows[id] = updatedNode;

      this.storage.saveCustomProduct(this.config);
      modal.style.display = 'none';
      this.render();
      if (this.onSaveSuccess) this.onSaveSuccess(this.config);
    };
  }
}
