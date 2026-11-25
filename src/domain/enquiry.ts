export interface Enquiry {
  readonly name: string;
  readonly email: string;
  readonly productId: number;
  readonly message?: string;
}

export interface EmailMessage {
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
}
