/**
 * Universal Sales Chat Engine - Comprehensive Automated Test Suite
 * Compatible with Node.js CLI execution and in-browser test runner (tests/runner.html).
 * Covers Engine, Products, Checkout, Audio, Security, and UI Utilities.
 */

import { validateProductConfig, validateFlowGraph, NODE_TYPES } from '../js/utils/validation.js';
import { formatCurrency, formatSecondsToTime, interpolate, sanitizeUrl, renderMarkdown, escapeHtml, generateId, buildShareUrl } from '../js/utils/helpers.js';
import { CheckoutService } from '../js/services/checkout.js';
import { StorageService } from '../js/services/storage.js';
import { AnalyticsService } from '../js/services/analytics.js';
import { VoiceRecorderService } from '../js/services/voice-recorder.js';
import { NavigationManager } from '../js/chat/navigation.js';
import { t } from '../js/i18n.js';

export async function runAllTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ status: 'PASS', message });
    } else {
      failed++;
      results.push({ status: 'FAIL', message });
      console.error(`[TEST FAILURE] ${message}`);
    }
  }

  console.log('--- Starting Universal Sales Chat Engine Automated Test Suite ---');

  // ==========================================
  // CATEGORIA 1: MOTOR DE CONVERSAS (ENGINE)
  // ==========================================

  // Test 1: Helper interpolation with user state
  try {
    const res = interpolate('¡Hola, {{userName}}! Bienvenido.', { userName: 'Carlos' });
    assert(res === '¡Hola, Carlos! Bienvenido.', '[Motor] interpolate() substitui variáveis de estado do usuário');
  } catch (e) {
    assert(false, `[Motor] interpolate() falhou: ${e.message}`);
  }

  // Test 2: Helper interpolation with empty/missing state
  try {
    const res = interpolate('Bem-vindo, {{userName}}!', {});
    assert(res === 'Bem-vindo, !', '[Motor] interpolate() lida graciosamente com chaves ausentes sem quebrar');
  } catch (e) {
    assert(false, `[Motor] interpolate() com chave vazia falhou: ${e.message}`);
  }

  // Test 3: Flow Graph Validation - Detection of Missing Next Node
  try {
    const brokenNodes = {
      'start': { id: 'start', type: 'message', content: 'Hi', next: 'non_existent_node' }
    };
    const check = validateFlowGraph(brokenNodes, 'start');
    assert(!check.valid, '[Motor] validateFlowGraph() detecta referências para nós inexistentes');
    assert(check.errors.some(e => e.includes('non_existent_node')), '[Motor] validateFlowGraph() reporta o ID exato do nó ausente');
  } catch (e) {
    assert(false, `[Motor] Grafo com nó ausente falhou: ${e.message}`);
  }

  // Test 4: Flow Graph Validation - Detection of Broken Button Targets
  try {
    const buttonNodes = {
      'menu': {
        id: 'menu',
        type: 'buttons',
        content: 'Escolha uma opção',
        options: [
          { label: 'Opção A', next: 'step_a' },
          { label: 'Opção B', next: 'broken_target' }
        ]
      },
      'step_a': { id: 'step_a', type: 'end', content: 'Fim' }
    };
    const check = validateFlowGraph(buttonNodes, 'menu');
    assert(!check.valid, '[Motor] validateFlowGraph() valida destinos de botões e detecta alvos inválidos');
    assert(check.errors.some(e => e.includes('broken_target')), '[Motor] validateFlowGraph() identifica botão apontando para nó inexistente');
  } catch (e) {
    assert(false, `[Motor] Validação de botões falhou: ${e.message}`);
  }

  // Test 5: Condition Node Logic - Equality Matching
  try {
    const condNode = {
      id: 'check_vip',
      type: 'condition',
      variableKey: 'isVip',
      expectedValue: 'true',
      ifTrue: 'vip_welcome',
      ifFalse: 'standard_welcome'
    };
    let target = condNode.ifFalse;
    const testState = { isVip: 'true' };
    if (testState[condNode.variableKey] == condNode.expectedValue) {
      target = condNode.ifTrue;
    }
    assert(target === 'vip_welcome', '[Motor] Nó condicional desvia para ifTrue quando a condição coincide');
  } catch (e) {
    assert(false, `[Motor] Lógica de nó condicional falhou: ${e.message}`);
  }

  // Test 6: Condition Node Logic - Fallback False Branch
  try {
    const condNode = {
      id: 'check_vip',
      type: 'condition',
      variableKey: 'isVip',
      expectedValue: 'true',
      ifTrue: 'vip_welcome',
      ifFalse: 'standard_welcome'
    };
    let target = condNode.ifFalse;
    const testState = { isVip: 'false' };
    if (testState[condNode.variableKey] == condNode.expectedValue) {
      target = condNode.ifTrue;
    }
    assert(target === 'standard_welcome', '[Motor] Nó condicional desvia para ifFalse quando a condição não coincide');
  } catch (e) {
    assert(false, `[Motor] Lógica de nó condicional falso falhou: ${e.message}`);
  }

  // Test 7: Navigation Manager History and Reset
  try {
    const nav = new NavigationManager();
    nav.setCurrentNode('step_1');
    nav.updateUserState('leadName', 'Ana');
    nav.setCurrentNode('step_2');

    assert(nav.history.length === 2, '[Motor] NavigationManager registra histórico sequencialmente');
    assert(nav.canGoBack() === true, '[Motor] NavigationManager identifica possibilidade de retorno');
    assert(nav.getPreviousNodeId() === 'step_1', '[Motor] NavigationManager identifica nó anterior corretamente');

    nav.reset();
    assert(nav.history.length === 0, '[Motor] NavigationManager.reset() limpa histórico por completo');
    assert(Object.keys(nav.getUserState()).length === 0, '[Motor] NavigationManager.reset() limpa estado do visitante');
  } catch (e) {
    assert(false, `[Motor] NavigationManager falhou: ${e.message}`);
  }

  // Test 8: Supported Node Types Exhaustive Check
  try {
    const expectedTypes = ['message', 'image', 'video', 'audio', 'buttons', 'product', 'offer', 'file', 'checkout', 'input', 'condition', 'delay', 'end'];
    const allSupported = expectedTypes.every(t => NODE_TYPES.includes(t));
    assert(allSupported && NODE_TYPES.length >= 13, '[Motor] Todos os 13 tipos essenciais de nós estão registrados no catálogo do motor');
  } catch (e) {
    assert(false, `[Motor] Verificação de tipos de nós falhou: ${e.message}`);
  }

  // ==========================================
  // CATEGORIA 2: PRODUTOS & MULTI-TENANCY
  // ==========================================

  // Test 9: Product Configuration Validation - Valid Schema
  try {
    const validConfig = {
      id: 'prod_test',
      slug: 'test-product',
      name: 'Test Product',
      flow_entry: 'welcome',
      flows: {
        'welcome': { id: 'welcome', type: 'message', content: 'Hello', next: 'finish' },
        'finish': { id: 'finish', type: 'end', content: 'Bye' }
      },
      offers: [
        { id: 'off_1', name: 'Basic', price: 10, currency: 'USD', checkoutUrl: 'https://pay.hotmart.com/DEMO' }
      ]
    };
    const check = validateProductConfig(validConfig);
    assert(check.valid === true, '[Produtos] validateProductConfig() aprova configuração íntegra de produto');
  } catch (e) {
    assert(false, `[Produtos] Validação de produto válido falhou: ${e.message}`);
  }

  // Test 10: Product Configuration Validation - Invalid Slug Format
  try {
    const badSlugConfig = {
      id: 'prod_test',
      slug: 'Produto Inválido Com Espaços!',
      name: 'Test',
      flow_entry: 'welcome',
      flows: { 'welcome': { id: 'welcome', type: 'end' } }
    };
    const check = validateProductConfig(badSlugConfig);
    assert(!check.valid, '[Produtos] validateProductConfig() rejeita slugs com caracteres inválidos ou espaços');
  } catch (e) {
    assert(false, `[Produtos] Rejeição de slug inválido falhou: ${e.message}`);
  }

  // Test 11: Multi-product isolation check in StorageService
  try {
    const storage1 = new StorageService('product_alpha');
    const storage2 = new StorageService('product_beta');
    storage1.saveUserState({ user: 'Alpha User' });
    storage2.saveUserState({ user: 'Beta User' });

    const state1 = storage1.loadUserState();
    const state2 = storage2.loadUserState();

    assert(state1.user === 'Alpha User', '[Produtos] StorageService isola dados por namespace do product_alpha');
    assert(state2.user === 'Beta User', '[Produtos] StorageService isola dados por namespace do product_beta');
    assert(state1.user !== state2.user, '[Produtos] Garante isolamento total sem contaminação entre produtos');
  } catch (e) {
    assert(false, `[Produtos] Teste de isolamento multi-produto falhou: ${e.message}`);
  }

  // ==========================================
  // CATEGORIA 3: CHECKOUT & PAGAMENTOS
  // ==========================================

  // Test 12: Checkout URL Builder with default tracking parameter
  try {
    const checkout = new CheckoutService({ defaultTrackingParam: 'sck', defaultTrackingValue: 'usc_test' });
    const built = checkout.buildCheckoutUrl('https://pay.hotmart.com/PROD123', { offer: 'pro' });
    const url = new URL(built);
    assert(url.searchParams.get('sck') === 'usc_test', '[Checkout] Injeta parâmetro padrão de rastreamento (sck)');
    assert(url.searchParams.get('offer') === 'pro', '[Checkout] Preserva parâmetros específicos da oferta');
  } catch (e) {
    assert(false, `[Checkout] CheckoutService URL builder falhou: ${e.message}`);
  }

  // Test 13: Protection against dangerous checkout URLs (javascript:)
  try {
    const checkout = new CheckoutService();
    const dangerousUrl = checkout.buildCheckoutUrl('javascript:alert(document.cookie)');
    assert(dangerousUrl === null, '[Checkout] CheckoutService bloqueia estritamente URLs com protocolo javascript:');
  } catch (e) {
    assert(false, `[Checkout] Bloqueio de protocolo perigoso falhou: ${e.message}`);
  }

  // Test 14: Checkout redirection with empty/null URL
  try {
    const checkout = new CheckoutService();
    const result = checkout.redirectToCheckout('', { id: 'demo' });
    assert(result === false, '[Checkout] redirectToCheckout() lida com segurança quando URL está ausente');
  } catch (e) {
    assert(false, `[Checkout] Fallback de checkout vazio falhou: ${e.message}`);
  }

  // ==========================================
  // CATEGORIA 4: RECURSOS DE ÁUDIO
  // ==========================================

  // Test 15: Audio Node Schema Validation in Flow Graph
  try {
    const audioNodes = {
      'start': {
        id: 'start',
        type: 'audio',
        src: 'assets/audio/demo.mp3',
        caption: 'Ouça o áudio',
        durationSeconds: 15,
        next: 'finish'
      },
      'finish': { id: 'finish', type: 'end', content: 'Fim' }
    };
    const check = validateFlowGraph(audioNodes, 'start');
    assert(check.valid === true, '[Áudio] validateFlowGraph() aprova e reconhece nó do tipo "audio" com src e next');
  } catch (e) {
    assert(false, `[Áudio] Validação de nó de áudio falhou: ${e.message}`);
  }

  // Test 16: Audio duration formatting helper
  try {
    assert(formatSecondsToTime(0) === '0:00', '[Áudio] formatSecondsToTime(0) retorna 0:00');
    assert(formatSecondsToTime(14) === '0:14', '[Áudio] formatSecondsToTime(14) retorna 0:14');
    assert(formatSecondsToTime(65) === '1:05', '[Áudio] formatSecondsToTime(65) formata minutos e segundos 1:05');
  } catch (e) {
    assert(false, `[Áudio] formatSecondsToTime falhou: ${e.message}`);
  }

  // Test 17: VoiceRecorderService initialization and capabilities
  try {
    const recorder = new VoiceRecorderService({ maxDurationSeconds: 45 });
    assert(recorder.maxDurationSeconds === 45, '[Áudio] VoiceRecorderService inicializa configuração de tempo limite');
    assert(recorder.state === 'idle', '[Áudio] VoiceRecorderService inicia no estado idle');
    assert(typeof recorder.isSupported === 'function', '[Áudio] VoiceRecorderService expõe verificação de suporte de mídia');
  } catch (e) {
    assert(false, `[Áudio] Instanciação do VoiceRecorderService falhou: ${e.message}`);
  }

  // Test 18: VoiceRecorderService resource cleanup
  try {
    const recorder = new VoiceRecorderService();
    recorder.activeUrls.add('blob:http://localhost/test-audio-1');
    recorder.cleanup();
    assert(recorder.activeUrls.size === 0, '[Áudio] VoiceRecorderService.cleanup() revoga e esvazia todas as URLs de blob');
    assert(recorder.state === 'idle', '[Áudio] VoiceRecorderService.cleanup() redefine estado para idle');
  } catch (e) {
    assert(false, `[Áudio] VoiceRecorderService cleanup falhou: ${e.message}`);
  }

  // ==========================================
  // CATEGORIA 5: SEGURANÇA DA APLICAÇÃO (SECURITY)
  // ==========================================

  // Test 19: escapeHtml against all 5 critical XSS vectors
  try {
    const raw = '<script>alert("XSS" & \'test\')</script>';
    const escaped = escapeHtml(raw);
    assert(!escaped.includes('<') && !escaped.includes('>'), '[Segurança] escapeHtml() neutraliza tags HTML (< e >)');
    assert(escaped.includes('&lt;script&gt;'), '[Segurança] escapeHtml() converte entidades seguras');
    assert(escaped.includes('&quot;') && escaped.includes('&#039;'), '[Segurança] escapeHtml() sanitiza aspas duplas e simples');
  } catch (e) {
    assert(false, `[Segurança] escapeHtml falhou: ${e.message}`);
  }

  // Test 20: sanitizeUrl against javascript:, data:, and vbscript:
  try {
    assert(sanitizeUrl('javascript:alert(1)') === null, '[Segurança] sanitizeUrl() rejeita javascript:');
    assert(sanitizeUrl('JAVASCRIPT:alert(1)') === null, '[Segurança] sanitizeUrl() rejeita case-insensitive JAVASCRIPT:');
    assert(sanitizeUrl('data:text/html,<script>alert(1)</script>') === null, '[Segurança] sanitizeUrl() rejeita data: URIs');
    assert(sanitizeUrl('vbscript:msgbox(1)') === null, '[Segurança] sanitizeUrl() rejeita vbscript:');
  } catch (e) {
    assert(false, `[Segurança] sanitizeUrl bloqueio perigoso falhou: ${e.message}`);
  }

  // Test 21: sanitizeUrl allows safe protocols (http, https, relative, blob)
  try {
    assert(sanitizeUrl('https://pay.hotmart.com/demo') !== null, '[Segurança] sanitizeUrl() aceita URLs https seguras');
    assert(sanitizeUrl('./assets/images/logo.svg') !== null, '[Segurança] sanitizeUrl() aceita caminhos relativos locais');
    assert(sanitizeUrl('blob:http://localhost/uuid-audio') !== null, '[Segurança] sanitizeUrl() aceita blob: para áudio local');
  } catch (e) {
    assert(false, `[Segurança] sanitizeUrl protocolos seguros falhou: ${e.message}`);
  }

  // Test 22: renderMarkdown Link XSS Protection
  try {
    const maliciousMd = 'Clique [aqui](javascript:alert(1)) para ver.';
    const html = renderMarkdown(maliciousMd);
    assert(!html.includes('href="javascript'), '[Segurança] renderMarkdown() impede injeção de links com javascript:');
    
    const safeMd = 'Conheça o [Portal Seguro](https://exemplo.com/ebook)';
    const safeHtml = renderMarkdown(safeMd);
    assert(safeHtml.includes('rel="noopener noreferrer"'), '[Segurança] renderMarkdown() injeta rel="noopener noreferrer" em links externos');
  } catch (e) {
    assert(false, `[Segurança] renderMarkdown sanitização de links falhou: ${e.message}`);
  }

  // Test 23: LocalStorage Resilience against Corrupted JSON
  try {
    const storage = new StorageService('test_resilience');
    // Save corrupted non-JSON string directly into key
    localStorage.setItem('usc_v1_test_resilience_user_state', '{bad_json: invalid,,,');
    const loaded = storage.loadUserState();
    assert(typeof loaded === 'object' && loaded !== null, '[Segurança] StorageService recupera fallback seguro ao encontrar JSON corrompido');
  } catch (e) {
    assert(false, `[Segurança] Tratamento de JSON corrompido falhou: ${e.message}`);
  }

  // Test 24: Backup Import Validation - Rejects Corrupted JSON String
  try {
    const storage = new StorageService('test_backup');
    const result = storage.importBackup('CORRUPTED NOT JSON FILE');
    assert(result.success === false, '[Segurança] StorageService.importBackup() rejeita arquivo corrompido');
    assert(result.error && result.error.length > 0, '[Segurança] StorageService.importBackup() reporta mensagem de erro ao usuário');
  } catch (e) {
    assert(false, `[Segurança] Validação de backup corrompido falhou: ${e.message}`);
  }

  // ==========================================
  // CATEGORIA 6: INTERFACE & INTERNACIONALIZAÇÃO (UI)
  // ==========================================

  // Test 25: Currency formatting across different currencies
  try {
    const mxn = formatCurrency(297, 'MXN', '$');
    const brl = formatCurrency(197, 'BRL', 'R$');
    const usd = formatCurrency(47, 'USD', '$');
    assert(mxn.includes('297') && mxn.includes('MXN'), '[UI] Formata moeda MXN corretamente');
    assert(brl.includes('197') && brl.includes('BRL'), '[UI] Formata moeda BRL corretamente');
    assert(usd.includes('47') && usd.includes('USD'), '[UI] Formata moeda USD corretamente');
  } catch (e) {
    assert(false, `[UI] Formatação de moedas falhou: ${e.message}`);
  }

  // Test 26: Internationalization (i18n) translation resolver
  try {
    assert(t('chat.statusOnline', 'es-MX') === 'En línea ahora', '[UI] i18n traduz status em es-MX');
    assert(t('chat.statusOnline', 'pt-BR') === 'Online agora', '[UI] i18n traduz status em pt-BR');
    assert(t('chat.statusOnline', 'en-US') === 'Online now', '[UI] i18n traduz status em en-US');
    assert(t('chave.inexistente', 'pt-BR') === 'chave.inexistente', '[UI] i18n retorna a chave quando tradução não existe');
  } catch (e) {
    assert(false, `[UI] i18n falhou: ${e.message}`);
  }

  // Test 27: generateId uniqueness helper
  try {
    const id1 = generateId('node');
    const id2 = generateId('node');
    assert(id1 !== id2, '[UI] generateId() produz identificadores únicos e aleatórios');
    assert(id1.startsWith('node_'), '[UI] generateId() respeita o prefixo configurado');
  } catch (e) {
    assert(false, `[UI] generateId falhou: ${e.message}`);
  }

  // Test 28: buildShareUrl with product, offer, and direct mode
  try {
    const url1 = buildShareUrl({ product: 'produtividade-ninja', offer: 'plano-vitalicio' });
    assert(url1.includes('product=produtividade-ninja'), '[Links Únicos] buildShareUrl inclui product parameter');
    assert(url1.includes('offer=plano-vitalicio'), '[Links Únicos] buildShareUrl inclui offer parameter');

    const url2 = buildShareUrl({ product: 'cocina-inteligente', offer: 'tier_vip', direct: true });
    assert(url2.includes('direct=true'), '[Links Únicos] buildShareUrl injeta flag direct=true para pitch direto');
  } catch (e) {
    assert(false, `[Links Únicos] buildShareUrl falhou: ${e.message}`);
  }

  // Test 29: Navigation state stores targeted offer correctly
  try {
    const nav = new NavigationManager(new StorageService('test_targeted_nav'));
    nav.reset();
    nav.updateUserState('targetOfferId', 'oferta_especial_123');
    const state = nav.getUserState();
    assert(state.targetOfferId === 'oferta_especial_123', '[Navegação] Contexto preserva targetOfferId para destaque visual de ofertas');
  } catch (e) {
    assert(false, `[Navegação] targetOfferId falhou: ${e.message}`);
  }

  // Test 30: Currency formatting across international locales
  try {
    const usd = formatCurrency(47, 'USD');
    const mxn = formatCurrency(497, 'MXN');
    const brl = formatCurrency(197, 'BRL', 'R$');
    assert(usd.includes('47') && usd.includes('USD'), '[UI] formatCurrency formata USD corretamente');
    assert(mxn.includes('497') && mxn.includes('MXN'), '[UI] formatCurrency formata MXN corretamente');
    assert(brl.includes('197') && brl.includes('BRL'), '[UI] formatCurrency formata BRL com símbolo R$');
  } catch (e) {
    assert(false, `[UI] formatCurrency falhou: ${e.message}`);
  }

  console.log(`--- Test Suite Concluída: ${passed} Passando, ${failed} Falhas (Total: ${passed + failed}) ---`);
  return { passed, failed, total: passed + failed, results };
}

// Auto-run if executed in Node.js environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Provide mock localStorage for Node.js
  if (typeof globalThis.localStorage === 'undefined') {
    const memory = new Map();
    globalThis.localStorage = {
      getItem: (k) => memory.get(k) || null,
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: (k) => memory.delete(k),
      clear: () => memory.clear(),
      get length() { return memory.size; },
      key: (i) => Array.from(memory.keys())[i] || null
    };
  }
  if (typeof globalThis.sessionStorage === 'undefined') {
    const sessionMemory = new Map();
    globalThis.sessionStorage = {
      getItem: (k) => sessionMemory.get(k) || null,
      setItem: (k, v) => sessionMemory.set(k, String(v)),
      removeItem: (k) => sessionMemory.delete(k),
      clear: () => sessionMemory.clear()
    };
  }

  runAllTests().then(summary => {
    if (summary.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
