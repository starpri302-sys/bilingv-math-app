import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
}

export default function SEO({ 
  title = 'БилингвМат — Математический словарь', 
  description = 'Интерактивный математический словарь на русском и тувинском языках для школьников.',
  canonical = 'https://bilingvmath.ru'
}: SEOProps) {
  const fullTitle = title.includes('БилингвМат') ? title : `${title} | БилингвМат`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content="https://bilingvmath.ru/og-image.png" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonical} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content="https://bilingvmath.ru/og-image.png" />
    </Helmet>
  );
}
