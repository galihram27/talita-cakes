import { useSeoMeta, useHead } from '@unhead/vue'
import { SITE_NAME, DEFAULT_DESCRIPTION, absUrl } from '@/config/seo'

// SEO ringkas untuk halaman statis: title + description + Open Graph + canonical.
// titleTemplate global (di App.vue) yang menyisipkan nama situs pada <title>.
export function usePageSeo({ title, description, path } = {}) {
  const desc = description || DEFAULT_DESCRIPTION
  useSeoMeta({
    title,
    description: desc,
    ogTitle: title ? `${title} · ${SITE_NAME}` : SITE_NAME,
    ogDescription: desc,
  })
  const href = path ? absUrl(path) : null
  if (href) useHead({ link: [{ rel: 'canonical', href }] })
}
