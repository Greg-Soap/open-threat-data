import LookupHistory, { type LookupType } from '#models/lookup_history'
import LookupComment from '#models/lookup_comment'

export interface CheckedByEntry {
  userId: string
  userName: string | null
  userEmail: string
  at: string
}

export interface CommentEntry {
  id: number
  userId: string
  userName: string | null
  userEmail: string
  body: string
  createdAt: string
}

export class LookupHistoryService {
  async recordLookup(userId: string, type: LookupType, target: string): Promise<LookupHistory> {
    return LookupHistory.create({
      userId,
      type,
      target: target.trim(),
    })
  }

  async getCheckedBy(type: LookupType, target: string, limit = 10): Promise<CheckedByEntry[]> {
    const normalizedTarget = target.trim()
    const rows = await LookupHistory.query()
      .where({ type, target: normalizedTarget })
      .preload('user')
      .orderBy('created_at', 'desc')
      .limit(limit)

    const seen = new Set<string>()
    const result: CheckedByEntry[] = []
    for (const row of rows) {
      if (seen.has(row.userId)) continue
      seen.add(row.userId)
      result.push({
        userId: row.user.id,
        userName: row.user.fullName,
        userEmail: row.user.email,
        at: row.createdAt.toISO?.() ?? String(row.createdAt),
      })
    }
    return result
  }

  async getComments(type: LookupType, target: string, limit = 50): Promise<CommentEntry[]> {
    const normalizedTarget = target.trim()
    const rows = await LookupComment.query()
      .where({ type, target: normalizedTarget })
      .preload('user')
      .orderBy('created_at', 'desc')
      .limit(limit)

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user?.fullName ?? null,
      userEmail: row.user?.email ?? '',
      body: row.body,
      createdAt: row.createdAt.toISO?.() ?? String(row.createdAt),
    }))
  }

  async addComment(
    userId: string,
    type: LookupType,
    target: string,
    body: string
  ): Promise<CommentEntry> {
    const comment = await LookupComment.create({
      userId,
      type,
      target: target.trim(),
      body: body.trim(),
    })
    await comment.load('user')
    return {
      id: comment.id,
      userId: comment.userId,
      userName: comment.user?.fullName ?? null,
      userEmail: comment.user?.email ?? '',
      body: comment.body,
      createdAt: comment.createdAt.toISO?.() ?? String(comment.createdAt),
    }
  }
}

export default new LookupHistoryService()
