/**
 * Universal Sales Chat Engine - Validation Utility
 * Validates product configurations, flow integrity, checkout security, and graph completeness.
 */

export const NODE_TYPES = [
  'message',
  'image',
  'video',
  'audio',
  'buttons',
  'product',
  'offer',
  'file',
  'checkout',
  'input',
  'condition',
  'delay',
  'end'
];

/**
 * Validates a complete product configuration schema
 * @param {any} config 
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateProductConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['A configuração do produto deve ser um objeto válido.'], warnings: [] };
  }

  if (!config.id || typeof config.id !== 'string') {
    errors.push('Campo obrigatório ausente ou inválido: "id".');
  }

  if (!config.slug || typeof config.slug !== 'string') {
    errors.push('Campo obrigatório ausente ou inválido: "slug".');
  } else if (!/^[a-z0-9-_]+$/.test(config.slug)) {
    errors.push('O slug deve conter apenas letras minúsculas, números, hífens e sublinhados.');
  }

  if (!config.name || typeof config.name !== 'string') {
    errors.push('Campo obrigatório ausente ou inválido: "name".');
  }

  if (!config.flow_entry || typeof config.flow_entry !== 'string') {
    errors.push('Campo obrigatório ausente: "flow_entry" (nó inicial do fluxo).');
  }

  if (!config.flows || typeof config.flows !== 'object') {
    errors.push('Campo obrigatório ausente ou inválido: "flows" (mapa de nós de conversa).');
  } else {
    const flowCheck = validateFlowGraph(config.flows, config.flow_entry);
    errors.push(...flowCheck.errors);
    warnings.push(...flowCheck.warnings);
  }

  // Validate offers
  if (Array.isArray(config.offers)) {
    config.offers.forEach((offer, idx) => {
      if (!offer.id) errors.push(`Oferta #${idx + 1} não possui "id".`);
      if (!offer.name) errors.push(`Oferta #${idx + 1} não possui "name".`);
      if (typeof offer.price !== 'number' || offer.price < 0) {
        warnings.push(`Oferta "${offer.name || idx}" tem preço não-numérico ou negativo.`);
      }
      if (!offer.checkoutUrl) {
        warnings.push(`Oferta "${offer.name || idx}" não possui link de checkout.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates the conversational flow graph structure
 * @param {Record<string, any>} nodes 
 * @param {string} startNodeId 
 * @returns {{ valid: boolean, errors: string[], warnings: string[], stats: any }}
 */
export function validateFlowGraph(nodes, startNodeId) {
  const errors = [];
  const warnings = [];
  const nodeKeys = Object.keys(nodes || {});

  if (nodeKeys.length === 0) {
    return {
      valid: false,
      errors: ['Nenhum nó de conversa cadastrado no fluxo.'],
      warnings: [],
      stats: { totalNodes: 0 }
    };
  }

  if (!startNodeId || !nodes[startNodeId]) {
    errors.push(`Nó inicial "${startNodeId}" não existe na lista de nós.`);
  }

  const visitedReachable = new Set();
  const forwardPointers = new Map();

  // Validate each node
  for (const [key, node] of Object.entries(nodes)) {
    if (!node.id) {
      errors.push(`O nó na chave "${key}" não tem campo "id".`);
    } else if (node.id !== key) {
      warnings.push(`O nó id="${node.id}" difere da chave no objeto ("${key}").`);
    }

    if (!node.type || !NODE_TYPES.includes(node.type)) {
      errors.push(`Nó "${key}" tem tipo inválido ou ausente: "${node.type}". Tipos permitidos: ${NODE_TYPES.join(', ')}.`);
    }

    const nextNodes = [];

    // Next linear pointer
    if (node.next) {
      if (!nodes[node.next]) {
        errors.push(`Nó "${key}" aponta para um nó inexistente em "next": "${node.next}".`);
      } else {
        nextNodes.push(node.next);
      }
    }

    // Button options
    if (node.type === 'buttons' || Array.isArray(node.options)) {
      if (Array.isArray(node.options)) {
        if (node.options.length === 0) {
          warnings.push(`Nó de botões "${key}" não possui nenhuma opção de botão.`);
        }
        node.options.forEach((opt, idx) => {
          if (!opt.label) {
            errors.push(`Nó "${key}", botão #${idx + 1} não tem texto ("label").`);
          }
          if (!opt.next) {
            errors.push(`Nó "${key}", botão "${opt.label || idx}" não tem destino ("next").`);
          } else if (!nodes[opt.next]) {
            errors.push(`Nó "${key}", botão "${opt.label}" aponta para destino inexistente: "${opt.next}".`);
          } else {
            nextNodes.push(opt.next);
          }
        });
      }
    }

    // Condition node
    if (node.type === 'condition') {
      if (node.ifTrue && !nodes[node.ifTrue]) {
        errors.push(`Nó condicional "${key}" tem "ifTrue" inexistente: "${node.ifTrue}".`);
      } else if (node.ifTrue) {
        nextNodes.push(node.ifTrue);
      }
      if (node.ifFalse && !nodes[node.ifFalse]) {
        errors.push(`Nó condicional "${key}" tem "ifFalse" inexistente: "${node.ifFalse}".`);
      } else if (node.ifFalse) {
        nextNodes.push(node.ifFalse);
      }
    }

    // End node
    if (node.type !== 'end' && nextNodes.length === 0 && !node.next) {
      warnings.push(`Nó "${key}" (tipo "${node.type}") não possui saída (next/botões) e não é do tipo "end". O visitante pode ficar preso.`);
    }

    forwardPointers.set(key, nextNodes);
  }

  // Reachability analysis from startNodeId
  if (startNodeId && nodes[startNodeId]) {
    const queue = [startNodeId];
    while (queue.length > 0) {
      const curr = queue.shift();
      if (!visitedReachable.has(curr)) {
        visitedReachable.add(curr);
        const children = forwardPointers.get(curr) || [];
        for (const child of children) {
          if (!visitedReachable.has(child)) {
            queue.push(child);
          }
        }
      }
    }

    // Identify unreachable orphan nodes
    for (const key of nodeKeys) {
      if (!visitedReachable.has(key)) {
        warnings.push(`Nó órfão não alcançável a partir do início: "${key}".`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalNodes: nodeKeys.length,
      reachableNodes: visitedReachable.size,
      orphanNodes: nodeKeys.length - visitedReachable.size
    }
  };
}
