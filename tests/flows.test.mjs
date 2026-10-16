/*
 * Fluxos de conta, reserva, perguntas e fotos, chamando as Server Actions de
 * verdade contra um Postgres de verdade. Substitui o antigo rls_test.sql: sem
 * RLS, quem decide quem le e grava o que e o codigo de src/lib -- e e isso
 * que estes testes cobrem, inclusive as tentativas de papel errado e de
 * terceiros.
 *
 *   TEST_DATABASE_URL=postgres://localhost:5432/feztival_test npm test
 *
 * ATENCAO: o banco de TEST_DATABASE_URL e APAGADO e recriado a cada execucao.
 * Nunca aponte para o banco de desenvolvimento ou de producao.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import pg from 'pg';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Defina TEST_DATABASE_URL (um banco descartavel: ele e apagado a cada execucao).');
}
if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL nao pode ser o mesmo banco de DATABASE_URL.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.MEDIA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'feztival-media-'));

const ROOT = path.resolve(import.meta.dirname, '..');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query('drop schema public cascade; create schema public;');
for (const file of fs.readdirSync(path.join(ROOT, 'db', 'migrations')).sort()) {
  await db.query(fs.readFileSync(path.join(ROOT, 'db', 'migrations', file), 'utf8'));
}
await db.query(fs.readFileSync(path.join(ROOT, 'db', 'seed.sql'), 'utf8'));

const L = '../src';
const acc = await import(`${L}/lib/accountActions.js`);
const { getCurrentUser } = await import(`${L}/lib/auth.js`);
const bookings = await import(`${L}/lib/bookingActions.js`);
const questions = await import(`${L}/lib/questionActions.js`);
const profile = await import(`${L}/lib/profileActions.js`);
const { fetchProfileEditor } = await import(`${L}/lib/profileEditor.js`);
const { fetchArtistDashboard, fetchClientBookings } = await import(`${L}/lib/bookingQueries.js`);
const { fetchArtistBySlug, fetchArtists } = await import(`${L}/lib/artistQueries.js`);
const { recordArtistView } = await import(`${L}/lib/artistActions.js`);
const confirmRoute = await import(`${L}/app/auth/confirm/route.js`);
const sessionRoute = await import(`${L}/app/api/session/route.js`);

const one = async (sql, p) => (await db.query(sql, p)).rows[0];

// Caixa de entrada: mail.js imprime os e-mails em desenvolvimento.
const inbox = [];
const info = console.info;
console.info = (text) => { inbox.push(String(text)); };
const lastMail = () => inbox.at(-1) ?? '';

// Um "navegador" por pessoa: cada um com seus cookies.
const jars = {};
const as = (who) => { jars[who] ??= new Map(); globalThis.testCookieJar = jars[who]; };
const form = (fields) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [].concat(v)) f.append(k, x);
  return f;
};
// WhatsApp e obrigatorio para todo cadastro: e o contato entre as partes depois do aceite.
const signupFields = (o) => ({
  signupAs: 'contractor', password: 'senha-forte-1', terms: 'on', fullName: 'Pessoa Teste', phone: '(51) 98888-7777', ...o,
});

async function signUpAndConfirm(who, fields) {
  as(who);
  const r = await acc.signUp(null, form(signupFields(fields)));
  assert.deepEqual(r, { ok: true, needsConfirmation: true });
  const link = lastMail().match(/http\S+/)[0];
  const res = await confirmRoute.GET(new Request(link));
  return { link, res };
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9]);
const imageForm = (bytes = JPEG, type = 'image/jpeg') => form({ image: new File([bytes], 'foto.jpg', { type }) });

let slug; let bookingId; let questionId; let artistId;

test('cadastro de artista: confirma por e-mail, cria profile e rascunho', async () => {
  as('a');
  const pre = await acc.signUp(null, form(signupFields({
    signupAs: 'artist', email: 'Artista@Test.local', stageName: 'Banda Teste', category: 'band', phone: '(51) 99999-8888',
  })));
  assert.deepEqual(pre, { ok: true, needsConfirmation: true });
  const link = lastMail().match(/http\S+/)[0];
  assert.match(link, /^http:\/\/localhost:3000\/auth\/confirm\?token=/);

  const blocked = await acc.signIn(null, form({ email: 'artista@test.local', password: 'senha-forte-1' }));
  assert.match(blocked.error, /Confirme seu e-mail/);

  const res = await confirmRoute.GET(new Request(link));
  assert.equal(res.headers.get('location'), 'http://localhost:3000/painel');
  assert.ok(jars.a.get('fz_session'));
  const me = await getCurrentUser();
  assert.equal(me.email, 'artista@test.local');

  const row = await one('select p.phone, a.slug, a.is_published, a.id from profiles p join artists a on a.profile_id = p.id where p.id = $1', [me.id]);
  assert.equal(row.phone, '51999998888');
  assert.equal(row.slug, 'banda-teste');
  assert.equal(row.is_published, false);
  slug = row.slug; artistId = row.id;

  const reused = await confirmRoute.GET(new Request(link));
  assert.match(reused.headers.get('location'), /erro=link/);
});

test('cadastro repetido de e-mail confirmado e recusado', async () => {
  as('x');
  const r = await acc.signUp(null, form(signupFields({ email: 'artista@test.local' })));
  assert.match(r.error, /Já existe uma conta/);
});

test('cadastro nao confirmado pode ser refeito; o link antigo deixa de valer', async () => {
  as('x');
  await acc.signUp(null, form(signupFields({ email: 'refaz@test.local' })));
  const oldLink = lastMail().match(/http\S+/)[0];
  await acc.signUp(null, form(signupFields({ email: 'refaz@test.local', fullName: 'Nome Novo' })));
  assert.match((await confirmRoute.GET(new Request(oldLink))).headers.get('location'), /erro=link/);
  const users = await one(`select count(*)::int n from users where email = 'refaz@test.local'`);
  assert.equal(users.n, 1);
});

test('contratante e terceiro se cadastram', async () => {
  const { res } = await signUpAndConfirm('b', { email: 'cliente@test.local', fullName: 'Cliente Teste' });
  assert.equal(res.headers.get('location'), 'http://localhost:3000/minhas-reservas');
  await signUpAndConfirm('c', { email: 'intruso@test.local', fullName: 'Intruso' });
});

test('/api/session devolve o usuario do Header', async () => {
  as('a');
  const a = await (await sessionRoute.GET()).json();
  assert.equal(a.user.role, 'artist');
  assert.equal(a.user.name, 'Banda Teste');
  as('nobody');
  assert.equal((await (await sessionRoute.GET()).json()).user, null);
});

test('5 senhas erradas travam o login daquele e-mail', async () => {
  as('c2');
  for (let i = 0; i < 5; i += 1) {
    const r = await acc.signIn(null, form({ email: 'intruso@test.local', password: 'errada' }));
    assert.equal(r.error, 'E-mail ou senha incorretos.');
  }
  const locked = await acc.signIn(null, form({ email: 'intruso@test.local', password: 'senha-forte-1' }));
  assert.match(locked.error, /Muitas tentativas/);
  const unknown = await acc.signIn(null, form({ email: 'ninguem@test.local', password: 'x' }));
  assert.equal(unknown.error, 'E-mail ou senha incorretos.');
});

test('editor: publicar exige cidade; salva tudo e preserva o id do servico', async () => {
  as('a');
  const me = await getCurrentUser();
  const editor = await fetchProfileEditor(me.id);
  const genre = editor.catalogs.genres[0].id;
  const base = {
    stageName: 'Banda Teste', category: 'band', basePrice: '1500', isPublished: 'on', genres: genre,
    paymentMethods: editor.catalogs.paymentMethods.map((m) => m.id),
    serviceTitle: 'Show de 2h', serviceId: '', serviceDescription: '', servicePrice: '2000', serviceDuration: '120',
    serviceAreas: 'Ivoti\nDois Irmãos', day_1: 'on', opens_1: '09:00', closes_1: '18:00',
    infraTitle: 'Som', infraStatus: 'included', infraDetail: '', infraId: '',
  };
  assert.match((await profile.saveArtistProfile(null, form(base))).error, /informe sua cidade/);
  assert.equal((await one('select is_published from artists where id = $1', [artistId])).is_published, false);

  const ok = await profile.saveArtistProfile(null, form({ ...base, city: 'Ivoti' }));
  assert.equal(ok.ok, true);
  const saved = await fetchProfileEditor(me.id);
  assert.equal(saved.profile.isPublished, true);
  assert.deepEqual(saved.profile.serviceAreas, ['Ivoti', 'Dois Irmãos']);
  assert.equal(saved.profile.weeklyHours[1].opensAt, '09:00');
  assert.equal(saved.profile.paymentMethodIds.length, 3);
  const serviceId = saved.profile.services[0].id;

  await profile.saveArtistProfile(null, form({
    ...base, city: 'Ivoti', serviceId, servicePrice: '2200', serviceAreas: 'Dois Irmãos', paymentMethods: [],
  }));
  const again = await fetchProfileEditor(me.id);
  assert.equal(again.profile.services[0].id, serviceId);
  assert.equal(again.profile.services[0].price, '2200');
  assert.deepEqual(again.profile.serviceAreas, ['Dois Irmãos']);
  assert.equal(again.profile.paymentMethodIds.length, 0);

  const pub = await fetchArtistBySlug(slug);
  assert.equal(pub.name, 'Banda Teste');
  assert.equal(pub.services[0].price, 2200);
  assert.ok((await fetchArtists()).some((x) => x.slug === slug));
});

test('rascunho de outro artista nao aparece no publico', async () => {
  await one(`update artists set is_published = false where slug = 'dj-kauan'`);
  assert.equal(await fetchArtistBySlug('dj-kauan'), null);
  assert.ok(!(await fetchArtists()).some((x) => x.slug === 'dj-kauan'));
  await one(`update artists set is_published = true where slug = 'dj-kauan'`);
});

const bookingForm = (extra = {}) => form({
  slug, eventType: 'Casamento', guestCount: '80', date: '2099-12-31', time: '20:00',
  location: 'Salão em Ivoti', duration: '120', soundStructure: 'local', message: 'Olá', ...extra,
});

test('proposta: contratante envia; artista nao propoe ao proprio perfil', async () => {
  as('a');
  assert.match((await bookings.createBooking(bookingForm())).error, /próprio perfil/);
  as('nobody');
  assert.deepEqual(await bookings.createBooking(bookingForm()), { needsAuth: true });
  as('b');
  assert.deepEqual(await bookings.createBooking(bookingForm()), { ok: true });
  const row = await one(`select id, status, agreed_price, sound_structure from bookings where artist_id = $1`, [artistId]);
  assert.equal(row.status, 'pending');
  assert.equal(Number(row.agreed_price), 2200);
  assert.equal(row.sound_structure, 'venue');
  bookingId = row.id;
});

const status = (action, extra = {}) => bookings.updateBookingStatus(null, form({ bookingId, action, ...extra }));

test('status: papel errado e terceiros sao recusados', async () => {
  as('b');
  assert.match((await status('accept', { price: '1' })).error, /não pode alterar/);
  assert.match((await status('complete')).error, /não pode alterar/);
  as('c');
  assert.match((await status('cancel')).error, /não pode alterar/);
  assert.match((await bookings.updateBookingStatus(null, form({ bookingId: "x' or 1=1 --", action: 'cancel' }))).error, /inválida/);
  assert.equal((await one('select status from bookings where id = $1', [bookingId])).status, 'pending');
});

test('status: artista aceita com valor final; valores congelam', async () => {
  as('a');
  assert.deepEqual(await status('accept', { price: '1000' }), { ok: true });
  const row = await one('select agreed_price, platform_fee, artist_payout from bookings where id = $1', [bookingId]);
  assert.deepEqual([row.agreed_price, row.platform_fee, row.artist_payout].map(Number), [1000, 120, 880]);
  assert.match((await status('accept', { price: '5000' })).error, /não é permitida/);
  assert.match((await status('complete')).error, /não é permitida/);
});

test('avaliacao: so depois de concluida, uma vez, pelo contratante', async () => {
  const review = () => bookings.createReview(null, form({ bookingId, rating: '5', comment: 'Ótimo' }));
  as('b');
  assert.match((await review()).error, /concluídas/);
  as('a');
  assert.deepEqual(await status('confirm'), { ok: true });
  assert.deepEqual(await status('complete'), { ok: true });
  assert.match((await review()).error, /concluídas/);
  as('c');
  assert.match((await review()).error, /concluídas/);
  as('b');
  assert.deepEqual(await review(), { ok: true });
  assert.match((await review()).error, /já foi avaliada/);
  assert.match((await status('cancel')).error, /não é permitida/);

  const pub = await fetchArtistBySlug(slug);
  assert.equal(pub.rating, 5);
  assert.equal(pub.reviews, 1);
  assert.equal(pub.reviewList[0].eventType, 'Casamento');
});

test('painel e minhas reservas mostram so o que e de cada um', async () => {
  as('a');
  const me = await getCurrentUser();
  const dash = await fetchArtistDashboard(me.id);
  assert.equal(dash.artist.slug, slug);
  as('b');
  const b = await getCurrentUser();
  const mine = await fetchClientBookings(b.id);
  assert.equal(mine.bookings.length, 1);
  assert.equal(mine.bookings[0].reviewed, true);
  assert.equal(mine.bookings[0].artistName, 'Banda Teste');
  assert.equal(await fetchArtistDashboard(b.id), null);
  as('c');
  assert.equal((await fetchClientBookings((await getCurrentUser()).id)).bookings.length, 0);

  // Proposta ativa futura com contato do contratante, so para o artista.
  as('b');
  await bookings.createBooking(bookingForm());
  as('a');
  const dash2 = await fetchArtistDashboard(me.id);
  assert.equal(dash2.proposals.length, 1);
  assert.equal(dash2.proposals[0].clientName, 'Cliente Teste');
  assert.equal(dash2.metrics.pending, 1);
});

test('cadastro sem WhatsApp e recusado, tambem para contratante', async () => {
  as('semfone');
  const r = await acc.signUp(null, form(signupFields({ email: 'semfone@test.local', phone: '' })));
  assert.match(r.error, /WhatsApp/);
  assert.equal(await one(`select id from users where email = 'semfone@test.local'`), undefined);
});

test('whatsapp: conta antiga informa na proposta; contato do artista so depois do aceite', async () => {
  as('c');
  const c = await getCurrentUser();
  await one('update profiles set phone = null where id = $1', [c.id]);
  assert.match((await bookings.createBooking(bookingForm())).error, /WhatsApp/);
  assert.deepEqual(await bookings.createBooking(bookingForm({ phone: '(51) 97777-6666' })), { ok: true });
  assert.equal((await one('select phone from profiles where id = $1', [c.id])).phone, '51977776666');

  const pending = (await fetchClientBookings(c.id)).bookings[0];
  assert.equal(pending.artistPhone, null);
  assert.equal(pending.guestCount, 80);
  assert.equal(pending.durationMinutes, 120);

  bookingId = pending.id;
  as('a');
  assert.deepEqual(await status('accept', { price: '1500' }), { ok: true });
  as('c');
  assert.equal((await fetchClientBookings(c.id)).bookings[0].artistPhone, '51999998888');
});

test('painel: aceita ja passada continua para ser concluida; pendente vencida sai', async () => {
  as('a');
  const me = await getCurrentUser();
  // bookingId e a reserva aceita do teste anterior; a pendente e a do cliente b.
  const pendingId = (await one(
    `select b.id from bookings b join users u on u.id = b.client_id
      where u.email = 'cliente@test.local' and b.status = 'pending'`,
  )).id;
  await one(`update bookings set event_date = '2020-01-10' where id = any($1)`, [[bookingId, pendingId]]);

  const dash = await fetchArtistDashboard(me.id);
  const ids = dash.proposals.map((p) => p.id);
  assert.ok(ids.includes(bookingId));
  assert.ok(!ids.includes(pendingId));
  assert.equal(dash.proposals.find((p) => p.id === bookingId).isPast, true);
  assert.equal(dash.metrics.pending, 0);
});

test('"sob consulta" esconde o preco inicial no publico', async () => {
  await one('update artists set price_on_request = true where id = $1', [artistId]);
  assert.equal((await fetchArtistBySlug(slug)).price, null);
  await one('update artists set price_on_request = false where id = $1', [artistId]);
  assert.notEqual((await fetchArtistBySlug(slug)).price, null);
});

test('perguntas: contratante pergunta; so o dono responde, uma vez', async () => {
  const ask = form({ slug, body: 'Vocês tocam até que horas?' });
  as('a');
  assert.match((await questions.askQuestion(null, ask)).error, /próprio perfil/);
  as('nobody');
  assert.deepEqual(await questions.askQuestion(null, ask), { needsAuth: true });
  as('b');
  assert.deepEqual(await questions.askQuestion(null, ask), { ok: true });
  questionId = (await one('select id from questions where artist_id = $1', [artistId])).id;

  const answer = form({ questionId, body: 'Até as 2h.' });
  as('c');
  assert.match((await questions.answerQuestion(null, answer)).error, /Só o artista/);
  as('b');
  assert.match((await questions.answerQuestion(null, answer)).error, /Só o artista/);
  as('a');
  assert.equal((await fetchArtistDashboard((await getCurrentUser()).id)).openQuestions.length, 1);
  assert.deepEqual(await questions.answerQuestion(null, answer), { ok: true });
  assert.match((await questions.answerQuestion(null, answer)).error, /já foi respondida/);

  // A respondida sai da fila e vai para o historico do painel.
  const dash = await fetchArtistDashboard((await getCurrentUser()).id);
  assert.equal(dash.openQuestions.length, 0);
  assert.equal(dash.answeredQuestions[0].answer, 'Até as 2h.');

  const pub = await fetchArtistBySlug(slug);
  assert.equal(pub.questions[0].answer, 'Até as 2h.');
});

test('fotos: grava em disco so JPEG; dono troca e remove; terceiro nao', async () => {
  const dir = `${process.env.MEDIA_DIR}/${artistId}`;
  as('a');
  assert.match((await profile.addArtistPhoto(imageForm(Buffer.from('<svg/>'), 'image/jpeg'))).error, /inválido/);
  assert.match((await profile.addArtistPhoto(imageForm(Buffer.alloc(6 * 1024 * 1024, 0xff)))).error, /5 MB/);

  const added = await profile.addArtistPhoto(imageForm());
  assert.equal(added.ok, true);
  assert.match(added.photo.url, new RegExp(`^/media/${artistId}/[0-9a-f-]+\\.jpg$`));
  const file = added.photo.url.split('/').pop();
  assert.ok(fs.existsSync(`${dir}/${file}`));

  const cover1 = await profile.setArtistCover(imageForm());
  const cover2 = await profile.setArtistCover(imageForm());
  assert.ok(!fs.existsSync(`${dir}/${cover1.url.split('/').pop()}`), 'capa antiga apagada');
  assert.ok(fs.existsSync(`${dir}/${cover2.url.split('/').pop()}`));

  as('b');
  assert.match((await profile.removeArtistPhoto(added.photo.id)).error, /não encontrado/);
  as('a');
  assert.deepEqual(await profile.removeArtistPhoto(added.photo.id), { ok: true });
  assert.ok(!fs.existsSync(`${dir}/${file}`));

  await one(`insert into artist_media (artist_id, type, url, sort_order) select $1, 'photo', '/x.jpg', g from generate_series(1, 12) g`, [artistId]);
  assert.match((await profile.addArtistPhoto(imageForm())).error, /até 12 fotos/);
  assert.equal(fs.readdirSync(dir).length, 1, 'so a capa atual sobra no disco');
  assert.deepEqual(await profile.setArtistCover(null), { ok: true, url: null });
  assert.equal(fs.readdirSync(dir).length, 0);
});

test('recuperacao de senha: codigo, autorizacao e todas as sessoes encerradas', async () => {
  as('b');
  const before = await getCurrentUser();
  assert.ok(before);
  as('b-reset');
  assert.deepEqual(await acc.requestPasswordReset(null, form({ email: 'cliente@test.local' })), { ok: true, email: 'cliente@test.local' });
  const code = lastMail().match(/\b\d{6}\b/)[0];
  const mails = inbox.length;
  await acc.requestPasswordReset(null, form({ email: 'cliente@test.local' }));
  assert.equal(inbox.length, mails, 'segundo pedido em menos de 1 minuto nao envia');
  assert.deepEqual(await acc.requestPasswordReset(null, form({ email: 'ninguem@test.local' })), { ok: true, email: 'ninguem@test.local' });

  const wrong = code === '000000' ? '111111' : '000000';
  assert.match((await acc.verifyRecoveryCode(null, form({ email: 'cliente@test.local', code: wrong }))).error, /inválido/);
  assert.deepEqual(await acc.updatePassword(null, form({ password: 'nova-senha-1', confirmation: 'nova-senha-1' })),
    { error: 'A sessão de recuperação expirou. Peça um novo código.' });
  assert.deepEqual(await acc.verifyRecoveryCode(null, form({ email: 'cliente@test.local', code })), { ok: true });
  assert.ok(jars['b-reset'].get('fz_password_reset'));
  assert.deepEqual(await acc.updatePassword(null, form({ password: 'nova-senha-1', confirmation: 'nova-senha-1' })), { ok: true });
  assert.ok(!jars['b-reset'].has('fz_password_reset'));

  as('b');
  assert.equal(await getCurrentUser(), null, 'sessao antiga encerrada');
  assert.match((await acc.signIn(null, form({ email: 'cliente@test.local', password: 'senha-forte-1' }))).error, /incorretos/);
  assert.equal((await acc.signIn(null, form({ email: 'cliente@test.local', password: 'nova-senha-1' }))).ok, true);
});

test('codigo de recuperacao morre na quinta tentativa errada', async () => {
  await one(`delete from auth_tokens where purpose = 'password_reset'`);
  as('c-reset');
  await acc.requestPasswordReset(null, form({ email: 'intruso@test.local' }));
  const code = lastMail().match(/\b\d{6}\b/)[0];
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i += 1) await acc.verifyRecoveryCode(null, form({ email: 'intruso@test.local', code: wrong }));
  assert.match((await acc.verifyRecoveryCode(null, form({ email: 'intruso@test.local', code }))).error, /inválido/);
});

test('visualizacao conta uma vez por visitante', async () => {
  const before = (await one('select view_count from artists where id = $1', [artistId])).view_count;
  as('visitante');
  await recordArtistView(slug);
  await recordArtistView(slug);
  as('outro-visitante');
  await recordArtistView(slug);
  await recordArtistView("x'; drop table artists; --");
  assert.equal((await one('select view_count from artists where id = $1', [artistId])).view_count, before + 2);
});

/*
 * "Continuar com Google". O Google e simulado: fetch devolve um ID token com
 * as claims de cada caso, e o callback recebe o state guardado na ida.
 */
