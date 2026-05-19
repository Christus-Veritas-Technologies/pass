/**
 * Type declarations for the `paynow` npm package.
 * The package ships CommonJS only with no bundled types.
 */
declare module "paynow" {
  export class Payment {
    add(description: string, amount: number): this;
  }

  export interface PaynowResponse {
    success: boolean;
    error?: string;
    redirectUrl?: string;
    pollUrl?: string;
    reference?: string;
  }

  export interface PaynowStatusResponse {
    paid(): boolean;
    status: string;
  }

  export class Paynow {
    resultUrl: string;
    returnUrl: string;

    constructor(integrationId: string, integrationKey: string);

    createPayment(reference: string, email: string): Payment;
    send(payment: Payment): Promise<PaynowResponse>;
    sendMobile(payment: Payment, phone: string, method: string): Promise<PaynowResponse>;
    pollTransaction(pollUrl: string): Promise<PaynowStatusResponse>;
  }
}
