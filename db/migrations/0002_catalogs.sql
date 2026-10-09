-- Catalogos da plataforma: generos, formas de pagamento e tipos de local.
--
-- Sao dado de referencia, nao de demonstracao: sem generos nenhum artista
-- consegue publicar o perfil. Por isso vivem numa migration (rodam em todo
-- ambiente, inclusive producao) e nao no db/seed.sql.
--
-- Manutencao do catalogo e por migration nova; nao ha tela para isso.

insert into genres (name, slug) values
  ('Acústico', 'acustico'),
  ('Eletrônica', 'eletronica'),
  ('Funk', 'funk'),
  ('House', 'house'),
  ('Indie', 'indie'),
  ('MPB', 'mpb'),
  ('Pagode', 'pagode'),
  ('Pop', 'pop'),
  ('R&B', 'r-b'),
  ('Rock', 'rock'),
  ('Rock Gaúcho', 'rock-gaucho'),
  ('Samba', 'samba'),
  ('Soul', 'soul'),
  ('Techno', 'techno');

insert into payment_methods (slug, name, detail, sort_order) values
  ('pix', 'Pix', 'Confirmação rápida e sem taxas adicionais', 0),
  ('credit-card', 'Cartão de crédito', 'Condições combinadas na confirmação', 1),
  ('bank-transfer', 'Transferência bancária', 'Dados enviados após o aceite da proposta', 2);

insert into venue_types (slug, name, sort_order) values
  ('festas-particulares', 'Festas particulares', 0),
  ('casamentos', 'Casamentos', 1),
  ('eventos-corporativos', 'Eventos corporativos', 2),
  ('hoteis', 'Hotéis', 3),
  ('bares-e-restaurantes', 'Bares e restaurantes', 4),
  ('local-proprio', 'Local próprio', 5);
