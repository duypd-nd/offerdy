'use client'

import { useState, useTransition } from 'react'
import { saveConfigDoc } from '../actions'

export default function AuthorConfigForm({ initial }: { initial: Record<string, unknown> }) {
  const [defaultName, setDefaultName] = useState(String(initial.defaultName ?? ''))
  const [role, setRole] = useState(String(initial.role ?? ''))
  const [bio, setBio] = useState(String(initial.bio ?? ''))
  const [email, setEmail] = useState(String(initial.email ?? ''))
  const [twitterHandle, setTwitterHandle] = useState(String(initial.twitterHandle ?? ''))
  const [experienceBio, setExperienceBio] = useState(String(initial.experienceBio ?? ''))
  const [verificationProcess, setVerificationProcess] = useState(String(initial.verificationProcess ?? ''))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveConfigDoc('configAuthor', {
        defaultName: defaultName || null,
        role: role || null,
        bio: bio || null,
        email: email || null,
        twitterHandle: twitterHandle || null,
        experienceBio: experienceBio || null,
        verificationProcess: verificationProcess || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin/config" className="cfg-back">← Cấu hình</a>
        <h1 className="cfg-title">Cấu hình tác giả</h1>
        <p className="cfg-subtitle">Thông tin tác giả mặc định hiển thị dưới bài viết</p>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Thông tin tác giả</div>
        <div className="cfg-row">
          <label className="cfg-label">Tên tác giả mặc định<input className="cfg-input" value={defaultName} onChange={e => setDefaultName(e.target.value)} placeholder="Offerdy Editorial" /></label>
          <label className="cfg-label">Chức danh<input className="cfg-input" value={role} onChange={e => setRole(e.target.value)} placeholder="Editor, Content Writer" /></label>
        </div>
        <label className="cfg-label">Giới thiệu ngắn
          <textarea className="cfg-input cfg-textarea" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Hiển thị dưới bài viết blog/review..." />
        </label>
        <div className="cfg-row">
          <label className="cfg-label">Email liên hệ<input className="cfg-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="editor@offerdy.com" /></label>
          <label className="cfg-label">Twitter/X handle<input className="cfg-input" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} placeholder="@offerdy" /></label>
        </div>
        <div className="cfg-image-note">Ảnh đại diện (avatar) — upload qua <strong>Sanity Studio</strong>.</div>
        <label className="cfg-label">Kinh nghiệm &amp; câu chuyện (hiển thị trên trang /author)
          <textarea className="cfg-input cfg-textarea" rows={6} value={experienceBio} onChange={e => setExperienceBio(e.target.value)} placeholder="Giới thiệu chi tiết về nền tảng, kinh nghiệm..." />
        </label>
        <label className="cfg-label">Quy trình cá nhân kiểm tra mã (hiển thị trên trang /author)
          <textarea className="cfg-input cfg-textarea" rows={5} value={verificationProcess} onChange={e => setVerificationProcess(e.target.value)} placeholder="Mô tả cách bạn tự kiểm tra/xác minh từng deal..." />
        </label>
      </div>

      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu cấu hình'}</button>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
