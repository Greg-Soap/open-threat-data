/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import { middleware } from './kernel.js'
import { apiThrottle, throttle } from './limiter.js'

const AuthController = () => import('#controllers/auth_controller')
const HealthChecksController = () => import('#controllers/health_checks_controller')
const UsersController = () => import('#controllers/users_controller')
const SessionsController = () => import('#controllers/sessions_controller')
const AuditsController = () => import('#controllers/audits_controller')
const IntelController = () => import('#controllers/intel_controller')
const LookupController = () => import('#controllers/lookup_controller')

router.on('/').renderInertia('home')
router.on('/home').renderInertia('home')

// Public lookup (guest + auth): paste anything → results + comments (comment form only when logged in)
router.get('/lookup', [LookupController, 'show'])

// Guest routes
router
  .group(() => {
    router.on('/login').renderInertia('login')
    router.on('/signup').renderInertia('signup')
    router.on('/forgot-password').renderInertia('forgot-password')
    router.on('/reset-password').renderInertia('reset-password')
  })
  .use(middleware.guest())

// Public routes
router.on('/verify-email').renderInertia('verify-email')
router.on('/verify-email-change').renderInertia('verify-email-change')

// Authenticated routes
router
  .group(() => {
    router.get('/logout', [AuthController, 'logout'])
  })
  .use([middleware.auth()])

// Dashboard and tools (authenticated)
router
  .group(() => {
    router.on('/dashboard').renderInertia('dashboard')
    router.on('/settings').renderInertia('settings/index')
    router.on('/tools/ip').renderInertia('tools/ip')
    router.on('/tools/domain').renderInertia('tools/domain')
    router.on('/tools/hash').renderInertia('tools/hash')
    router.on('/tools/ssl').renderInertia('tools/ssl')
    router.on('/tools/email').renderInertia('tools/email')
    router.on('/tools/latency').renderInertia('tools/latency')
    router.on('/tools/url-tracer').renderInertia('tools/url-tracer')
    router.on('/tools/monitor').renderInertia('tools/monitor')
  })
  .use([middleware.auth()])

// Auth API
router
  .group(() => {
    router.post('/signup', [AuthController, 'signUp'])
    router.post('/login', [AuthController, 'login'])
    router.post('/forgot-password', [AuthController, 'forgotPassword'])
    router.post('/reset-password', [AuthController, 'resetPassword'])
    router.get('/verify-email', [AuthController, 'verifyEmail'])
    router.get('/verify-email-change', [AuthController, 'verifyEmailChange'])
    router
      .post('/verify-email/resend', [AuthController, 'resendVerificationEmail'])
      .use(middleware.auth())
  })
  .prefix('api/v1/auth')
  .use(throttle)

// User API (profile + password only; no 2FA)
router
  .group(() => {
    router.put('/profile', [UsersController, 'updateProfile'])
    router.put('/password', [UsersController, 'updatePassword'])
    router.post('/avatar', [UsersController, 'uploadAvatar'])
    router.delete('/avatar', [UsersController, 'deleteAvatar'])
    router.get('/sessions', [SessionsController, 'index'])
    router.post('/sessions/revoke', [SessionsController, 'revoke'])
    router.post('/sessions/revoke-all', [SessionsController, 'revokeAll'])
    router.put('/settings', [UsersController, 'updateSettings'])
    router.get('/settings', [UsersController, 'getSettings'])
  })
  .prefix('api/v1/user')
  .use(middleware.auth())

// Audits (for "who checked" and activity)
router
  .group(() => {
    router.get('/', [AuditsController, 'index'])
    router.get('/recent', [AuditsController, 'recent'])
  })
  .prefix('api/v1/audits')
  .use(middleware.auth())

// Intel / OSINT tools API
router
  .group(() => {
    router.get('/ip/sample', [IntelController, 'ipSample'])
    router.post('/ip', [IntelController, 'ip'])
    router.get('/domain/sample', [IntelController, 'domainSample'])
    router.post('/domain', [IntelController, 'domain'])
    router.post('/hash', [IntelController, 'hash'])
    router.get('/ssl/sample', [IntelController, 'sslSample'])
    router.post('/ssl', [IntelController, 'ssl'])
    router.post('/email', [IntelController, 'email'])
    router.get('/latency/sample', [IntelController, 'latencySample'])
    router.post('/latency', [IntelController, 'latency'])
    router.get('/url-tracer/sample', [IntelController, 'urlTracerSample'])
    router.post('/url-tracer', [IntelController, 'urlTracer'])
    router.post('/comment', [IntelController, 'comment'])
    router.get('/monitor', [IntelController, 'monitor'])
  })
  .prefix('api/v1/intel')
  .use(middleware.auth())
  .use(apiThrottle)

router.get('/health', [HealthChecksController])

transmit.registerRoutes()

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.rapidoc('/swagger')
})
