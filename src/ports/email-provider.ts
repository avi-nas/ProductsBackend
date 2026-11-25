import type { EmailMessage } from "../domain/enquiry.js";

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
