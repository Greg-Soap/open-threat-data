import vine from '@vinejs/vine'

const lookupTypes = ['ip', 'domain', 'hash', 'url', 'email', 'ssl', 'latency'] as const

export const intelTargetValidator = vine.compile(
  vine.object({
    target: vine.string().trim().minLength(1).maxLength(2048),
  }),
)

export const sslTargetValidator = vine.compile(
  vine.object({
    target: vine.string().trim().minLength(1).maxLength(512), // host or host:port
  }),
)

export const intelCommentValidator = vine.compile(
  vine.object({
    type: vine.enum(lookupTypes),
    target: vine.string().trim().minLength(1).maxLength(2048),
    body: vine.string().trim().minLength(1).maxLength(2000),
  }),
)
