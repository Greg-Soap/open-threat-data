import vine from '@vinejs/vine'

const email = vine.string().toLowerCase().trim().email()

export const createTeamValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(255),
    kind: vine.enum(['user'] as const).optional(),
  }),
)

export const inviteToTeamValidator = vine.compile(
  vine.object({
    email,
    role: vine.enum(['owner', 'admin', 'member']).optional(),
  }),
)

export const acceptTeamInviteGuestValidator = vine.compile(
  vine.object({
    token: vine.string().trim(),
    fullName: vine.string().trim().minLength(2).maxLength(255),
    password: vine.string().minLength(8),
    confirmPassword: vine.string().confirmed({ confirmationField: 'password' }),
  }),
)

export const acceptTeamInviteAuthedValidator = vine.compile(
  vine.object({
    token: vine.string().trim(),
  }),
)