process.env.GOOGLE_CLIENT_ID = 'cliente-teste.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'segredo-teste';
const googleStart = await import(`${L}/app/auth/google/route.js`);
const googleCallback = await import(`${L}/app/auth/google/callback/route.js`);

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const idToken = (claims) => `${b64({ alg: 'RS256' })}.${b64(claims)}.assinatura`;

async function googleLogin(who, claims = {}, { start = '', callback = {} } = {}) {
  as(who);
  const go = await googleStart.GET(new Request(`http://localhost:3000/auth/google${start}`));
  const google = new URL(go.headers.get('location'));
  const sent = Object.fromEntries(google.searchParams);

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://oauth2.googleapis.com/token');
    const body = new URLSearchParams(String(init.body));
    assert.equal(body.get('code'), 'code-do-google');
    assert.equal(body.get('client_secret'), 'segredo-teste');
    assert.ok(body.get('code_verifier'));
    return Response.json({
      id_token: idToken({
        iss: 'https://accounts.google.com',
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce: sent.nonce,
        email_verified: true,
        ...claims,
      }),
    });
  };
  try {
    const back = new URL('http://localhost:3000/auth/google/callback');
    back.search = new URLSearchParams({ code: 'code-do-google', state: sent.state, ...callback }).toString();
    const res = await googleCallback.GET(new Request(back));
    return { sent, location: res.headers.get('location') };
  } finally {
    globalThis.fetch = realFetch;
  }
}

