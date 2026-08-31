import type { SrtItem } from './types'

const GAPS = [1, 2, 4, 8]

export function bumpSuccess(item: SrtItem): SrtItem {
  item.level = Math.min(item.level + 1, GAPS.length - 1)
  item.lastSeenTs = Date.now()
  return item
}

export function bumpMiss(item: SrtItem): SrtItem {
  item.level = Math.max(item.level - 1, 0)
  item.lastSeenTs = Date.now()
  return item
}

export function gapFor(item: SrtItem): number {
  return GAPS[Math.min(item.level, GAPS.length - 1)]
}

export function scheduleRound<T>(items: T[], gapOf: (item: T, index: number) => number): T[] {
  if (items.length === 0) return []
  const order: T[] = []
  const nextDue = items.map(() => 0)
  let turn = 0
  const maxRounds = items.length * 2 + 4
  while (order.length < maxRounds && turn < 100) {
    let scheduledAny = false
    for (let i = 0; i < items.length; i++) {
      if (nextDue[i] <= turn) {
        order.push(items[i])
        const gap = gapOf(items[i], i)
        nextDue[i] = turn + gap + 1
        turn++
        scheduledAny = true
        if (order.length >= maxRounds) break
      }
    }
    if (!scheduledAny) turn++
  }
  return order
}
