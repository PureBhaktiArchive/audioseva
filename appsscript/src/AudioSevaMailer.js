/*
 * sri sri guru gauranga jayatah
 */

export class AudioSevaMailer {
  static sendEmail(message) {
    GmailApp.sendEmail(message.recipient || 'audioseva@purebhakti.info', message.subject, '', {
      from: 'audioseva@purebhakti.info',
      name: 'Pure Bhakti Audio Seva',
      bcc: message.recipient ? 'audioseva@purebhakti.info' : null,
      replyTo: message.replyTo,
      htmlBody: message.htmlBody
    });
  }
}
