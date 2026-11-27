import { useEffect, useRef, useState } from 'react'

// Each browser tab gets its own conversation. Before, every client shared the
// constant 'edu-meet-assistant', so users saw each other's history.
const SESSION_KEY = 'edu-meet-session-id'

function newSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function sessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const created = newSessionId()
    sessionStorage.setItem(SESSION_KEY, created)
    return created
  } catch {
    // storage blocked (private mode): at least stay unique per page load
    return newSessionId()
  }
}

const SESSION_ID = sessionId()

function ReneBotLogo() {
  return (
    <svg width="73" height="78" viewBox="0 0 73 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40.3309 43.5051C39.9063 43.078 39.6939 42.5492 39.6939 41.9187C39.6939 41.2882 39.9063 40.7594 40.3309 40.3323C40.7556 39.9052 41.2814 39.6917 41.9083 39.6917C42.5352 39.6917 43.061 39.9052 43.4856 40.3323C43.9103 40.7594 44.1226 41.2882 44.1226 41.9187C44.1226 42.5492 43.9103 43.078 43.4856 43.5051C43.061 43.9322 42.5352 44.1458 41.9083 44.1458C41.2814 44.1458 40.7556 43.9322 40.3309 43.5051ZM60.0477 43.5051C59.6231 43.078 59.4107 42.5492 59.4107 41.9187C59.4107 41.2882 59.6231 40.7594 60.0477 40.3323C60.4724 39.9052 60.9982 39.6917 61.6251 39.6917C62.252 39.6917 62.7778 39.9052 63.2024 40.3323C63.6271 40.7594 63.8394 41.2882 63.8394 41.9187C63.8394 42.5492 63.6271 43.078 63.2024 43.5051C62.7778 43.9322 62.252 44.1458 61.6251 44.1458C60.9982 44.1458 60.4724 43.9322 60.0477 43.5051ZM51.7667 77.9999C45.8476 77.9999 40.8294 75.8807 36.7121 71.6422C32.5949 67.4037 30.5352 62.2876 30.5332 56.2939V41.9187C30.5332 36.4599 32.6485 31.956 36.879 28.4069C41.1095 24.8579 46.0721 23.0844 51.7667 23.0864C57.1863 23.0864 62.0801 24.8111 66.4481 28.2605C70.8161 31.7099 73.0002 36.2626 73.0002 41.9187V72.6032C73.0002 73.2337 72.7676 73.7828 72.3025 74.2506C71.8374 74.7184 71.2914 74.9512 70.6645 74.9492H69.9668C66.8162 74.9492 64.1225 73.8245 61.886 71.5751C59.6494 69.3256 58.5321 66.6176 58.5341 63.4509V61.9469C58.5341 61.4384 58.3733 61.0581 58.0518 60.8059C57.7323 60.5497 57.3875 60.4215 57.0174 60.4215C56.6473 60.4215 56.3015 60.5497 55.98 60.8059C55.6585 61.0622 55.4987 61.4425 55.5007 61.9469V63.4509C55.5007 66.1254 56.158 68.564 57.4724 70.7666C58.7869 72.9672 60.523 74.696 62.6807 75.9529C63.2065 76.2783 63.4036 76.7003 63.2722 77.219C63.1407 77.7376 62.8344 77.9979 62.3531 77.9999H51.7667ZM51.7667 57.6423C56.6079 57.6423 60.8516 56.1728 64.4977 53.234C68.1438 50.2951 69.9668 46.5233 69.9668 41.9187C69.9668 39.9825 69.6149 38.1612 68.9112 36.4548C68.2075 34.7464 67.2216 33.2434 65.9537 31.9458C62.4451 32.1655 59.4562 33.4834 56.9871 35.8996C54.5179 38.3178 53.2834 41.2831 53.2834 44.7956C53.2834 45.2288 53.1388 45.5908 52.8496 45.8816C52.5604 46.1745 52.1994 46.3209 51.7667 46.3209C51.3339 46.3209 50.973 46.1745 50.6838 45.8816C50.3946 45.5888 50.25 45.2267 50.25 44.7956C50.25 41.2831 49.0063 38.3137 46.519 35.8874C44.0276 33.463 41.0276 32.1756 37.519 32.0251C36.2895 33.3227 35.3229 34.8125 34.6191 36.4945C33.9154 38.1765 33.5645 39.9845 33.5666 41.9187C33.5666 46.5233 35.3896 50.2951 39.0357 53.234C42.6818 56.1728 46.9254 57.6423 51.7667 57.6423Z" fill="url(#renebot-paint0)" />
      <path d="M41.5228 18.1229C41.6098 17.9897 41.7231 17.8759 41.8557 17.7888C41.9883 17.7016 42.1374 17.643 42.2936 17.6164C42.4498 17.5899 42.6097 17.596 42.7635 17.6345C42.9172 17.673 43.0613 17.743 43.1869 17.8401L46.4228 20.3395C46.6498 20.5151 46.8036 20.7694 46.8542 21.0529C46.9047 21.3364 46.8484 21.6287 46.6962 21.8727L40.8085 24.1243C40.2854 24.3216 38.4328 25.36 36.7779 26.6015C35.2449 27.7515 33.8994 29.097 33.5032 29.5926L29.2575 34.6555C28.98 34.7266 28.6861 34.691 28.4332 34.5558C28.1803 34.4206 27.9866 34.1955 27.89 33.9243L26.5148 30.061C26.4614 29.911 26.4393 29.7516 26.4499 29.5926C26.4606 29.4336 26.5037 29.2786 26.5767 29.1372C26.6496 28.9957 26.7508 28.871 26.8739 28.7707C26.997 28.6704 27.1393 28.5967 27.292 28.5543L36.3522 26.0222L41.5228 18.1229Z" fill="url(#renebot-paint1)" />
      <path d="M25.2048 11.2861C25.286 11.1384 25.3984 11.0103 25.534 10.9109C25.6697 10.8115 25.8253 10.7431 25.99 10.7105L44.692 7.03082C44.9122 6.9875 45.1403 7.00987 45.348 7.09517C45.5558 7.18046 45.7342 7.32498 45.8614 7.51093C45.9886 7.69688 46.059 7.91616 46.0639 8.1418C46.0688 8.36745 46.0081 8.58962 45.8891 8.78099L36.0021 24.6247C35.8449 24.8771 35.597 25.0588 35.3099 25.1321L20.1683 29.6304L20.1683 44.1376C20.7789 44.1399 21.3636 44.3861 21.7938 44.822C22.224 45.2579 22.4644 45.8479 22.4621 46.462L22.4448 51.0934L15.5373 51.0673L15.5547 46.4359C15.5569 45.8218 15.8017 45.2337 16.2352 44.801C16.6686 44.3684 17.2551 44.1266 17.8658 44.1289L17.92 29.6304L17.8235 29.6539C17.6034 29.6982 16.8395 29.793 16.6275 29.7192C16.4154 29.6454 16.2294 29.5109 16.0923 29.3322C15.9552 29.1535 15.8731 28.9384 15.8559 28.7133C15.8388 28.4883 15.8875 28.2631 15.9959 28.0655L25.2048 11.2861Z" fill="url(#renebot-paint2)" />
      <defs>
        <linearGradient id="renebot-paint0" x1="51.7667" y1="23.0864" x2="51.7667" y2="77.9999" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9C83F6" />
          <stop offset="1" stopColor="#3E7AF7" />
        </linearGradient>
        <linearGradient id="renebot-paint1" x1="34.3639" y1="23.2785" x2="38.0039" y2="28.2443" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9C83F6" />
          <stop offset="1" stopColor="#3E7AF7" />
        </linearGradient>
        <linearGradient id="renebot-paint2" x1="20.2097" y1="14.8137" x2="38.2896" y2="39.4789" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9C83F6" />
          <stop offset="1" stopColor="#3E7AF7" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function Sparkle({ cx, cy, r, w, strokeWidth }) {
  const d = `M${cx} ${cy - r} Q${cx + w} ${cy - w} ${cx + r} ${cy} Q${cx + w} ${cy + w} ${cx} ${cy + r} Q${cx - w} ${cy + w} ${cx - r} ${cy} Q${cx - w} ${cy - w} ${cx} ${cy - r}Z`
  return <path d={d} fill="none" stroke="#0B0B0B" strokeWidth={strokeWidth} strokeLinejoin="round" />
}

function AiCallerIcon() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <Sparkle cx={27} cy={28.5} r={13.5} w={2.9} strokeWidth={1.8} />
      <Sparkle cx={43.5} cy={42} r={7} w={1.5} strokeWidth={1.3} />
    </svg>
  )
}

