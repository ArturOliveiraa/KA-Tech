import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

export default function SEO({ 
  title, 
  description = "A melhor plataforma de ensino tech.", 
  image = "/logo192.png", // Imagem padrão se nenhuma for passada
  url = window.location.href 
}: SEOProps) {
  const siteTitle = "KA Tech";
  const fullTitle = `${title} | ${siteTitle}`;

  return (
    <Helmet>
      {/* Título da Aba */}
      <title>{fullTitle}</title>

      {/* Metadados Básicos */}
      <meta name="description" content={description} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
    </Helmet>
  );
}