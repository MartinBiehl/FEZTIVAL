import 'server-only';
import nodemailer from 'nodemailer';

/*
 * Envio dos e-mails de conta: confirmacao de cadastro e codigo de recuperacao.
 *
 * SMTP_URL aceita qualquer provedor (Resend, SES, Brevo...):
 *   smtps://usuario:senha@smtp.exemplo.com:465
 *
 * Sem SMTP_URL, fora de producao, o e-mail e impresso no terminal do
 * `next dev` -- e a caixa de entrada do desenvolvimento. Em producao a falta
 * de SMTP_URL e erro, para nenhum link ou codigo parar no log.
 */

const FROM = process.env.MAIL_FROM || 'Feztival <nao-responda@feztival.local>';

const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;

async function send({ to, subject, text }) {
  if (transport) {
    await transport.sendMail({ from: FROM, to, subject, text });
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('E-mail nao configurado: defina SMTP_URL.');
  }
  console.info(`\n[e-mail de desenvolvimento] Para: ${to}\nAssunto: ${subject}\n\n${text}\n`);
}

export function sendEmailConfirmation(to, url) {
  return send({
    to,
    subject: 'Confirme seu cadastro na Feztival',
    text: `Olá!\n\nPara ativar sua conta na Feztival, abra o link abaixo:\n\n${url}\n\n`
      + 'O link vale por 24 horas. Se você não criou esta conta, ignore este e-mail.',
  });
}

export function sendPasswordResetCode(to, code) {
  return send({
    to,
    subject: `${code} é o seu código da Feztival`,
    text: `Use o código abaixo para criar uma nova senha na Feztival:\n\n${code}\n\n`
      + 'O código vale por 15 minutos. Se você não pediu, ignore este e-mail: sua senha continua a mesma.',
  });
}