function parseReviewer(text) {
  let cleaned = text.trim()
  // Some replies arrive wrapped in a markdown code fence.
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '').trim()
  }

  // A short note may precede the array ("I only read the first 40 pages.").
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end <= start) return null

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed[0]?.answer === undefined) return null
    return {
      note: cleaned.slice(0, start).trim(),
      items: parsed.map((item) => ({
        answer: String(item.answer ?? ''),
        question: String(item.question ?? ''),
      })),
    }
  } catch {
    return null
  }
}

function reviewerFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `reviewer-${stamp}.json`
}

function downloadReviewer(items) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = reviewerFileName()
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const downloadBtnStyle = {
  alignSelf: 'flex-start',
  marginTop: 4,
  padding: '5px 12px',
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  lineHeight: '16px',
  color: '#DCCBFF',
  background: 'rgba(124, 58, 237, 0.25)',
  border: '1px solid rgba(196, 181, 253, 0.5)',
  borderRadius: 999,
  cursor: 'pointer',
}

function MessageContent({ text }) {
  const reviewer = parseReviewer(text)
  if (reviewer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviewer.note && (
          <span style={{ fontStyle: 'italic', opacity: 0.85 }}>{reviewer.note}</span>
        )}
        {reviewer.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600 }}>{item.answer}</span>
            <span>{item.question}</span>
          </div>
        ))}
        <button style={downloadBtnStyle} onClick={() => downloadReviewer(reviewer.items)}>
          ⤓ Download .json
        </button>
      </div>
    )
  }
  return text
}