test('google: a ida leva ao Google com PKCE, state e o endereco de volta', async () => {
  as('g0');
  const res = await googleStart.GET(new Request('http://localhost:3000/auth/google?como=artista&next=/reservar/dj-kauan'));
  const url = new URL(res.headers.get('location'));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:3000/auth/google/callback');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('state'));
  assert.ok(jars.g0.get('fz_google_oauth'));
  assert.ok(!res.headers.get('location').includes('segredo-teste'));
});

test('google: conta nova completa o cadastro e entra sem senha', async () => {
  const { location } = await googleLogin('g1', { sub: 'google-1', email: 'Nova@Gmail.test', name: 'Nova Pessoa' });
  assert.equal(location, 'http://localhost:3000/cadastro/completar');
  assert.ok(jars.g1.get('fz_google_signup'));
  assert.equal(jars.g1.get('fz_session'), undefined);

  const missing = await acc.completeGoogleSignup(null, form({ signupAs: 'artist', fullName: 'Nova Pessoa', terms: 'on' }));
  assert.match(missing.error, /WhatsApp/);

  const r = await acc.completeGoogleSignup(null, form({
    signupAs: 'artist', fullName: 'Nova Pessoa', phone: '(51) 97777-6666', terms: 'on', stageName: 'DJ Nova', category: 'dj',
  }));
  assert.deepEqual(r, { ok: true, destination: '/painel' });
  assert.equal((await getCurrentUser()).email, 'nova@gmail.test');
  assert.ok(!jars.g1.has('fz_google_signup'));

  const row = await one(`select u.password_hash, u.email_verified_at, u.google_sub, a.slug
    from users u join artists a on a.profile_id = u.id where u.email = 'nova@gmail.test'`);
  assert.equal(row.password_hash, null);
  assert.ok(row.email_verified_at);
  assert.equal(row.google_sub, 'google-1');
  assert.equal(row.slug, 'dj-nova');
  assert.equal((await one('select count(*)::int n from google_signups')).n, 0);

  // Sem senha, o login por senha explica o caminho.
  const pw = await acc.signIn(null, form({ email: 'nova@gmail.test', password: 'qualquer' }));
  assert.match(pw.error, /entra pelo Google/);

  // Na volta seguinte, entra direto.
  const again = await googleLogin('g1b', { sub: 'google-1', email: 'nova@gmail.test' });
  assert.equal(again.location, 'http://localhost:3000/painel');
  assert.ok(jars.g1b.get('fz_session'));
});

