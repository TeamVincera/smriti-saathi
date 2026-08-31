import { useState, useRef, useEffect } from 'react'
import { useApp } from '../state'
import { AIService, PatientContextBuilder } from '../lib/ai'
import { VoiceService } from '../lib/voice'
import { Icon } from './Icons'
import { playTap } from '../lib/audio'

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
  const [isListening, setIsListening] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

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

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Setup Web Speech Recognition if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'as' || lang === 'bn' ? 'bn-IN' : 'en-IN'

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          if (transcript) {
            setInput(transcript)
            void handleSendMessage(transcript)
          }
          setIsListening(false)
        }

        recognition.onerror = () => {
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
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
    }
  }, [lang])

  const toggleListening = () => {
    playTap()
    if (!recognitionRef.current) {
      alert(lang === 'hi' ? 'आपके ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है।' : 'Voice recognition is not supported on this browser.')
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch {}
      setIsListening(false)
    } else {
      try {
        setIsListening(true)
        recognitionRef.current.start()
      } catch {
        setIsListening(false)
      }
    }
  }

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || input).trim()
    if (!textToSend || isLoading) return

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

    // Build context
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
    } catch {
      const fallbackReply =
        lang === 'hi'
          ? 'मैं आपके साथ हूँ। आज का खेल खेलने के लिए तैयार हैं?'
          : 'I am right here with you! Would you like to play today\'s exercise or check your schedule?'

      const fallbackMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: fallbackReply,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, fallbackMsg])
    } finally {
      setIsLoading(false)
    }
  }

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
          aria-label="Open Sathi AI Assistant"
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
                    Sathi AI Companion
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
                  title={autoSpeak ? 'Voice output ON' : 'Voice output OFF'}
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
                  <Icon name="volume" size={18} color="#fff" />
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
                  <Icon name="close" size={20} color="#fff" />
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
                        background: isUser ? '#162436' : '#FFFFFF',
                        color: isUser ? '#FFFFFF' : '#162436',
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
                          color: '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon name="volume" size={14} color="#6B7280" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                )
              })}

              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, color: '#6B7280', fontSize: 14 }}>
                  <span>✨</span>
                  <span>Sathi is thinking gently...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void handleSendMessage(prompt)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#162436',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  💬 {prompt}
                </button>
              ))}
            </div>

            {/* Bottom Input Controls */}
            <div
              style={{
                padding: '12px 16px max(16px, var(--safe-bottom))',
                background: '#FFFFFF',
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
                  background: isListening ? '#FF5F56' : '#ECECF0',
                  color: isListening ? '#fff' : '#162436',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isListening ? '2px solid #D32F2F' : 'none',
                }}
                title="Speak to Sathi"
              >
                <Icon name="mic" size={22} color={isListening ? '#fff' : '#162436'} />
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
                  fontSize: 15,
                  background: '#FBF8F2',
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
                  background: input.trim() ? '#162436' : '#D1D5DB',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: input.trim() ? 'pointer' : 'default',
                  border: 'none',
                }}
              >
                <Icon name="arrowRight" size={22} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
