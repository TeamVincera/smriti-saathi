import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../state'
import { AIService, PatientContextBuilder } from '../lib/ai'
import { VoiceService, GroqSpeechToText, whisperLanguage, sanitizeTranscript } from '../lib/voice'
import { Icon } from './Icons'
import { playTap } from '../lib/audio'
import { WaveformMic } from './WaveformMic'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

export function AIChatbot() {
  const { profile, meds, dailyReminders, appointments, sessions, lang } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const [isListening, setIsListening] = useState(false)
  const [sttNotice, setSttNotice] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const startGroqFallbackRef = useRef<(() => void) | null>(null)
  const fallbackRequestedRef = useRef(false)
  const lastTapRef = useRef(0)
  const sessionStartRef = useRef(0)
  const sttTranscriptRef = useRef('')
  const sttSentRef = useRef(false)
  const busyRef = useRef(false)
  const pendingSttRef = useRef('')
  const transcriptSentThisSession = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void transcriptSentThisSession

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
        setIsOpen(false)
      }
    }
    const onOpenChatbot = () => setIsOpen(true)
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

  const sendSttTranscript = useCallback((text: string) => {
    const clean = sanitizeTranscript(text)
    if (!clean) return
    sttSentRef.current = true
    setSttNotice(null)
    setIsListening(false)
    if (busyRef.current) {
      pendingSttRef.current = clean
      setInput(clean)
      return
    }
    if (handleSendMessageRef.current) {
      setInput(clean)
      void handleSendMessageRef.current(clean)
    }
  }, [])

  const startGroqFallback = useCallback(() => {
    fallbackRequestedRef.current = true
    setSttNotice(
      lang === 'hi'
        ? 'ब्राउज़र आवाज़ उपलब्ध नहीं है — वैकल्पिक विधि से सुन रहा हूँ…'
        : 'Browser voice is unavailable — trying an alternative…'
    )
    void GroqSpeechToText.start({
      language: whisperLanguage(lang),
      callbacks: {
        onTranscript: (text) => {
          sttTranscriptRef.current = text
          sendSttTranscript(text)
        },
        onStatus: (status) => {
          if (status === 'listening') {
            setIsListening(true)
            setSttNotice(
              lang === 'hi' ? 'सुन रहा हूँ… बोलना समाप्त होने पर माइक फिर दबाएं।' : 'Listening… tap the mic again when you finish speaking.'
            )
          } else if (status === 'transcribing') {
            setIsListening(false)
            setSttNotice(lang === 'hi' ? 'लिख रहा हूँ…' : 'Transcribing…')
          } else if (status === 'no-speech') {
            setIsListening(false)
            setSttNotice(
              lang === 'hi' ? 'मुझे कुछ सुनाई नहीं दिया। फिर कोशिश करें या लिखें।' : "I couldn't hear anything. Please try again or type your question."
            )
          } else if (status === 'mic-denied') {
            setIsListening(false)
            setSttNotice(
              lang === 'hi' ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें।' : 'Microphone access is blocked. Please allow it in your browser settings.'
            )
          } else if (status === 'unsupported') {
            setIsListening(false)
            setSttNotice(
              lang === 'hi' ? 'इस डिवाइस पर आवाज़ टाइपिंग उपलब्ध नहीं है। कृपया लिखें।' : 'Voice typing is not supported on this device. Please type your question.'
            )
          } else if (status === 'network' || status === 'error') {
            setIsListening(false)
          }
        },
        onError: (message) => {
          setIsListening(false)
          setSttNotice(
            lang === 'hi' ? 'आवाज़ टाइपिंग विफल रही। कृपया अपना सवाल लिखें।' : message
          )
        },
      },
    })
  }, [lang, sendSttTranscript])
  startGroqFallbackRef.current = startGroqFallback

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'as' || lang === 'bn' ? 'bn-IN' : 'en-IN'

        recognition.onresult = (event: any) => {
          let transcript = ''
          try {
            transcript = Array.from(event.results)
              .map((r: any) => r?.[0]?.transcript || '')
              .join(' ')
              .trim()
          } catch {}
          const cleanTranscript = sanitizeTranscript(transcript)
          if (cleanTranscript) {
            sttTranscriptRef.current = cleanTranscript
            setInput(cleanTranscript)
          }
          setIsListening(false)
          try {
            recognition.stop()
          } catch {}
        }

        recognition.onerror = (event: any) => {
          setIsListening(false)
          const err = event?.error || 'unknown'
          const captured = sttTranscriptRef.current.trim()

          if (captured) {
            sendSttTranscript(captured)
            return
          }

          if (err === 'not-allowed' || err === 'service-not-allowed') {
            setSttNotice(
              lang === 'hi' ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें।' : 'Microphone access is blocked. Please allow it in your browser settings.'
            )
          } else if (err === 'no-speech') {
            setSttNotice(
              lang === 'hi' ? 'मुझे कुछ सुनाई नहीं दिया। फिर कोशिश करें या लिखें।' : "I couldn't hear anything. Please try again or type your question."
            )
          } else {
            if (startGroqFallbackRef.current && !fallbackRequestedRef.current) {
              startGroqFallbackRef.current()
            } else {
              setSttNotice(
                lang === 'hi' ? 'आवाज़ टाइपिंग विफल रही। कृपया अपना सवाल लिखें।' : 'Voice typing failed. Please type your question.'
              )
            }
          }
        }

        recognition.onend = () => {
          setIsListening(false)
          const captured = sttTranscriptRef.current.trim()
          if (captured) {
            sendSttTranscript(captured)
          } else if (!captured && !fallbackRequestedRef.current && !GroqSpeechToText.isActive()) {
            setSttNotice(
              lang === 'hi' ? 'मुझे कुछ सुनाई नहीं दिया। फिर कोशिश करें या लिखें।' : "I couldn't hear anything. Please try again or type your question."
            )
          }
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
      GroqSpeechToText.cancel()
      VoiceService.stop()
    }
  }, [lang, startGroqFallback, sendSttTranscript])

  const toggleListening = () => {
    playTap()
    const now = Date.now()
    const stopping = isListening || GroqSpeechToText.isBusy()

    if (stopping) {
      if (now - sessionStartRef.current < 400) return

      if (GroqSpeechToText.isActive()) {
        setSttNotice(lang === 'hi' ? 'लिख रहा हूँ…' : 'Transcribing…')
        void GroqSpeechToText.stop()
        return
      }

      if (isListening) {
        try {
          recognitionRef.current?.stop()
        } catch {}
        setIsListening(false)
        setSttNotice(null)
      }
      return
    }

    if (now - lastTapRef.current < 300) return
    lastTapRef.current = now
    sessionStartRef.current = now

    VoiceService.stop()

    sttTranscriptRef.current = ''
    sttSentRef.current = false
    fallbackRequestedRef.current = false
    transcriptSentThisSession.current = false

    if (recognitionRef.current) {
      try {
        setIsListening(true)
        setSttNotice(lang === 'hi' ? 'सुन रहा हूँ… बोलिए।' : 'Listening… go ahead.')
        recognitionRef.current.start()
      } catch {
        if (startGroqFallbackRef.current) startGroqFallbackRef.current()
      }
    } else if (startGroqFallbackRef.current) {
      startGroqFallbackRef.current()
    } else {
      setSttNotice(
        lang === 'hi' ? 'इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। कृपया लिखें।' : 'Voice recognition is not supported on this browser. Please type your question.'
      )
    }
  }

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
      if (pending) {
        pendingSttRef.current = ''
        if (handleSendMessageRef.current) void handleSendMessageRef.current(pending)
      }
    }
  }

  const handleSendMessageRef = useRef<((customText?: string) => Promise<void>) | null>(null)
  handleSendMessageRef.current = handleSendMessage

  const quickPrompts = [
    lang === 'hi' ? 'मेरी दवाएं कब हैं?' : 'When are my medicines?',
    lang === 'hi' ? 'आज का खेल कौन सा है?' : "What is today's game?",
    lang === 'hi' ? 'आज का समय कैसा है?' : 'What is on my schedule today?',
  ]

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          data-testid="ai-chat-btn"
          aria-label={lang === 'hi' ? 'साथी AI सहायक खोलें' : 'Open Sathi AI Assistant'}
          onClick={() => {
            playTap()
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
          aria-label="Sathi AI Companion"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(22, 36, 54, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 'var(--max-w)',
              height: '90dvh',
              maxHeight: 720,
              borderRadius: '28px 28px 0 0',
              background: 'var(--canvas)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              padding: 0,
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
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>
                    {lang === 'hi' ? 'साथी AI साथी' : 'Sathi AI Companion'}
                  </h3>
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
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: autoSpeak ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="volume" size={18} color="var(--ink-on-dark)" />
                </button>

                <button
                  type="button"
                  data-testid="close-chat-btn"
                  onClick={() => {
                    playTap()
                    VoiceService.stop()
                    setIsOpen(false)
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                overflowY: 'auto',
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
            {/* Voice typing status / notice */}
            {sttNotice && (
              <div style={{ padding: '8px 20px 0', background: 'var(--card)' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    lineHeight: 1.4,
                  }}
                >
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
              }}
            >
              {/* Mic Speech Button */}
              <button
                type="button"
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
                title={lang === 'hi' ? 'साथी से बात करें' : 'Speak to Sathi'}
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSendMessage()
                }}
                placeholder={lang === 'hi' ? 'यहाँ सवाल लिखें या बोलें...' : 'Type or speak a question...'}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  border: '1.5px solid var(--border)',
                  padding: '0 16px',
                  fontSize: 16,
                  background: 'var(--canvas)',
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
