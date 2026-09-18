import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useApp } from '../state'
import { AIService, PatientContextBuilder } from '../lib/ai'
import { VoiceService, GroqSpeechToText, whisperLanguage, sanitizeTranscript, getSpeechRecognitionLanguage } from '../lib/voice'
import { Icon } from './Icons'
import { playTap } from '../lib/audio'
import { WaveformMic } from './WaveformMic'
import { useAIAvailable } from '../lib/ai/availability'
import { Capacitor } from '@capacitor/core'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function microphoneAccessMessage(lang: string): string {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') {
    return lang === 'hi'
      ? 'माइक्रोफ़ोन बंद है। iPhone Settings > Apps > Smriti Sathi > Microphone में इसे चालू करें।'
      : 'Microphone is off. Open iPhone Settings > Apps > Smriti Sathi > Microphone and turn it on.'
  }
  if (platform === 'android') {
    return lang === 'hi'
      ? 'माइक्रोफ़ोन बंद है। Android Settings > Apps > Smriti Sathi > Permissions में इसे चालू करें।'
      : 'Microphone is off. Open Android Settings > Apps > Smriti Sathi > Permissions and turn it on.'
  }
  return lang === 'hi'
    ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें।'
    : 'Microphone access is blocked. Please allow it in your browser settings.'
}

