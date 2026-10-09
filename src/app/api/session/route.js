import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth.js';
import { queryOne } from '../../../lib/db.js';

/*
 * Usuario exibido no Header, lido pelo AuthContext no navegador. Fica num
 * Route Handler, e nao no layout raiz, para as paginas publicas continuarem
 * estaticas (ver "Sessao" no AGENTS.md).
 *
 * "role" aqui e so apresentacao: quem tem linha em artists ve o painel, o
 * resto ve as proprias reservas. Nao existe papel gravado no banco.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });

  const row = await queryOne(
    `select p.full_name, p.avatar_url, p.phone is not null as has_phone, a.stage_name,
            (select count(*) from bookings b where b.artist_id = a.id and b.status = 'pending') as pending
       from profiles p
       left join lateral (
         select id, stage_name from artists where profile_id = p.id order by created_at limit 1
       ) a on true
      where p.id = $1`,
    [user.id],
  );
  const isArtist = Boolean(row?.stage_name);

  return NextResponse.json({
    user: {
      role: isArtist ? 'artist' : 'contractor',
      name: row?.stage_name || row?.full_name || user.email,
      avatarUrl: row?.avatar_url ?? null,
      // O formulario de proposta pede o WhatsApp a quem ainda nao informou.
      hasPhone: Boolean(row?.has_phone),
      // Pendencia do artista: propostas aguardando resposta.
      notificationCount: row?.pending ?? 0,
      destination: isArtist ? '/painel' : '/minhas-reservas',
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