test('google: conta com senha e o mesmo e-mail entra e fica vinculada', async () => {
  const { location } = await googleLogin('g2', { sub: 'google-2', email: 'cliente@test.local' }, { start: '?next=/reservar/dj-kauan' });
  assert.equal(location, 'http://localhost:3000/reservar/dj-kauan');
  assert.equal((await getCurrentUser()).email, 'cliente@test.local');
  const row = await one(`select google_sub, password_hash from users where email = 'cliente@test.local'`);
  assert.equal(row.google_sub, 'google-2');
  assert.ok(row.password_hash);
  // A senha continua valendo (trocada para nova-senha-1 no teste de recuperacao).
  as('g2b');
  assert.equal((await acc.signIn(null, form({ email: 'cliente@test.local', password: 'nova-senha-1' }))).ok, true);
});

test('google: cadastro por senha nunca confirmado e substituido', async () => {
  as('g3');
  await acc.signUp(null, form(signupFields({ email: 'pendente@test.local', fullName: 'Quem Nao Confirmou' })));
  const { location } = await googleLogin('g3', { sub: 'google-3', email: 'pendente@test.local', name: 'Dona Do Email' }, { start: '?como=contratante' });
  assert.equal(location, 'http://localhost:3000/cadastro/completar');
  const r = await acc.completeGoogleSignup(null, form({
    signupAs: 'contractor', fullName: 'Dona Do Email', phone: '(51) 96666-5555', terms: 'on',
  }));
  assert.deepEqual(r, { ok: true, destination: '/minhas-reservas' });
  const row = await one(`select count(*)::int n, max(p.full_name) name, bool_and(u.password_hash is null) no_password
    from users u join profiles p on p.id = u.id where u.email = 'pendente@test.local'`);
  assert.deepEqual(row, { n: 1, name: 'Dona Do Email', no_password: true });
});

