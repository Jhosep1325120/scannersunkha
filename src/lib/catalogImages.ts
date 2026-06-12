// Comentario: Resuelve imagenes de catalogos de productos y cortes.
function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const productImageByKeyword: Array<{ keywords: string[]; src: string }> = [
  { keywords: ['pomada', 'matte'], src: '/products/pomada-matte.svg' },
  { keywords: ['cera', 'brillo'], src: '/products/cera-brillo.svg' },
  { keywords: ['aceite', 'barba'], src: '/products/aceite-barba.svg' },
  { keywords: ['shampoo', 'anticaida'], src: '/products/shampoo-anticaida.svg' },
  { keywords: ['spray', 'texturizante'], src: '/products/spray-texturizante.svg' },
]

const haircutImageByKeyword: Array<{ keywords: string[]; src: string }> = [
  { keywords: ['taper', 'fade'], src: 'https://images.pexels.com/photos/8972501/pexels-photo-8972501.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['low', 'fade'], src: 'https://images.pexels.com/photos/2076932/pexels-photo-2076932.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['mid', 'fade'], src: 'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['high', 'fade'], src: 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['skin', 'fade'], src: 'https://images.pexels.com/photos/1570807/pexels-photo-1570807.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['mod', 'cut'], src: 'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['french', 'crop'], src: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['quiff'], src: 'https://images.pexels.com/photos/2531550/pexels-photo-2531550.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['pompadour'], src: 'https://images.pexels.com/photos/3992879/pexels-photo-3992879.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['buzz', 'cut'], src: 'https://images.pexels.com/photos/8866188/pexels-photo-8866188.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['mullet'], src: 'https://images.pexels.com/photos/5325816/pexels-photo-5325816.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { keywords: ['undercut'], src: 'https://images.pexels.com/photos/7697398/pexels-photo-7697398.jpeg?auto=compress&cs=tinysrgb&w=1200' },
]

function resolveByKeyword(
  label: string,
  mapping: Array<{ keywords: string[]; src: string }>,
  fallback: string
) {
  const normalized = normalizeLabel(label)
  const match = mapping.find((entry) =>
    entry.keywords.every((keyword) => normalized.includes(keyword))
  )
  return match?.src ?? fallback
}

export function resolveProductImageSrc(name: string, imageUrl: string | null) {
  if (imageUrl && imageUrl.trim()) return imageUrl
  return resolveByKeyword(name, productImageByKeyword, '/products/default.svg')
}

export function resolveHaircutImageSrc(name: string, imageUrl: string | null) {
  if (imageUrl && imageUrl.trim()) return imageUrl
  return resolveByKeyword(name, haircutImageByKeyword, '/haircuts/default.svg')
}
