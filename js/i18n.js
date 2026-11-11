/**
 * Universal Sales Chat Engine - Internationalization (i18n)
 * System UI chrome translations for pt-BR, es-MX, and en-US
 */

export const TRANSLATIONS = {
  'es-MX': {
    chat: {
      statusOnline: 'En línea ahora',
      restartBtn: 'Reiniciar',
      restartConfirm: '¿Deseas reiniciar la conversación desde el principio?',
      typing: 'escribiendo...',
      inputPlaceholder: 'Escribe tu mensaje o selecciona una opción...',
      sendAria: 'Enviar mensaje',
      optionsPrompt: 'Elige una de las siguientes opciones:',
      downloadSample: 'Descargar material de muestra',
      buyNow: 'Pagar con seguridad',
      guaranteeNotice: 'Garantía incondicional de 7 días',
      backToMenu: 'Volver al menú anterior',
      errorNotFound: 'El siguiente paso no fue encontrado. Regresando al menú principal...',
      poweredBy: 'Universal Sales Chat Engine • Experiencia interactiva de venta'
    },
    admin: {
      title: 'Panel Administrativo',
      navOverview: 'Resumen y Métricas',
      navProducts: 'Mis Productos',
      navConfig: 'Configuración General',
      navOffers: 'Ofertas y Precios',
      navFlow: 'Editor de Flujos',
      navData: 'Copias de Seguridad',
      btnSave: 'Guardar Cambios',
      btnReset: 'Restaurar Predeterminados',
      btnExport: 'Exportar JSON',
      btnImport: 'Importar JSON',
      btnNewNode: 'Agregar Nuevo Paso',
      btnTestChat: 'Probar Chat'
    }
  },
  'pt-BR': {
    chat: {
      statusOnline: 'Online agora',
      restartBtn: 'Reiniciar',
      restartConfirm: 'Deseja reiniciar a conversa desde o início?',
      typing: 'digitando...',
      inputPlaceholder: 'Digite sua mensagem ou escolha uma opção...',
      sendAria: 'Enviar mensagem',
      optionsPrompt: 'Escolha uma das opções abaixo:',
      downloadSample: 'Baixar material de amostra',
      buyNow: 'Pagar com segurança',
      guaranteeNotice: 'Garantia incondicional de 7 dias',
      backToMenu: 'Voltar ao menu anterior',
      errorNotFound: 'A próxima etapa não foi encontrada. Retornando ao menu principal...',
      poweredBy: 'Universal Sales Chat Engine • Plataforma Conversacional de Vendas'
    },
    admin: {
      title: 'Painel Administrativo',
      navOverview: 'Visão Geral & Métricas',
      navProducts: 'Meus Produtos',
      navConfig: 'Configuração Geral',
      navOffers: 'Ofertas & Preços',
      navFlow: 'Editor de Fluxos',
      navData: 'Backups & Dados',
      btnSave: 'Salvar Alterações',
      btnReset: 'Restaurar Padrões',
      btnExport: 'Exportar JSON',
      btnImport: 'Importar JSON',
      btnNewNode: 'Adicionar Nova Etapa',
      btnTestChat: 'Testar Chat'
    }
  },
  'en-US': {
    chat: {
      statusOnline: 'Online now',
      restartBtn: 'Restart',
      restartConfirm: 'Do you want to restart the conversation from the beginning?',
      typing: 'is typing...',
      inputPlaceholder: 'Type a message or select an option...',
      sendAria: 'Send message',
      optionsPrompt: 'Choose one of the options below:',
      downloadSample: 'Download sample resource',
      buyNow: 'Proceed to Secure Checkout',
      guaranteeNotice: '7-day unconditional money-back guarantee',
      backToMenu: 'Back to main menu',
      errorNotFound: 'Next step could not be found. Returning to main menu...',
      poweredBy: 'Universal Sales Chat Engine • Conversational Sales Platform'
    },
    admin: {
      title: 'Admin Control Center',
      navOverview: 'Overview & Metrics',
      navProducts: 'Products',
      navConfig: 'General Config',
      navOffers: 'Offers & Pricing',
      navFlow: 'Flow Editor',
      navData: 'Backups & Data',
      btnSave: 'Save Changes',
      btnReset: 'Restore Defaults',
      btnExport: 'Export JSON',
      btnImport: 'Import JSON',
      btnNewNode: 'Add New Step',
      btnTestChat: 'Test Live Chat'
    }
  }
};

/**
 * Retrieves translated string by path (e.g. 'chat.restartBtn')
 * @param {string} path 
 * @param {string} lang 
 * @returns {string}
 */
export function t(path, lang = 'es-MX') {
  const dictionary = TRANSLATIONS[lang] || TRANSLATIONS['es-MX'] || TRANSLATIONS['pt-BR'];
  const parts = path.split('.');
  let current = dictionary;
  for (const part of parts) {
    if (current && current[part] !== undefined) {
      current = current[part];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}
