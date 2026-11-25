import { describe, expect, it, vi } from "vitest";

import { SMTPEmailProvider } from "../../src/adapters/smtp-email-provider.js";

function provider(sendMail: (message: unknown) => Promise<{ accepted: unknown[]; rejected: unknown[] }>) {
  return new SMTPEmailProvider({
    host: "smtp.example.test",
    port: 587,
    secure: false,
    from: "products@example.test",
    to: "sales@example.test",
    transport: { sendMail },
  });
}

const message = {
  replyTo: "asha@example.test",
  subject: "New product enquiry for product 7",
  text: "Customer name: Asha",
};

describe("SMTPEmailProvider", () => {
  it("resolves only when SMTP accepts a recipient", async () => {
    const sendMail = vi.fn(async () => ({ accepted: ["sales@example.test"], rejected: [] }));

    await expect(provider(sendMail).send(message)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledWith({
      from: "products@example.test",
      to: "sales@example.test",
      replyTo: "asha@example.test",
      subject: message.subject,
      text: message.text,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  });

  it("rejects partial or empty SMTP acceptance", async () => {
    const rejected = vi.fn(async () => ({ accepted: [], rejected: ["sales@example.test"] }));

    await expect(provider(rejected).send(message)).rejects.toMatchObject({
      statusCode: 502,
      code: "EMAIL_DELIVERY_FAILED",
    });
  });

  it("maps transport failures to a safe delivery error", async () => {
    const failed = vi.fn(async () => {
      throw new Error("SMTP credentials rejected");
    });

    await expect(provider(failed).send(message)).rejects.toMatchObject({
      statusCode: 502,
      code: "EMAIL_DELIVERY_FAILED",
      message: "The enquiry email could not be delivered.",
    });
  });
});
