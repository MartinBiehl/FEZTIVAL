export const brandLetters = [
  { letter: 'F', color: '#FFD600' },
  { letter: 'E', color: '#FF6B35' },
  { letter: 'Z', color: '#FF3CAC' },
  { letter: 'T', color: '#B36AFF' },
  { letter: 'I', color: '#00D4FF' },
  { letter: 'V', color: '#FFD600' },
  { letter: 'A', color: '#FF6B35' },
  { letter: 'L', color: '#FF3CAC' },
];

export const landingContent = {
  navigation: [
    { label: 'Explorar', href: '#explorar' },
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Para artistas', href: '#para-artistas' },
  ],
  hero: {
    eyebrow: 'Talento local para momentos inesquecíveis',
    rotatingLead: 'Procurando por',
    rotatingTerms: ['DJ', 'Banda', 'Cantor', 'Pagode', 'Rock', 'Músico Solo'],
    searchLabel: 'Buscar',
  },
  catalog: {
    title: 'Artistas em destaque',
    description: 'Os mais bem avaliados de Porto Alegre',
    allArtistsLabel: 'Ver todos os artistas',
  },
  howItWorks: {
    eyebrow: 'Simples do início ao bis',
    title: 'Como funciona',
  },
  testimonials: {
    eyebrow: 'Histórias reais',
    title: 'Quem usa, recomenda',
    description: 'Organizadores e artistas que já fecharam negócio pelo Feztival',
  },
  about: {
    eyebrow: 'Sobre nós',
    title: 'Conectamos quem faz arte a quem quer celebrar.',
    description:
      'Nascemos em Porto Alegre com uma missão simples: todo evento merece o artista certo — e todo artista merece ser encontrado.',
  },
  cta: {
    eyebrow: 'Seu próximo evento começa aqui',
    title: 'Pronto para encontrar o artista perfeito?',
    description: 'Comece agora — é grátis. Sem compromisso.',
    button: 'Cadastre-se grátis',
  },
  footer: {
    links: [
      { label: 'Sobre', href: '#para-artistas' },
      { label: 'Como funciona', href: '#como-funciona' },
      { label: 'Artistas', href: '#explorar' },
    ],
    copyright: '© 2026 Feztival. Porto Alegre, RS.',
  },
};

export const artists = [
  {
    id: 1,
    slug: 'dj-kauan',
    name: 'DJ Kauan',
    category: 'DJ',
    genres: ['Funk', 'Eletrônica'],
    price: 2500,
    rating: 4.9,
    reviews: 87,
    location: 'Cidade Baixa',
    distanceKm: 4,
    setMinutes: [60, 120, 180],
    color: '#FFD600',
    image: null,
    imageAlt: 'DJ Kauan se apresentando',
  },
  {
    id: 2,
    slug: 'marina-santos',
    name: 'Marina Santos',
    category: 'Cantor',
    genres: ['MPB', 'Pop'],
    price: 1800,
    rating: 4.8,
    reviews: 63,
    location: 'Moinhos de Vento',
    distanceKm: 8,
    setMinutes: [60, 120],
    color: '#FF3CAC',
    image: null,
    imageAlt: 'Marina Santos cantando',
  },
  {
    id: 3,
    slug: 'banda-nativus',
    name: 'Banda Nativus',
    category: 'Banda',
    genres: ['Rock Gaúcho', 'MPB'],
    price: 3200,
    rating: 4.7,
    reviews: 45,
    location: 'Bom Fim',
    distanceKm: 12,
    setMinutes: [120, 180, 240],
    color: '#FF6B35',
    image: null,
    imageAlt: 'Banda Nativus no palco',
  },
  {
    id: 4,
    slug: 'dj-vitoria',
    name: 'DJ Vitória',
    category: 'DJ',
    genres: ['Techno', 'House'],
    price: 1500,
    rating: 5,
    reviews: 34,
    location: 'Cidade Baixa',
    distanceKm: 3,
    setMinutes: [120, 180, 240],
    color: '#B36AFF',
    image: null,
    imageAlt: 'DJ Vitória tocando',
  },
  {
    id: 5,
    slug: 'rafael-acustico',
    name: 'Rafael Acústico',
    category: 'Músico Solo',
    genres: ['Acústico', 'Pop'],
    price: 900,
    rating: 4.6,
    reviews: 52,
    location: 'Centro Histórico',
    distanceKm: 18,
    setMinutes: [30, 60, 120],
    color: '#00D4FF',
    image: null,
    imageAlt: 'Rafael Acústico tocando violão',
  },
  {
    id: 6,
    slug: 'samba-porto',
    name: 'Samba Porto',
    category: 'Pagode',
    genres: ['Pagode', 'Samba'],
    price: 2800,
    rating: 4.9,
    reviews: 71,
    location: 'Menino Deus',
    distanceKm: 22,
    setMinutes: [120, 180, 240],
    color: '#FFD600',
    image: null,
    imageAlt: 'Grupo Samba Porto se apresentando',
  },
  {
    id: 7,
    slug: 'leticia-black',
    name: 'Letícia Black',
    category: 'Cantor',
    genres: ['Soul', 'R&B'],
    price: 2000,
    rating: 4.8,
    reviews: 29,
    location: 'Moinhos de Vento',
    distanceKm: 9,
    setMinutes: [60, 120],
    color: '#FF3CAC',
    image: null,
    imageAlt: 'Letícia Black cantando',
  },
  {
    id: 8,
    slug: 'banda-quartel',
    name: 'Banda Quartel',
    category: 'Banda',
    genres: ['Rock', 'Indie'],
    price: 3500,
    rating: 4.7,
    reviews: 38,
    location: 'Bom Fim',
    distanceKm: 32,
    setMinutes: [120, 180, 240],
    color: '#FF6B35',
    image: null,
    imageAlt: 'Banda Quartel no palco',
  },
];

