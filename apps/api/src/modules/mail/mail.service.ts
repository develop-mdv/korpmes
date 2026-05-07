import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD missing) — emails will be logged instead of sent',
      );
      return;
    }

    const port = Number(this.configService.get<string>('SMTP_PORT', '465'));
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER') ||
      'noreply@staffhub.local';

    const subject = 'Восстановление пароля StaffHub';
    const text = [
      'Здравствуйте,',
      '',
      'Мы получили запрос на восстановление пароля для вашего аккаунта StaffHub.',
      'Чтобы установить новый пароль, перейдите по ссылке ниже (действительна 1 час):',
      '',
      resetUrl,
      '',
      'Если вы не запрашивали восстановление, просто игнорируйте это письмо.',
      '',
      '— Команда StaffHub',
    ].join('\n');

    const html = `
<!doctype html>
<html lang="ru">
  <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f5f5f7; margin:0; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:18px; padding:28px 32px; box-shadow:0 6px 24px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 12px; color:#0f1115;">Восстановление пароля</h2>
      <p style="color:#3a3f48; line-height:1.55;">
        Мы получили запрос на восстановление пароля для вашего аккаунта StaffHub.
        Нажмите кнопку ниже, чтобы установить новый пароль. Ссылка действительна 1 час.
      </p>
      <p style="margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block; padding:12px 22px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:999px; font-weight:600;">Сменить пароль</a>
      </p>
      <p style="color:#6b7280; font-size:13px; line-height:1.5;">
        Или скопируйте ссылку: <br/>
        <span style="word-break:break-all; color:#4F46E5;">${resetUrl}</span>
      </p>
      <p style="color:#9aa1ad; font-size:12px; margin-top:24px;">
        Если вы не запрашивали восстановление — просто игнорируйте это письмо.
      </p>
    </div>
  </body>
</html>`.trim();

    if (!this.transporter) {
      this.logger.log(
        `SMTP disabled — would send password-reset to ${email} with link: ${resetUrl}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from, to: email, subject, text, html });
      this.logger.log(`Password-reset email sent to ${email}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send password-reset email to ${email}: ${err?.message ?? err}`,
      );
      // Do not throw — caller treats forgot-password as silent for enumeration safety.
    }
  }
}
