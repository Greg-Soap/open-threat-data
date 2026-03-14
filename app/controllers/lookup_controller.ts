import type { HttpContext } from '@adonisjs/core/http'
import lookupHistoryService from '#services/lookup_history_service'
import { detectLookupType } from '#services/lookup_type_detector'
import IpIntelService from '#services/ip_intel_service'
import DomainIntelService from '#services/domain_intel_service'
import HashIntelService from '#services/hash_intel_service'
import SslIntelService from '#services/ssl_intel_service'
import EmailIntelService from '#services/email_intel_service'
import LatencyIntelService from '#services/latency_intel_service'
import UrlTracerService from '#services/url_tracer_service'
import UrlReputationService from '#services/url_reputation_service'
import type { LookupType } from '#models/lookup_history'

const MAX_QUERY_LENGTH = 2048

export default class LookupController {
  async show({ auth, inertia, request }: HttpContext) {
    const q = request.qs().q
    const raw = typeof q === 'string' ? q : ''

    if (!raw || raw.length > MAX_QUERY_LENGTH) {
      return inertia.render('lookup', {
        type: null,
        target: null,
        result: null,
        checkedBy: [],
        comments: [],
        error: raw.length > MAX_QUERY_LENGTH ? 'Input too long.' : null,
      })
    }

    const trimmed = raw.trim()
    if (!trimmed) {
      return inertia.render('lookup', {
        type: null,
        target: null,
        result: null,
        checkedBy: [],
        comments: [],
        error: null,
      })
    }

    const { type, target } = detectLookupType(trimmed)

    let result: unknown
    let lookupTarget = target

    try {
      switch (type) {
        case 'ip': {
          const service = new IpIntelService()
          result = await service.lookup(target)
          break
        }
        case 'domain': {
          const service = new DomainIntelService()
          result = await service.lookup(target)
          break
        }
        case 'hash': {
          const service = new HashIntelService()
          result = await service.lookup(target)
          break
        }
        case 'ssl': {
          const [host, portStr] = target.includes(':') ? target.split(':') : [target, '443']
          const port = Number(portStr) || 443
          lookupTarget = `${host}:${port}`
          const service = new SslIntelService()
          result = await service.inspect(host, port)
          break
        }
        case 'email': {
          const service = new EmailIntelService()
          result = await service.check(target)
          break
        }
        case 'latency': {
          const service = new LatencyIntelService()
          result = await service.measure(target)
          break
        }
        case 'url': {
          const service = new UrlTracerService()
          const traceResult = await service.trace(target)
          let threatCheck = null
          const urlToCheck = traceResult.finalUrl || traceResult.initialUrl
          try {
            const reputationService = new UrlReputationService()
            threatCheck = await reputationService.check(urlToCheck)
          } catch {
            // optional
          }
          result = { ...traceResult, threatCheck }
          break
        }
        default: {
          const service = new DomainIntelService()
          result = await service.lookup(target)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lookup failed.'
      return inertia.render('lookup', {
        type,
        target: lookupTarget,
        result: null,
        checkedBy: await lookupHistoryService.getCheckedBy(type as LookupType, lookupTarget),
        comments: await lookupHistoryService.getComments(type as LookupType, lookupTarget),
        error: message,
      })
    }

    const user = auth.user
    if (user) {
      await lookupHistoryService.recordLookup(user.id, type as LookupType, lookupTarget)
    }

    const checkedBy = await lookupHistoryService.getCheckedBy(type as LookupType, lookupTarget)
    const comments = await lookupHistoryService.getComments(type as LookupType, lookupTarget)

    return inertia.render('lookup', {
      type,
      target: lookupTarget,
      result,
      checkedBy,
      comments,
      error: null,
    })
  }
}
