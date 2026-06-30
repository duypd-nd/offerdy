'use client'

import { useState, useRef, useEffect } from 'react'

type FaqItem = { question: string; answer: string }

function FaqItem({ question, answer, open, onToggle }: {
  question: string; answer: string; open: boolean; onToggle: () => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) setHeight(bodyRef.current.scrollHeight)
  }, [answer])

  return (
    <div className={`faq-item${open ? ' faq-open' : ''}`}>
      <button className="faq-btn" onClick={onToggle} aria-expanded={open}>
        <span className="faq-q">{question}</span>
        <span className="faq-chevron" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div
        className="faq-body"
        ref={bodyRef}
        style={{ maxHeight: open ? height : 0 }}
      >
        <div className="faq-body-inner">
          <p className="faq-ans">{answer}</p>
        </div>
      </div>
    </div>
  )
}

export default function FaqAccordion({ faqs, storeName }: { faqs: FaqItem[]; storeName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const fill = (s: string) => s.replace(/\{store\}/g, storeName)

  return (
    <div className="faq-list">
      {faqs.map((f, i) => (
        <FaqItem
          key={i}
          question={fill(f.question)}
          answer={fill(f.answer)}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  )
}
