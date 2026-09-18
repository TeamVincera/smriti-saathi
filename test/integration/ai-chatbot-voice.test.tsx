import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const availability = vi.hoisted(() => ({ value: true }))

vi.mock('../../src/lib/ai/availability', () => ({ useAIAvailable: () => availability.value, isAIAvailable: () => availability.value }))

vi.mock('../../src/state', () => ({
  useApp: vi.fn(),
}))

vi.mock('../../src/lib/ai', () => ({
  AIService: { chat: vi.fn(async () => 'A gentle reply.') },
  PatientContextBuilder: { build: vi.fn(() => ({})) },
}))

import { useApp } from '../../src/state'
import { AIChatbot } from '../../src/components/AIChatbot'

const mockedUseApp = vi.mocked(useApp)

describe('AI chatbot voice control', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    mockedUseApp.mockReturnValue({
      profile: { patient: { name: 'Sarala' } },
      meds: [],
      dailyReminders: [],
      appointments: [],
      sessions: [],
      medlog: [],
      refreshMedLog: vi.fn(async () => {}),
      refreshSessions: vi.fn(async () => {}),
      lang: 'en',
    } as never)
  })

  afterEach(() => {
    availability.value = true
    delete (window as Window & { visualViewport?: VisualViewport }).visualViewport
    document.body.style.overflow = ''
  })

  it('keeps text entry and exposes a labeled mic with a calm unsupported notice', async () => {
    render(<AIChatbot />)
    fireEvent.click(screen.getByTestId('ai-chat-btn'))

    const input = await screen.findByPlaceholderText('Type or speak a question...')
    const mic = screen.getByTestId('chat-mic-btn')
    expect(input).toBeInTheDocument()
    expect(mic).toHaveAccessibleName('Speak a question')

    fireEvent.click(mic)

    expect(await screen.findByRole('status')).toHaveTextContent('Voice typing is not supported on this device.')
    expect(input).toBeInTheDocument()
  })

  it('labels the modal, focuses text entry, closes with Escape, and restores the opener', async () => {
    render(<AIChatbot />)
    const opener = screen.getByTestId('ai-chat-btn')
    opener.focus()
    fireEvent.click(opener)

    const dialog = await screen.findByRole('dialog')
    const input = screen.getByPlaceholderText('Type or speak a question...')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'sathi-chat-title')
    expect(screen.getByRole('heading', { name: 'Sathi AI Companion' })).toBeInTheDocument()
    expect(document.activeElement).toBe(input)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByTestId('ai-chat-btn'))
  })

  it('keeps Tab navigation inside the modal', async () => {
    render(<AIChatbot />)
    fireEvent.click(screen.getByTestId('ai-chat-btn'))
    const dialog = await screen.findByRole('dialog')
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, input')).filter(
      (element) => !(element as HTMLButtonElement).disabled
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('anchors the chat sheet to visual viewport changes from the mobile keyboard', async () => {
    const listeners = new Map<string, EventListener>()
    const viewport = {
      height: 844,
      offsetTop: 0,
      addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport as unknown as VisualViewport })

    render(<AIChatbot />)
    fireEvent.click(screen.getByTestId('ai-chat-btn'))

    const dialog = await screen.findByTestId('ai-chat-overlay')
    const panel = screen.getByTestId('ai-chat-panel')
    const input = screen.getByPlaceholderText('Type or speak a question...')
    expect(dialog).toHaveStyle({ height: '844px' })
    expect(panel).toHaveStyle({ height: 'min(90%, 720px)' })
    expect(input).toHaveStyle({ color: 'var(--ink)' })
    expect(document.body.style.overflow).toBe('hidden')

    viewport.height = 390
    listeners.get('resize')?.(new Event('resize'))
    await waitFor(() => expect(dialog).toHaveStyle({ height: '390px' }))
    expect(screen.getByTestId('chat-mic-btn')).toBeVisible()
    expect(screen.getByTestId('send-chat-btn')).toBeVisible()
  })

  it('keeps an open chat mounted through a transient availability change', async () => {
    render(<AIChatbot />)
    fireEvent.click(screen.getByTestId('ai-chat-btn'))
    const input = await screen.findByPlaceholderText('Type or speak a question...')

    availability.value = false
    fireEvent.change(input, { target: { value: 'Keep my conversation open' } })

    expect(screen.getByTestId('ai-chat-overlay')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Keep my conversation open')).toBeInTheDocument()
    expect(screen.queryByTestId('ai-chat-btn')).not.toBeInTheDocument()
  })
})
