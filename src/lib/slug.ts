export const MAX_SLUG_LENGTH = 63

const whitespaceOrUnderscore = /[\s_]+/g
const invalidCharacters = /[^a-z0-9-]/g
const repeatedHyphens = /-+/g
const edgeHyphens = /^-+|-+$/g
const trailingHyphens = /-+$/g

export const normalizeSlug = (value: string): string => {
  let slug = value.trim().toLowerCase()
  if (!slug) {
    return ''
  }

  slug = slug.replace(whitespaceOrUnderscore, '-')
  slug = slug.replace(invalidCharacters, '')
  slug = slug.replace(repeatedHyphens, '-')
  slug = slug.replace(edgeHyphens, '')

  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH)
    slug = slug.replace(trailingHyphens, '')
  }

  return slug
}
