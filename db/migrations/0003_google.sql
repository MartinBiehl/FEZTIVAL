-- "Continuar com Google" (OAuth/OpenID Connect). Ver src/lib/googleAuth.js.

-- Conta criada pelo Google nao tem senha ate a pessoa pedir uma em "Esqueci
-- minha senha". signIn trata o nulo.
alter table users alter column password_hash drop not null;

-- Identificador fixo da conta Google (o "sub" do ID token). E por ele, e nao
-- pelo e-mail, que a conta e reconhecida: o e-mail da conta Google pode mudar.
alter table users add column google_sub text unique;

-- Quem voltou do Google sem conta no Feztival e ainda nao informou WhatsApp e
-- termos (/cadastro/completar). Como nas sessoes, o id e o SHA-256 do token
-- do cookie fz_google_signup. Vale 30 minutos.
create table google_signups (
  id text primary key,
  google_sub text not null,
  email text not null
    constraint google_signups_email_lowercase check (email = lower(email)),
  full_name text,
  -- Intencao vinda da tela de origem; nulo quando a pessoa veio de /entrar
  -- e ainda vai escolher entre contratante e artista.
  signup_as text
    constraint google_signups_signup_as_valid check (signup_as in ('contractor', 'artist')),
  next_path text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
