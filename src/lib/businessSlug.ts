// Comentario: Normaliza slugs de negocios y alias publicos.
const SLUG_ALIASES: Record<string, string> = {
  'barberia-sunkha': 'barberia-centro',
}

export function toCanonicalBusinessSlug(rawSlug: string) {
  const normalized = String(rawSlug ?? '').trim().toLowerCase()
  return SLUG_ALIASES[normalized] ?? normalized
}
