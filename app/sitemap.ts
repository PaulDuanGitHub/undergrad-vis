import type { MetadataRoute } from 'next';

const SITE_URL = 'https://paulduangithub.github.io/undergrad-vis/';
/** Content was last revised with the focus + metadata pass. */
const LAST_MODIFIED = '2026-11-13';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 1,
    },
  ];
}
