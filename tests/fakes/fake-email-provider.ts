import type { EmailMessage } from "../../src/domain/enquiry.js";
import type { EmailProvider } from "../../src/ports/email-provider.js";

export class FakeEmailProvider implements EmailProvider {
  readonly messages: EmailMessage[] = [];

  constructor(private readonly failure?: Error) {}

  async send(message: EmailMessage): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.messages.push(message);
  }
}
