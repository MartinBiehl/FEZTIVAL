import concertStageImage from '../images/concert_stage.png';
import crowdPartyImage from '../images/crowd_party.png';

export const artistProfileDetails = {
  mediaGallery: [
    {
      id: 'show-ao-vivo',
      type: 'video',
      src: concertStageImage,
      alt: 'Banda se apresentando em um palco iluminado',
      featured: true,
    },
    {
      id: 'publico-celebrando',
      type: 'photo',
      src: crowdPartyImage,
      alt: 'Público celebrando durante um show',
    },
    {
      id: 'montagem-do-palco',
      type: 'photo',
      src: concertStageImage,
      alt: 'Palco preparado para uma apresentação musical',
    },
  ],
  services: [
    {
      id: 'show-completo',
      title: 'Show completo',
      detail: 'Repertório personalizado · até 3h',
      extra: 'Equipamento de som a combinar',
      priceAdjustment: 0,
    },
    {
      id: 'formato-compacto',
      title: 'Formato compacto',
      detail: 'Ideal para recepções · até 1h30',
      extra: 'Equipamento básico incluso',
      priceAdjustment: -500,
    },
  ],
  weeklyHours: [
    { day: 'Segunda-feira', hours: '09h às 18h', available: true },
    { day: 'Terça-feira', hours: '09h às 18h', available: true },
    { day: 'Quarta-feira', hours: '09h às 18h', available: true },
    { day: 'Quinta-feira', hours: '09h às 18h', available: true },
    { day: 'Sexta-feira', hours: '09h às 18h', available: true },
    { day: 'Sábado', hours: '10h às 16h', available: true },
    { day: 'Domingo', hours: 'Não atende', available: false },
  ],
  paymentMethods: [
    { id: 'pix', name: 'Pix', detail: 'Confirmação rápida e sem taxas adicionais' },
    { id: 'credit-card', name: 'Cartão de crédito', detail: 'Condições combinadas na confirmação' },
    { id: 'bank-transfer', name: 'Transferência bancária', detail: 'Dados enviados após o aceite da proposta' },
  ],
  venueTypes: [
    'Festas particulares',
    'Casamentos',
    'Eventos corporativos',
    'Hotéis',
    'Bares e restaurantes',
    'Local próprio',
  ],
  serviceAreas: {
    summary: 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.',
    locations: ['Ivoti', 'Novo Hamburgo', 'Estância Velha', 'Dois Irmãos', 'Campo Bom', 'São Leopoldo'],
  },
  infrastructure: [
    {
      id: 'included',
      status: 'Incluso',
      title: 'Instrumentos e cabos básicos',
      detail: 'O artista leva os instrumentos e os cabos necessários para a apresentação.',
    },
    {
      id: 'negotiable',
      status: 'A combinar',
      title: 'Equipamento de som',
      detail: 'Pode ser fornecido conforme o formato contratado e o porte do evento.',
    },
    {
      id: 'required',
      status: 'Necessário no local',
      title: 'Energia, espaço e área coberta',
      detail: 'O contratante deve garantir tomadas próximas, circulação segura e proteção contra chuva.',
    },
  ],
};
