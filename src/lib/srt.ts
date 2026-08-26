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
  const order: T[] = []
  const nextDue = items.map((_, i) => 0)
  let turn = 0
  while (order.length < items.length * 2 + 8 && turn < 200) {
    for (let i = 0; i < items.length; i++) {
      if (nextDue[i] <= turn && !order.includes(items[i])) {
        void gapOf(items[i], i)
        order.push(items[i])
      }
    }
    turn++
  }
  return order
}
