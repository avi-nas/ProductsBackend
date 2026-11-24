import nodemailer, { type Transporter } from "nodemailer";

import type { EmailMessage } from "../domain/enquiry.js";
import { AppError } from "../errors.js";
import type { EmailProvider } from "../ports/email-provider.js";

interface MailTransport {
  sendMail(message: {
    readonly from: string;
    readonly to: string;
    readonly replyTo: string;
    readonly subject: string;
    readonly text: string;
    readonly disableFileAccess: true;
    readonly disableUrlAccess: true;
  }): Promise<{
    readonly accepted?: readonly unknown[] | undefined;
    readonly rejected?: readonly unknown[] | undefined;
  }>;
}

export interface SMTPEmailProviderOptions {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user?: string;
  readonly password?: string;
  readonly from: string;
  readonly to: string;
  readonly transport?: MailTransport;
}

function deliveryFailed(): AppError {
  return new AppError(502, "EMAIL_DELIVERY_FAILED", "The enquiry email could not be delivered.");
}

function createSMTPTransport(options: SMTPEmailProviderOptions): Transporter {
  return nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    ...(options.user && options.password
      ? { auth: { user: options.user, pass: options.password } }
      : {}),
  });
}

export class SMTPEmailProvider implements EmailProvider {
  private readonly transport: MailTransport;

  constructor(private readonly options: SMTPEmailProviderOptions) {
    this.transport = options.transport ?? createSMTPTransport(options);
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      const result = await this.transport.sendMail({
        from: this.options.from,
        to: this.options.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        disableFileAccess: true,
        disableUrlAccess: true,
      });

      const accepted = result.accepted ?? [];
      const rejected = result.rejected ?? [];
      if (accepted.length === 0 || rejected.length > 0) {
        throw deliveryFailed();
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw deliveryFailed();
    }
  }
}