export function AIChatbot() {
  const { profile, meds, dailyReminders, appointments, sessions, medlog, refreshMedLog, refreshSessions, lang } = useApp()
  const aiAvailable = useAIAvailable()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const openerRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wasOpenRef = useRef(false)
  const [isListening, setIsListening] = useState(false)
  const [visualViewportFrame, setVisualViewportFrame] = useState<{ height: number; offsetTop: number } | null>(null)
  const [sttNotice, setSttNotice] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const startGroqFallbackRef = useRef<(() => void) | null>(null)
  const fallbackRequestedRef = useRef(false)
  const lastTapRef = useRef(0)
  const sessionStartRef = useRef(0)
  const sttTranscriptRef = useRef('')
  const pendingSttRef = useRef('')
  const busyRef = useRef(false)
  const handleSendMessageRef = useRef<((customText?: string) => Promise<void>) | null>(null)

  const closeChat = useCallback(() => {
    VoiceService.stop()
    setIsOpen(false)
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus()
    })
  }, [])

  useLayoutEffect(() => {
    if (isOpen) {
      const focusTimer = window.setTimeout(() => {
        inputRef.current?.focus()
        if (document.activeElement !== inputRef.current) closeButtonRef.current?.focus()
      }, 0)
      wasOpenRef.current = true
      return () => window.clearTimeout(focusTimer)
    }

    if (wasOpenRef.current) {
      const opener = openerRef.current
      if (opener && opener.isConnected && !opener.hasAttribute('disabled')) {
        opener.focus()
      } else {
        triggerRef.current?.focus()
      }
      wasOpenRef.current = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeChat()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        event.preventDefault()
        closeButtonRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!dialog.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeChat, isOpen])

  // iOS keeps the layout viewport stable while the keyboard changes the
  // visual viewport. Track that frame so the fixed sheet stays above the
  // keyboard and only its message region needs to scroll.
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      setVisualViewportFrame(null)
      return
    }

    const viewport = window.visualViewport
    if (!viewport) return

    const updateViewportFrame = () => {
      if (viewport.height > 0) {
        setVisualViewportFrame({ height: Math.round(viewport.height), offsetTop: Math.round(viewport.offsetTop) })
      }
    }
    updateViewportFrame()
    viewport.addEventListener('resize', updateViewportFrame)
    viewport.addEventListener('scroll', updateViewportFrame)
    return () => {
      viewport.removeEventListener('resize', updateViewportFrame)
      viewport.removeEventListener('scroll', updateViewportFrame)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  // Refresh latest state (medlog and sessions) whenever chatbot opens
  useEffect(() => {
    if (isOpen) {
      void refreshMedLog?.()
      void refreshSessions?.()
    }
  }, [isOpen, refreshMedLog, refreshSessions])

  const sendSttTranscript = useCallback((text: string) => {
    const clean = sanitizeTranscript(text)
    if (!clean) return
    setSttNotice(null)
    setIsListening(false)
    if (busyRef.current) {
      pendingSttRef.current = clean
      setInput(clean)
      return
    }
    setInput(clean)
    if (handleSendMessageRef.current) void handleSendMessageRef.current(clean)
  }, [])

  const startGroqFallback = useCallback(() => {
    fallbackRequestedRef.current = true
    setSttNotice(
      lang === 'hi'
        ? 'इस डिवाइस पर आवाज़ टाइपिंग उपलब्ध नहीं है। कृपया लिखें।'
        : 'Voice typing is not supported on this device. Please type your question.'
    )
    void GroqSpeechToText.start({
      language: whisperLanguage(lang),
      callbacks: {
        onTranscript: sendSttTranscript,
        onStatus: (status) => {
          if (status === 'listening') {
            setIsListening(true)
            setSttNotice(lang === 'hi' ? 'सुन रहा हूँ… बोलना समाप्त होने पर माइक फिर दबाएं।' : 'Listening… tap the mic again when you finish speaking.')
          } else if (status === 'transcribing') {
            setIsListening(false)
            setSttNotice(lang === 'hi' ? 'लिख रहा हूँ…' : 'Transcribing…')
          } else if (status === 'no-speech') {
            setIsListening(false)
            setSttNotice(lang === 'hi' ? 'मुझे कुछ सुनाई नहीं दिया। फिर कोशिश करें या लिखें।' : "I couldn't hear anything. Please try again or type your question.")
          } else if (status === 'mic-denied') {
            setIsListening(false)
            setSttNotice(microphoneAccessMessage(lang))
          } else if (status === 'unsupported') {
            setIsListening(false)
            setSttNotice(lang === 'hi' ? 'इस डिवाइस पर आवाज़ टाइपिंग उपलब्ध नहीं है। कृपया लिखें।' : 'Voice typing is not supported on this device. Please type your question.')
          } else if (status === 'network' || status === 'error') {
            setIsListening(false)
          }
        },
        onError: (message) => {
          setIsListening(false)
          setSttNotice(lang === 'hi' ? 'आवाज़ टाइपिंग विफल रही। कृपया अपना सवाल लिखें।' : message)
        },
      },
    })
  }, [lang, sendSttTranscript])
  startGroqFallbackRef.current = startGroqFallback

  // Prefer local Web Speech recognition; only use the recorder/Whisper path
  // when the browser does not provide recognition or it fails.
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Web Speech can be present in iOS WKWebView but reject every request with
    // service-not-allowed. Native apps use MediaRecorder + secure transcription
    // directly, which invokes the real iOS microphone permission prompt.
    const SpeechRecognition = Capacitor.isNativePlatform()
      ? null
      : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      recognitionRef.current = null
      return () => {
        GroqSpeechToText.cancel()
        VoiceService.stop()
      }
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = getSpeechRecognitionLanguage(lang)
    recognition.onresult = (event: any) => {
      let transcript = ''
      try {
        transcript = Array.from(event.results).map((result: any) => result?.[0]?.transcript || '').join(' ').trim()
      } catch {}
      if (transcript) {
        sttTranscriptRef.current = transcript
        sendSttTranscript(transcript)
      }
      try {
        recognition.stop()
      } catch {}
    }
    recognition.onerror = (event: any) => {
      setIsListening(false)
      const error = event?.error || 'unknown'
      const captured = sttTranscriptRef.current.trim()
      if (captured) {
        sendSttTranscript(captured)
        return
      }
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setSttNotice(microphoneAccessMessage(lang))
      } else if (error === 'no-speech') {
        setSttNotice(lang === 'hi' ? 'मुझे कुछ सुनाई नहीं दिया। फिर कोशिश करें या लिखें।' : "I couldn't hear anything. Please try again or type your question.")
      } else if (!fallbackRequestedRef.current) {
        startGroqFallbackRef.current?.()
      } else {
        setSttNotice(lang === 'hi' ? 'आवाज़ टाइपिंग विफल रही। कृपया अपना सवाल लिखें।' : 'Voice typing failed. Please type your question.')
      }
    }
    recognition.onend = () => {
      setIsListening(false)
      if (!sttTranscriptRef.current.trim() && !fallbackRequestedRef.current && !GroqSpeechToText.isBusy()) {
        setSttNotice((notice) => notice || (lang === 'hi' ? 'मुझे कुछ सुनाई नहीं दिया। फिर कोशिश करें या लिखें।' : "I couldn't hear anything. Please try again or type your question."))
      }
    }
    recognitionRef.current = recognition

    return () => {
      try {
        recognition.abort()
      } catch {}
      recognitionRef.current = null
      GroqSpeechToText.cancel()
      VoiceService.stop()
    }
  }, [lang, sendSttTranscript])

  const toggleListening = () => {
    playTap()
    const now = Date.now()
    if (now - lastTapRef.current < 300) return
    lastTapRef.current = now

    const stopping = isListening || GroqSpeechToText.isBusy()
    if (stopping) {
      if (now - sessionStartRef.current < 400) return
      if (GroqSpeechToText.isActive()) {
        setSttNotice(lang === 'hi' ? 'लिख रहा हूँ…' : 'Transcribing…')
        void GroqSpeechToText.stop()
      } else {
        try {
          recognitionRef.current?.stop()
        } catch {}
        setIsListening(false)
        setSttNotice(null)
      }
      return
    }

    sessionStartRef.current = now
    fallbackRequestedRef.current = false
    sttTranscriptRef.current = ''
    setSttNotice(lang === 'hi' ? 'सुन रहा हूँ… बोलिए।' : 'Listening… go ahead.')
    VoiceService.stop()
    if (recognitionRef.current) {
      try {
        setIsListening(true)
        recognitionRef.current.start()
      } catch {
        startGroqFallbackRef.current?.()
      }
    } else {
      startGroqFallbackRef.current?.()
    }
  }

  // Initialize initial greeting when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const patientName = profile?.patient.name || ''
      const greeting =
        lang === 'hi'
          ? `नमस्ते ${patientName ? `${patientName} जी` : ''}! मैं साथी हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?`
          : lang === 'as'
          ? `নমস্কাৰ ${patientName ? `${patientName} ডাঙৰীয়া` : ''}! মই আপোনাৰ সংগী সাৰ্থী। আজি মই আপোনাক কেনেকৈ সহায় কৰিব পাৰোঁ?`
          : `Hello ${patientName ? patientName : 'there'}! I am Sathi, your caring companion. How can I help you today?`

      setMessages([
        {
          id: 'init-1',
          role: 'assistant',
          text: greeting,
          timestamp: Date.now(),
        },
      ])

      if (autoSpeak) {
        void VoiceService.speak(greeting, { language: lang })
      }
    }
  }, [isOpen, lang, profile?.patient.name])

  // Close the chat when the user navigates to another screen.
  // The chat is a full-screen overlay; leaving it open would cover the
  // destination screen (a glitch seen on phones and tablets alike).
  const lastRouteRef = useRef(window.location.hash)
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash !== lastRouteRef.current) {
        lastRouteRef.current = window.location.hash
        openerRef.current = null
        setIsOpen(false)
      }
    }
    const onOpenChatbot = () => {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setIsOpen(true)
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('open-chatbot', onOpenChatbot)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('open-chatbot', onOpenChatbot)
    }
  }, [])

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    return () => {
      VoiceService.stop()
    }
  }, [])

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || input).trim()
    if (!textToSend || isLoading || sendingRef.current) return

    sendingRef.current = true
    busyRef.current = true
    playTap()
    setInput('')
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const context = PatientContextBuilder.build({
      profile,
      meds,
      dailyReminders,
      appointments,
      sessions,
      medlog,
    })

    const historyForAI = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.text,
    }))

    try {
      const reply = await AIService.chat(historyForAI, context)
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: reply,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMsg])

      if (autoSpeak) {
        void VoiceService.speak(reply, { language: lang })
      }
    } finally {
      sendingRef.current = false
      busyRef.current = false
      setIsLoading(false)
      const pending = pendingSttRef.current
      pendingSttRef.current = ''
      if (pending) void handleSendMessageRef.current?.(pending)
    }
  }

  handleSendMessageRef.current = handleSendMessage

  const quickPrompts = [
    lang === 'hi'
      ? 'मेरी दवाएं और लॉग क्या हैं?'
      : lang === 'as'
      ? 'মোৰ ঔষধৰ তথ্য আৰু অভিলেখ কি?'
      : lang === 'bn'
      ? 'আমার ওষুধের তথ্য এবং রেকর্ড কি?'
      : 'Did I take my medicine today?',
    lang === 'hi'
      ? 'मेरी खेल सिफ़ारिशें और इतिहास क्या है?'
      : lang === 'as'
      ? 'মোৰ খেলৰ পৰামৰ্শ আৰু ইতিহাস কি?'
      : lang === 'bn'
      ? 'আমার খেলার সুপারিশ এবং ইতিহাস কি?'
      : 'What is my recommendation history?',
    lang === 'hi'
      ? 'आज की मेरी दिनचर्या क्या है?'
      : lang === 'as'
      ? 'আজি মোৰ দৈনিক সময়সূচী কি?'
      : lang === 'bn'
      ? 'আজকে আমার দৈনন্দিন রুটিন কি?'
      : 'What is on my schedule today?',
    lang === 'hi'
      ? 'मेरे डॉक्टर अपॉइंटमेंट कब हैं?'
      : lang === 'as'
      ? 'মোৰ ডাক্তৰৰ সাক্ষাৎ কেতিয়া?'
      : lang === 'bn'
      ? 'আমার ডাক্তারের অ্যাপয়েন্টমেন্ট কবে?'
      : 'What are my upcoming appointments?',
  ]

  // Keep an open conversation mounted across a transient health change. The
  // heartbeat may briefly mark the backend offline while the phone keyboard
  // is opening; unmounting here would erase focus/input and make the sheet
  // appear to close and reopen. The trigger remains hidden while offline.
  if (!aiAvailable && !isOpen) return null

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && aiAvailable && (
        <button
          type="button"
          ref={triggerRef}
          data-testid="ai-chat-btn"
          aria-label={lang === 'hi' ? 'साथी AI सहायक खोलें' : 'Open Sathi AI Assistant'}
          onClick={() => {
            playTap()
            openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            setIsOpen(true)
          }}
          style={{
            position: 'fixed',
            bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)',
            right: 'max(16px, var(--safe-right))',
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #162436 0%, #253950 100%)',
            color: '#fff',
            border: '2px solid #D4A017',
            boxShadow: '0 6px 20px rgba(22, 36, 54, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 90,
            transition: 'transform 0.15s ease',
          }}
        >
          <span style={{ fontSize: 24 }}>✨</span>
        </button>
      )}

      {/* Dementia-Friendly Fullscreen/Drawer Chat Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sathi-chat-title"
          data-testid="ai-chat-overlay"
          ref={dialogRef}
          style={{
            position: 'fixed',
            top: visualViewportFrame ? `${visualViewportFrame.offsetTop}px` : 0,
            left: 0,
            right: 0,
            bottom: visualViewportFrame ? 'auto' : 0,
            height: visualViewportFrame ? `${visualViewportFrame.height}px` : '100dvh',
            zIndex: 9999,
            background: 'rgba(22, 36, 54, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 'max(8px, env(safe-area-inset-top, 0px)) max(8px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(8px, env(safe-area-inset-left, 0px))',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="card"
            data-testid="ai-chat-panel"
            style={{
              width: '100%',
              maxWidth: 'var(--max-w)',
              height: 'min(90%, 720px)',
              maxHeight: 'calc(100% - max(16px, env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px)))',
              borderRadius: '28px 28px 0 0',
              background: 'var(--canvas)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              padding: 0,
              minHeight: 0,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #162436 0%, #213247 100%)',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1.5px solid #D4A017',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  ✨
                </div>
                <div>
                  <h2 id="sathi-chat-title" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>
                    {lang === 'hi' ? 'साथी AI साथी' : 'Sathi AI Companion'}
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--muga-gold-light)' }}>
                    {lang === 'hi' ? 'सहानुभूतिपूर्ण संज्ञानात्मक साथी' : 'Gentle memory & care support'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  title={autoSpeak ? (lang === 'hi' ? 'वॉयस आउटपुट चालू' : 'Voice output ON') : (lang === 'hi' ? 'वॉयस आउटपुट बंद' : 'Voice output OFF')}
                  style={{
                    width: 48,
                    height: 48,
                    minWidth: 48,
                    minHeight: 48,
                    flex: '0 0 48px',
                    borderRadius: '50%',
                    background: autoSpeak ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="volume" size={18} color="var(--ink-on-dark)" />
                </button>

                <button
                  type="button"
                  data-testid="close-chat-btn"
                  ref={closeButtonRef}
                  onClick={() => {
                    playTap()
                    closeChat()
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    minWidth: 48,
                    minHeight: 48,
                    flex: '0 0 48px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="close" size={20} color="var(--ink-on-dark)" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: '16px 16px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '84%',
                        padding: '12px 16px',
                        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isUser ? 'var(--primary)' : 'var(--card)',
                        color: isUser ? 'var(--ink-on-primary)' : 'var(--ink)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        border: isUser ? 'none' : '1.5px solid var(--border)',
                        fontSize: 15,
                        lineHeight: 1.45,
                        fontWeight: isUser ? 500 : 500,
                      }}
                    >
                      {msg.text}
                    </div>

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => void VoiceService.speak(msg.text, { language: lang })}
                        style={{
                          marginTop: 4,
                          marginLeft: 4,
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon name="volume" size={14} color="var(--ink-muted)" />
                        <span>{lang === 'hi' ? 'सुनें' : 'Listen'}</span>
                      </button>
                    )}
                  </div>
                )
              })}

              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, color: 'var(--ink-muted)', fontSize: 14 }}>
                  <span>✨</span>
                  <span>{lang === 'hi' ? 'साथी विचार कर रहा है...' : 'Sathi is thinking gently...'}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void handleSendMessage(prompt)}
                  style={{
                    flexShrink: 0,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  💬 {prompt}
                </button>
              ))}
            </div>

            {sttNotice && (
              <div role="status" aria-live="polite" style={{ padding: '8px 20px 0', background: 'var(--card)' }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                  {sttNotice}
                </span>
              </div>
            )}

            {/* Bottom Input Controls */}
            <div
              style={{
                padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
                background: 'var(--card)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                data-testid="chat-mic-btn"
                aria-label={
                  isListening
                    ? (lang === 'hi' ? 'सुनना बंद करें' : 'Stop listening')
                    : (lang === 'hi' ? 'बोलकर सवाल पूछें' : 'Speak a question')
                }
                title={lang === 'hi' ? 'साथी से बात करें' : 'Speak to Sathi'}
                onClick={toggleListening}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: isListening ? '#FF5F56' : 'var(--surface-muted)',
                  color: isListening ? 'var(--ink-on-primary)' : 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isListening ? '2px solid #D32F2F' : 'none',
                }}
              >
                <WaveformMic
                  isActive={isListening}
                  lang={lang}
                  iconProps={{ size: 22, color: isListening ? 'var(--ink-on-primary)' : 'var(--ink)' }}
                />
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSendMessage()
                }}
                placeholder={
                  lang === 'hi'
                    ? 'यहाँ सवाल लिखें या बोलें...'
                    : lang === 'as'
                    ? 'ইয়াত প্ৰশ্ন লিখক বা কওক...'
                    : lang === 'bn'
                    ? 'এখানে প্রশ্ন লিখুন বা বলুন...'
                    : 'Type or speak a question...'
                }
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  border: '1.5px solid var(--border)',
                  padding: '0 16px',
                  fontSize: 16,
                  background: 'var(--canvas)',
                  color: 'var(--ink)',
                  WebkitTextFillColor: 'var(--ink)',
                  outline: 'none',
                }}
              />

              {/* Send Button */}
              <button
                type="button"
                data-testid="send-chat-btn"
                onClick={() => void handleSendMessage()}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: input.trim() ? 'var(--primary)' : 'var(--border)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: input.trim() ? 'pointer' : 'default',
                  border: 'none',
                }}
              >
                <Icon name="arrowRight" size={22} color="var(--ink-on-dark)" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
