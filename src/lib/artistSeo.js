/*
 * Monta título e descrição dos perfis de artista a partir dos dados reais de
 * cadastro no banco — sem texto de marketing inventado.
 *
 * Os registros não têm biografia, então a descrição usa só os campos existentes:
 * categoria, gêneros, cidade, nota, número de avaliações e preço inicial.
 *
 * A frase evita concordância de gênero ("é cantor em..." ficaria errado para
 * Marina Santos e Letícia Black, e "é pagode" descreveria o grupo como gênero),
 * então a categoria abre a frase como rótulo.
 */

/* Nota exige media E contagem: media sem avaliacao nao significa nada. */
function hasRating(artist) {
  return artist.rating != null && artist.reviews > 0;
}

/* "Centro, Ivoti" e "Bom Jardim, Ivoti" viram "Ivoti"; "Campo Bom" fica igual. */
export function artistCity(artist) {
  return artist.location.split(',').pop().trim();
}

export function artistTitle(artist) {
  return `${artist.name} — ${artist.category} em ${artistCity(artist)}`;
}

export function artistDescription(artist) {
  const genres = artist.genres.join(' e ');
  const parts = [`${artist.category} em ${artistCity(artist)}, com repertório de ${genres}.`];

  /*
   * Nota e preco entram na frase somente quando existem: artista novo nao tem
   * avaliacao, e o preco e opcional quando o perfil diz "sob consulta".
   */
  const rating = hasRating(artist)
    ? `Nota ${artist.rating.toFixed(1).replace('.', ',')} em ${artist.reviews} avaliações`
    : null;
  const price = artist.price != null
    ? `shows a partir de R$ ${artist.price.toLocaleString('pt-BR')}`
    : null;

  const facts = [rating, price].filter(Boolean).join(', ');
  if (facts) {
    parts.push(`${facts.charAt(0).toUpperCase()}${facts.slice(1)}.`);
  }

  parts.push('Peça uma proposta pelo Feztival.');
  return parts.join(' ');
}

/*
 * Schema.org por categoria, conforme decidido na Fase 2:
 *
 *   Banda, Pagode   -> MusicGroup  (formações de grupo; "Samba Ivoti" pelo nome)
 *   DJ              -> Person      (nome artístico de um indivíduo)
 *   Cantor          -> Person
 *   Músico Solo     -> Person
 *
 * Schema.org não tem tipo próprio para DJ. Usamos Person com jobTitle, por
 * serem indivíduos, em vez de MusicGroup.
 */
const GROUP_CATEGORIES = new Set(['Banda', 'Pagode']);

export function artistSchemaType(artist) {
  return GROUP_CATEGORIES.has(artist.category) ? 'MusicGroup' : 'Person';
}

/*
 * JSON-LD do perfil. Declara apenas o que existe no cadastro do artista — sem foto
 * (image: null em todos) e sem campos inventados.
 *
 * A oferta descreve o preço inicial do show, comunicando que o artista é
 * contratável. A nota agregada fica dentro do Service ofertado, e não no
 * Person/MusicGroup: schema.org não define aggregateRating nesses dois tipos.
 */
export function artistJsonLd(artist, siteUrl) {
  const type = artistSchemaType(artist);
  const url = `${siteUrl}/artista/${artist.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': type,
    name: artist.name,
    url,
    description: artistDescription(artist),
    genre: artist.genres,
    address: {
      '@type': 'PostalAddress',
      addressLocality: artistCity(artist),
      addressRegion: 'RS',
      addressCountry: 'BR',
    },
    makesOffer: {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: `Apresentação musical — ${artist.category}`,
      },
    },
  };

  /*
   * Preço só entra quando existe. Não declaramos se há impostos inclusos:
   * essa informação não existe nos dados.
   */
  if (artist.price != null) {
    schema.makesOffer.priceSpecification = {
      '@type': 'PriceSpecification',
      price: artist.price,
      priceCurrency: 'BRL',
    };
  }

  /*
   * aggregateRating é OMITIDO quando não há avaliação. Declarar nota vazia é
   * dado estruturado inválido, e o buscador pode penalizar por isso — pior do
   * que simplesmente não informar.
   */
  if (hasRating(artist)) {
    schema.makesOffer.itemOffered.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: artist.rating,
      reviewCount: artist.reviews,
      bestRating: 5,
    };
  }

  // jobTitle só faz sentido para pessoas; grupos não têm cargo.
  if (type === 'Person') {
    schema.jobTitle = artist.category;
  }

  return schema;
}
