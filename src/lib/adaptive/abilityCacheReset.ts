type ResetHandler = () => void | Promise<void>

let resetHandler: ResetHandler | null = null

/**
 * Keeps the legacy ability cache resettable without importing the root
 * adaptive module from AdaptiveQuestionEngine (which would create a cycle).
 */
export function registerAbilityCacheReset(handler: ResetHandler): void {
  resetHandler = handler
}

export function resetAbilityCache(): void {
  void resetHandler?.()
}

export async function resetAbilityCacheAsync(): Promise<void> {
  await resetHandler?.()
}
