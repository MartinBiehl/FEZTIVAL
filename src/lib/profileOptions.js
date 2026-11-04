/*
 * Opcoes fixas do editor de perfil, usadas pela tela (navegador) e pela
 * validacao de saveArtistProfile (servidor). Sem acesso a banco, de proposito.
 */

export const INFRASTRUCTURE_STATUSES = [
  { value: 'included', label: 'Eu levo' },
  { value: 'negotiable', label: 'A combinar' },
  { value: 'required', label: 'O local precisa ter' },
];

/* A ultima opcao, "6h+", nao tem fim definido: fica gravada como 360 minutos. */
export const OPEN_ENDED_DURATION = 360;

export const SERVICE_DURATIONS = [30, 60, 90, 120, 180, 240, 300, OPEN_ENDED_DURATION];
