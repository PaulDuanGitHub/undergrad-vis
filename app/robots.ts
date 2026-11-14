import type { MetadataRoute } from 'next';

const SITE_URL = 'https://xianzhaoduan.com/undergrad-vis/';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // Say "allow everything" explicitly: an empty rule list is valid, but many
    // crawler checkers read a robots.txt without a `User-agent` line as broken.
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}sitemap.xml`,
    host: new URL(SITE_URL).host,
  };
}
