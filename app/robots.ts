import type { MetadataRoute } from 'next';

const SITE_URL = 'https://paulduangithub.github.io/undergrad-vis/';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [],
    sitemap: `${SITE_URL}sitemap.xml`,
    host: SITE_URL,
  };
}
