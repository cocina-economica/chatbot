/**
 * Universal Sales Chat Engine - Centralized Flow & Public Access Policy
 * Defines the single authoritative public flow and strict environment policies.
 */

export const FLOW_CONFIG = {
  /**
   * The single authoritative public product slug for production.
   * This is the only flow loaded by default for end-users on GitHub Pages.
   */
  PUBLIC_PRODUCT_SLUG: 'cocina-inteligente',

  /**
   * The default entry node for the public flow.
   */
  PUBLIC_DEFAULT_ENTRY: 'welcome_1',

  /**
   * Whether to allow URL parameters (?product=, ?entry=, ?flow=) to override
   * the public flow in production.
   * STRICT SECURITY RULE: Must be false for public deployments on GitHub Pages.
   */
  ALLOW_ARBITRARY_FLOW_OVERRIDE: false,

  /**
   * Allowed campaign marketing parameters for the public flow.
   * These parameters target specific offers within the authorized public flow
   * but CANNOT switch to unauthorized products or arbitrary non-offer nodes.
   */
  ALLOWED_CAMPAIGN_PARAMS: ['offer', 'off', 'direct', 'direto', 'single', 'only', 'nofs'],

  /**
   * Secret or token required to activate preview/test mode via URL
   * e.g. ?preview_token=dev_preview_mode
   */
  PREVIEW_TOKEN: 'preview_dev_mode',

  /**
   * Registered available products in the repository.
   * Non-public products are available for admin, development, and test suites only.
   */
  REGISTERED_FLOWS: {
    'cocina-inteligente': {
      name: 'Cocina Inteligente',
      entryNode: 'welcome_1',
      status: 'active_public',
      language: 'es-MX'
    },
    'produtividade-ninja': {
      name: 'Produtividade Ninja',
      entryNode: 'ninja_welcome',
      status: 'development_only',
      language: 'pt-BR'
    }
  }
};

/**
 * Determines whether the current execution context is an authorized development/test environment.
 * @param {Location} [loc] 
 * @returns {boolean}
 */
export function isDevEnvironment(loc = (typeof window !== 'undefined' ? window.location : null)) {
  if (!loc) return false;
  const hostname = loc.hostname || '';
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '' || // file:// protocol
    hostname.endsWith('.local')
  );
}

/**
 * Resolves the authorized product slug and entry node for the chat session.
 * In public production, strictly enforces PUBLIC_PRODUCT_SLUG.
 * In development or with explicit preview authorization, allows controlled testing.
 * 
 * @param {URLSearchParams|string} [searchParams]
 * @param {Location} [loc]
 * @returns {{ productSlug: string, isPreviewMode: boolean, entryNode: string|null }}
 */
export function resolveAuthorizedFlow(searchParams, loc = (typeof window !== 'undefined' ? window.location : null)) {
  const params = searchParams instanceof URLSearchParams 
    ? searchParams 
    : new URLSearchParams(typeof searchParams === 'string' ? searchParams : (loc?.search || ''));

  const requestedSlug = params.get('product') || params.get('p');
  const requestedEntry = params.get('entry') || params.get('flow');
  const token = params.get('preview_token') || params.get('dev_token');

  const isDev = isDevEnvironment(loc);
  const isAuthorizedPreview = isDev || (token && token === FLOW_CONFIG.PREVIEW_TOKEN);

  // If in authorized preview/dev mode and an existing registered slug is requested
  if (isAuthorizedPreview && requestedSlug && FLOW_CONFIG.REGISTERED_FLOWS[requestedSlug]) {
    return {
      productSlug: requestedSlug,
      isPreviewMode: true,
      entryNode: requestedEntry || FLOW_CONFIG.REGISTERED_FLOWS[requestedSlug].entryNode
    };
  }

  // If arbitrary overrides are disabled (production default), lock strictly to public flow
  if (!FLOW_CONFIG.ALLOW_ARBITRARY_FLOW_OVERRIDE) {
    return {
      productSlug: FLOW_CONFIG.PUBLIC_PRODUCT_SLUG,
      isPreviewMode: false,
      entryNode: FLOW_CONFIG.PUBLIC_DEFAULT_ENTRY
    };
  }

  // Fallback
  return {
    productSlug: FLOW_CONFIG.PUBLIC_PRODUCT_SLUG,
    isPreviewMode: false,
    entryNode: FLOW_CONFIG.PUBLIC_DEFAULT_ENTRY
  };
}
