/*
 * Configuração de site usada pela metadata, Open Graph e sitemap.
 *
 * SITE_URL é o único lugar onde a URL absoluta é definida — não repita o
 * domínio em outros arquivos. O valor atual é um PLACEHOLDER: o site ainda
 * não foi publicado. Troque aqui quando o domínio real existir.
 */
export const SITE_URL = 'https://feztival.example.com';

export const SITE_NAME = 'Feztival';

export const SITE_DESCRIPTION =
  'Descubra e contrate músicos, DJs e bandas de Ivoti e região para fazer seu evento acontecer.';

/*
 * Imagem padrão de Open Graph. O repositório ainda não tem arte de marca
 * (a identidade é tipográfica, montada em JSX pelo BrandLogo), e os artistas
 * não têm foto — todos com `image: null`. Sem imagem, os previews em WhatsApp
 * e redes sociais mostram apenas título e descrição.
 *
 * Para ativar: coloque a arte em `public/og-default.png` (1200×630) e
 * descomente a linha abaixo.
 */
// export const OG_IMAGE = '/og-default.png';
export const OG_IMAGE = null;
