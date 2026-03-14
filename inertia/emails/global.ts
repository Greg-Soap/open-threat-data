export const appUrl = process.env.APP_URL || ''

const supportEmail =
  process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'support@example.com'
export const supportMail = `mailto:${supportEmail}`
