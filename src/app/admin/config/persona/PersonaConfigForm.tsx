'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { saveConfigDoc } from '../actions'

/** Chuoi nhieu dong <-> mang, moi dong mot muc. Bo dong trong. */
const toLines = (v: unknown) => Array.isArray(v) ? v.join('\n') : ''
const fromLines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)

export default function PersonaConfigForm({ initial }: { initial: Record<string, unknown> }) {
  const [creatorName, setCreatorName] = useState(String(initial.creatorName ?? ''))
  const [bio, setBio] = useState(String(initial.bio ?? ''))
  const [audience, setAudience] = useState(String(initial.audience ?? ''))
  const [pillars, setPillars] = useState(toLines(initial.contentPillars))
  const [toneNotes, setToneNotes] = useState(String(initial.toneNotes ?? ''))
  const [avoidWords, setAvoidWords] = useState(toLines(initial.avoidWords))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveConfigDoc('configPersona', {
        creatorName: creatorName || null,
        bio: bio || null,
        audience: audience || null,
        contentPillars: fromLines(pillars).length ? fromLines(pillars) : null,
        toneNotes: toneNotes || null,
        avoidWords: fromLines(avoidWords).length ? fromLines(avoidWords) : null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <Link href="/admin/config" className="cfg-back">← Cấu hình</Link>
        <h1 className="cfg-title">Giọng kênh</h1>
        <p className="cfg-subtitle">
          Bối cảnh gửi cho AI khi viết caption tại{' '}
          <Link href="/admin/social-kit" style={{ color: '#16A34A', fontWeight: 600 }}>Bộ soạn bài đăng</Link>.
          Không hiển thị công khai ở đâu cả.
        </p>
      </div>

      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#15803D', lineHeight: 1.7 }}>
        Đây là thứ quyết định caption đọc ra giống <strong>bạn viết</strong> hay giống AI viết.
        Bỏ trống cũng chạy, nhưng caption sẽ trung tính và ai cũng nhận ra.
        Cách nhanh nhất để điền ô <strong>Giọng viết</strong>: dán 2–3 caption cũ bạn ưng nhất vào đó.
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Kênh</div>
        <div className="cfg-row">
          <label className="cfg-label">Tên kênh
            <input className="cfg-input" value={creatorName} onChange={e => setCreatorName(e.target.value)} placeholder="Teelacodes" />
          </label>
        </div>
        <label className="cfg-label">Bio / câu định vị
          <textarea className="cfg-input cfg-textarea" rows={2} value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Designer looks for less — under $50" />
        </label>
        <label className="cfg-label">Khán giả là ai
          <textarea className="cfg-input cfg-textarea" rows={3} value={audience} onChange={e => setAudience(e.target.value)}
            placeholder="Nữ 20-35, mua sắm theo ngân sách, thích tìm hàng đẹp giá thấp, lướt TikTok buổi tối..." />
        </label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Nội dung</div>
        <label className="cfg-label">Content pillars — mỗi dòng một mục
          <textarea className="cfg-input cfg-textarea" rows={4} value={pillars} onChange={e => setPillars(e.target.value)}
            placeholder={'Outfit styling — 1 piece, 3 ways\nHauls & dupes — hàng Amazon/TikTok Shop, đánh giá thật\nTrend explainers'} />
        </label>
        <label className="cfg-label">Giọng viết
          <textarea className="cfg-input cfg-textarea" rows={5} value={toneNotes} onChange={e => setToneNotes(e.target.value)}
            placeholder={'Câu ngắn, xuống dòng nhiều. Không dùng emoji quá 1 cái. Xưng "mình". Hay mở bằng một câu hỏi.\n\nDán vài caption cũ vào đây để AI bắt đúng giọng.'} />
        </label>
        <label className="cfg-label">Từ / kiểu câu cần tránh — mỗi dòng một mục
          <textarea className="cfg-input cfg-textarea" rows={3} value={avoidWords} onChange={e => setAvoidWords(e.target.value)}
            placeholder={'must-have\ngame changer\nsăn sale ngay kẻo lỡ'} />
        </label>
      </div>

      <div className="cfg-actions">
        <button className="cfg-save" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        {saved && <span className="cfg-saved">✓ Đã lưu</span>}
      </div>
    </div>
  )
}