function ChatbotLauncher() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function ask(init, label) {
    if (sending) return
    setSending(true)
    setMessages((prev) => [...prev, { role: 'user', text: label }])
    try {
      const res = await fetch('/api/chat', init)
      const data = await res.json().catch(() => ({}))
      const reply = typeof data.reply === 'string' && data.reply.trim()
        ? data.reply
        : typeof data.error === 'string' && data.error.trim()
          ? data.error
          : 'Sorry, I could not answer that.'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
          // Source chips are hidden for now; the backend still returns titles.
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, I could not answer that.' }])
    } finally {
      setSending(false)
    }
  }

  function sendText() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    ask(
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: SESSION_ID, message: text }),
      },
      text,
    )
  }

  function sendWithFile(file) {
    if (!file || sending) return
    const label = input.trim() || 'Can you create a reviewer for this PDF?'
    setInput('')
    const form = new FormData()
    form.append('sessionId', SESSION_ID)
    form.append('message', label)
    form.append('file', file)
    ask({ method: 'POST', body: form }, label)
  }

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }

  const headerStyle = {
    width: '100%',
    maxWidth: 1440,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 15,
    paddingTop: 14,
    flexShrink: 0,
  }

  const nameStyle = {
    width: 167,
    height: 55,
    fontFamily: 'Poppins, sans-serif',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: 36,
    lineHeight: '55px',
    color: '#D9E2EF',
  }

  const closeBtnStyle = {
    position: 'absolute',
    top: 14,
    right: 40,
    width: 44,
    height: 55,
    fontFamily: 'Poppins, sans-serif',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: 42,
    lineHeight: '55px',
    textAlign: 'center',
    color: '#D9E2EF',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  }

  const bodyStyle = {
    flex: 1,
    width: '100%',
    maxWidth: 1440,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: messages.length === 0 ? 'center' : 'flex-start',
    padding: messages.length === 0 ? '0 82px' : '24px 82px',
    overflowY: 'auto',
    overflowX: 'hidden',
  }

  const emptyStyle = {
    width: '100%',
    maxWidth: 518,
    marginLeft: 17,
    fontFamily: "'Intel One Mono', monospace",
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 30,
    lineHeight: '41px',
    color: '#FFFFFF',
  }

  const listStyle = {
    width: '100%',
    maxWidth: 1261,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingLeft: 17,
    paddingRight: 17,
  }

  const composerWrapStyle = {
    width: 'calc(100% - 60px)',
    maxWidth: 1261,
    minHeight: 63,
    boxSizing: 'border-box',
    marginBottom: 41,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px 0 37px',
    flexShrink: 0,
  }

  const plusStyle = {
    width: 20,
    height: 33,
    fontFamily: 'Inter, sans-serif',
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 24,
    lineHeight: '29px',
    color: '#FFFDF8',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  }

  const composerInputStyle = {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 24,
    lineHeight: '29px',
    color: '#FFFDF8',
    padding: 0,
  }

  const sendBtnStyle = {
    width: 45,
    height: 45,
    borderRadius: '50%',
    background: sending ? 'rgba(124, 58, 237, 0.5)' : '#7C3AED',
    border: 'none',
    color: '#FFFFFF',
    fontSize: 16,
    cursor: sending ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  const fabWrapStyle = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 50,
    width: 82,
    height: 66,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  }

  const fabCircleStyle = {
    position: 'absolute',
    left: 0,
    top: 6,
    width: 60,
    height: 60,
    borderRadius: '50%',
    backgroundColor: '#E9EEF6',
    border: '1.5px solid #000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const fabMediumDotStyle = {
    position: 'absolute',
    left: 62,
    top: 50,
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#E9EEF6',
    border: '1.5px solid #000',
  }

  const fabSmallDotStyle = {
    position: 'absolute',
    left: 75,
    top: 59,
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: '#E9EEF6',
    border: '1px solid #000',
  }

  const fabLabelStyle = {
    position: 'absolute',
    left: 2,
    top: -20,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    whiteSpace: 'nowrap',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    lineHeight: '16px',
    color: '#7C5CFC',
  }

  return (
    <>
      <style>{`.edu-composer::placeholder { color: rgba(255, 253, 248, 0.85); }
        @keyframes edu-spin { to { transform: rotate(360deg); } }
        .edu-spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: edu-spin 0.8s linear infinite;
        }`}</style>
      {open && (
        <div style={overlayStyle}>
          <div style={headerStyle}>
            <ReneBotLogo />
            <span style={nameStyle}>ReneBOT</span>
          </div>
          <button style={closeBtnStyle} onClick={() => setOpen(false)} aria-label="Close">
            ✕
          </button>
          <div style={bodyStyle} ref={bodyRef}>
            {messages.length === 0 ? (
              <div style={emptyStyle}>what do you want to ask?</div>
            ) : (
              <div style={listStyle}>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: m.role === 'user' ? '#7c3aed' : '#1f2937',
                      color: '#e5e7eb',
                      borderRadius: 16,
                      padding: '10px 14px',
                      maxWidth: '85%',
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {m.text ? <MessageContent text={m.text} /> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={composerWrapStyle}>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              aria-label="Attach a PDF"
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) sendWithFile(f)
                e.target.value = ''
              }}
            />
            <button style={plusStyle} onClick={() => fileInputRef.current?.click()} aria-label="Attach PDF">
              +
            </button>
            <input
              className="edu-composer"
              style={composerInputStyle}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendText()
              }}
              placeholder="Ask Edu"
              aria-label="Ask Edu"
            />
            <button style={sendBtnStyle} onClick={sendText} aria-label="Send" disabled={sending}>
              {sending ? <span className="edu-spin" /> : '➤'}
            </button>
          </div>
        </div>
      )}
      <button style={fabWrapStyle} onClick={() => setOpen(true)} aria-label="Open Edu-Meet Assistant">
        <span style={fabLabelStyle}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <Sparkle cx={6} cy={6} r={5.5} w={1.2} strokeWidth={1.2} />
          </svg>
          AI Caller
        </span>
        <span style={fabCircleStyle}>
          <AiCallerIcon />
        </span>
        <span style={fabMediumDotStyle} />
        <span style={fabSmallDotStyle} />
      </button>
    </>
  )
}

export default ChatbotLauncher