test('google: volta falsificada, cancelada ou com token invalido nao entra', async () => {
  const forged = await googleLogin('g4', { sub: 'google-4', email: 'g4@test.local' }, { callback: { state: 'outro' } });
  assert.equal(forged.location, 'http://localhost:3000/entrar?erro=google');
  const cancelled = await googleLogin('g4', {}, { callback: { error: 'access_denied' } });
  assert.equal(cancelled.location, 'http://localhost:3000/entrar?erro=google-cancelado');
  const unverified = await googleLogin('g4', { sub: 'google-4', email: 'g4@test.local', email_verified: false });
  assert.equal(unverified.location, 'http://localhost:3000/entrar?erro=google');
  const otherApp = await googleLogin('g4', { sub: 'google-4', email: 'g4@test.local', aud: 'outro-app' });
  assert.equal(otherApp.location, 'http://localhost:3000/entrar?erro=google');
  const badNonce = await googleLogin('g4', { sub: 'google-4', email: 'g4@test.local', nonce: 'outro' });
  assert.equal(badNonce.location, 'http://localhost:3000/entrar?erro=google');
  assert.equal(jars.g4.get('fz_session'), undefined);
  assert.equal(await one(`select 1 from users where email = 'g4@test.local'`), undefined);

  // Outra conta Google com o e-mail de uma conta ja vinculada.
  const conflict = await googleLogin('g4', { sub: 'google-outra', email: 'nova@gmail.test' });
  assert.equal(conflict.location, 'http://localhost:3000/entrar?erro=google-conta');

  as('g5');
  const expired = await acc.completeGoogleSignup(null, form({
    signupAs: 'contractor', fullName: 'Sem Cookie', phone: '(51) 96666-5555', terms: 'on',
  }));
  assert.match(expired.error, /tempo para concluir/);
});

test('sair encerra a sessao no banco', async () => {
  as('a');
  const token = jars.a.get('fz_session');
  assert.ok(await getCurrentUser());
  await acc.signOut();
  assert.ok(!jars.a.has('fz_session'));
  jars.a.set('fz_session', token);
  assert.equal(await getCurrentUser(), null);
});

test.after(async () => {
  console.info = info;
  await db.end();
  fs.rmSync(process.env.MEDIA_DIR, { recursive: true, force: true });
});
