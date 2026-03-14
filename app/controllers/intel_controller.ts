import type { HttpContext } from '@adonisjs/core/http'
import lookupHistoryService from '#services/lookup_history_service'
import IpIntelService from '#services/ip_intel_service'
import DomainIntelService from '#services/domain_intel_service'
import HashIntelService from '#services/hash_intel_service'
import SslIntelService from '#services/ssl_intel_service'
import EmailIntelService from '#services/email_intel_service'
import LatencyIntelService from '#services/latency_intel_service'
import UrlTracerService from '#services/url_tracer_service'
import UrlReputationService from '#services/url_reputation_service'
import LookupHistory from '#models/lookup_history'
import { intelTargetValidator, intelCommentValidator, sslTargetValidator } from '#validators/intel'

export default class IntelController {
  async ip({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { target } = await request.validateUsing(intelTargetValidator)

    const service = new IpIntelService()
    const result = await service.lookup(target)
    await lookupHistoryService.recordLookup(user.id, 'ip', target)
    const checkedBy = await lookupHistoryService.getCheckedBy('ip', target)
    const comments = await lookupHistoryService.getComments('ip', target)

    return response.ok({ result, checkedBy, comments })
  }

  async domain({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { target } = await request.validateUsing(intelTargetValidator)

    const service = new DomainIntelService()
    const result = await service.lookup(target)
    await lookupHistoryService.recordLookup(user.id, 'domain', target)
    const checkedBy = await lookupHistoryService.getCheckedBy('domain', target)
    const comments = await lookupHistoryService.getComments('domain', target)

    return response.ok({ result, checkedBy, comments })
  }

  async hash({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { target } = await request.validateUsing(intelTargetValidator)

    const service = new HashIntelService()
    const result = await service.lookup(target)
    await lookupHistoryService.recordLookup(user.id, 'hash', target)
    const checkedBy = await lookupHistoryService.getCheckedBy('hash', target)
    const comments = await lookupHistoryService.getComments('hash', target)

    return response.ok({ result, checkedBy, comments })
  }

  async ssl({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { target } = await request.validateUsing(sslTargetValidator)
    const [host, portStr] = target.includes(':') ? target.split(':') : [target, '443']
    const port = Number(portStr) || 443
    const sslTarget = `${host}:${port}`

    const service = new SslIntelService()
    const result = await service.inspect(host, port)
    await lookupHistoryService.recordLookup(user.id, 'ssl', sslTarget)
    const checkedBy = await lookupHistoryService.getCheckedBy('ssl', sslTarget)
    const comments = await lookupHistoryService.getComments('ssl', sslTarget)

    return response.ok({ result, checkedBy, comments })
  }

  async email({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { target } = await request.validateUsing(intelTargetValidator)

    const service = new EmailIntelService()
    const result = await service.check(target)
    await lookupHistoryService.recordLookup(user.id, 'email', target)
    const checkedBy = await lookupHistoryService.getCheckedBy('email', target)
    const comments = await lookupHistoryService.getComments('email', target)

    return response.ok({ result, checkedBy, comments })
  }

  async latency({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { target } = await request.validateUsing(intelTargetValidator)

    const service = new LatencyIntelService()
    const result = await service.measure(target)
    await lookupHistoryService.recordLookup(user.id, 'latency', target)
    const checkedBy = await lookupHistoryService.getCheckedBy('latency', target)
    const comments = await lookupHistoryService.getComments('latency', target)

    return response.ok({ result, checkedBy, comments })
  }

  async urlTracer({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { target } = await request.validateUsing(intelTargetValidator)

    const service = new UrlTracerService()
    const result = await service.trace(target)
    await lookupHistoryService.recordLookup(user.id, 'url', target)
    const checkedBy = await lookupHistoryService.getCheckedBy('url', target)
    const comments = await lookupHistoryService.getComments('url', target)

    let threatCheck = null
    const urlToCheck = result.finalUrl || result.initialUrl
    try {
      const reputationService = new UrlReputationService()
      threatCheck = await reputationService.check(urlToCheck)
    } catch {
      // Optional: do not fail the request
    }

    return response.ok({ result: { ...result, threatCheck }, checkedBy, comments })
  }

  async comment({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { type, target, body } = await request.validateUsing(intelCommentValidator)

    const comment = await lookupHistoryService.addComment(user.id, type, target, body)
    return response.ok({ comment })
  }

  async monitor({ auth, request, response }: HttpContext) {
    await auth.authenticate()

    const type = request.qs().type as string | undefined
    const limit = Math.min(Number(request.qs().limit) || 50, 100)

    let query = LookupHistory.query()
      .preload('user')
      .orderBy('created_at', 'desc')
      .limit(limit)

    if (type && ['ip', 'domain', 'hash', 'url', 'email', 'ssl', 'latency'].includes(type)) {
      query = query.where('type', type)
    }

    const rows = await query
    const lookups = rows.map((r) => ({
      type: r.type,
      target: r.target,
      userName: r.user?.fullName ?? null,
      userEmail: r.user?.email,
      createdAt: r.createdAt.toISO?.(),
    }))

    return response.ok({ lookups })
  }
}
