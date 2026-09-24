export type PasswordResetDelivery = { send(input: { email: string; token: string; expiresAt: Date }): Promise<void> }
/** Replace in an adopting application; never return reset tokens to the client. */
export const passwordResetDelivery: PasswordResetDelivery = { async send() {} }
