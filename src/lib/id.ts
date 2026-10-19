// crypto.randomUUID n'existe qu'en contexte sécurisé (HTTPS) : repli pour le test en réseau local.
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && window.isSecureContext) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