export const categories = [
  { name: 'Todos', count: 240 },
  { name: 'DJ', count: 89 },
  { name: 'Banda', count: 52 },
  { name: 'Cantor', count: 41 },
  { name: 'Músico Solo', count: 33 },
  { name: 'Pagode', count: 25 },
];

export const filterGroups = [
  {
    id: 'distance',
    label: 'Distância',
    options: [
      { label: 'Até 5 km', value: '5' },
      { label: 'Até 10 km', value: '10' },
      { label: 'Até 20 km', value: '20' },
      { label: 'Até 50 km', value: '50' },
      { label: 'Qualquer distância', value: 'any' },
    ],
  },
  {
    id: 'duration',
    label: 'Tempo de set',
    options: [
      { label: '30 min', value: '30' },
      { label: '1 hora', value: '60' },
      { label: '2 horas', value: '120' },
      { label: '3 horas', value: '180' },
      { label: '4+ horas', value: '240' },
    ],
  },
  {
    id: 'genre',
    label: 'Gênero musical',
    options: ['Funk', 'Eletrônica', 'MPB', 'Pop', 'Rock', 'Pagode', 'Samba', 'Sertanejo', 'Soul', 'R&B', 'Techno', 'House', 'Acústico', 'Indie'].map((value) => ({ label: value, value })),
  },
];

export const steps = [
  { number: '01', title: 'Busque', description: 'Encontre o artista ideal por gênero, data ou localização', color: '#FFD600' },
  { number: '02', title: 'Proponha', description: 'Envie uma proposta com data, local e valor para o artista', color: '#FF6B35' },
  { number: '03', title: 'Confirme', description: 'O artista aceita e você paga com total segurança', color: '#FF3CAC' },
  { number: '04', title: 'Avalie', description: 'Após o show, avalie e fortaleça a comunidade', color: '#B36AFF' },
];

export const testimonials = [
  { quote: 'Contratei um DJ pro meu casamento pelo Feztival. Processo super simples e o artista foi incrível.', name: 'Carolina M.', role: 'Organizadora de eventos', color: '#FF3CAC' },
  { quote: 'Como músico, o Feztival me trouxe visibilidade que eu não conseguia sozinho. Já fiz 15 shows.', name: 'Pedro H.', role: 'Músico solo', color: '#00D4FF' },
  { quote: 'A segurança no pagamento é o melhor. Sei que vou receber depois do show, sem estresse.', name: 'DJ Marlene', role: 'DJ', color: '#FFD600' },
];

export const values = [
  { title: 'Transparência', description: 'Preços claros e pagamento seguro. Sem surpresas.', color: '#FFD600' },
  { title: 'Comunidade', description: 'Uma rede viva de artistas e organizadores locais.', color: '#FF3CAC' },
  { title: 'Porto Alegre', description: 'Feitos aqui, para cá. Apostamos no talento gaúcho.', color: '#00D4FF' },
];

export const activityFeed = [
  { person: 'Carolina', action: 'contratou', artist: 'DJ Kauan' },
  { person: 'Pedro', action: 'avaliou', artist: 'Marina Santos' },
  { person: 'Bar do Zé', action: 'reservou', artist: 'Banda Nativus' },
  { person: 'Júlia', action: 'contratou', artist: 'DJ Vitória' },
];

export const marqueeText = 'DJ ◆ BANDA ◆ PAGODE ◆ ROCK ◆ SERTANEJO ◆ FUNK ◆ MPB ◆ CANTOR ◆ ACÚSTICO ◆ SOUL ◆';
