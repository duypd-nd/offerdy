'use client'

import { useState, useTransition } from 'react'
import { saveConfigDoc } from '../actions'

type NavItem = { label: string; url: string }
type FooterLink = { label: string; url: string }
type FooterColumn = { title: string; links: FooterLink[] }

export default function GeneralConfigForm({ initial }: { initial: Record<string, unknown> }) {
  const [siteName, setSiteName] = useState(String(initial.siteName ?? ''))
  const [tagline, setTagline] = useState(String(initial.tagline ?? ''))
  const [copyrightText, setCopyrightText] = useState(String(initial.copyrightText ?? ''))
  const [navigation, setNavigation] = useState<NavItem[]>((initial.navigation as NavItem[]) ?? [])
  const [footerColumns, setFooterColumns] = useState<FooterColumn[]>((initial.footerColumns as FooterColumn[]) ?? [])
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveConfigDoc('configGeneral', {
        siteName: siteName || null,
        tagline: tagline || null,
        copyrightText: copyrightText || null,
        navigation: navigation.map(n => ({ _type: 'navItem', _key: crypto.randomUUID(), ...n })),
        footerColumns: footerColumns.map(col => ({
          _type: 'footerColumn', _key: crypto.randomUUID(), title: col.title,
          links: col.links.map(l => ({ _type: 'footerLink', _key: crypto.randomUUID(), ...l })),
        })),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const updateNav = (i: number, k: keyof NavItem, v: string) => setNavigation(prev => prev.map((n, idx) => idx === i ? { ...n, [k]: v } : n))
  const removeNav = (i: number) => setNavigation(prev => prev.filter((_, idx) => idx !== i))
  const addNav = () => setNavigation(prev => [...prev, { label: '', url: '' }])

  const updateColTitle = (i: number, v: string) => setFooterColumns(prev => prev.map((c, idx) => idx === i ? { ...c, title: v } : c))
  const removeCol = (i: number) => setFooterColumns(prev => prev.filter((_, idx) => idx !== i))
  const addCol = () => setFooterColumns(prev => [...prev, { title: '', links: [] }])
  const updateLink = (ci: number, li: number, k: keyof FooterLink, v: string) =>
    setFooterColumns(prev => prev.map((col, cIdx) => cIdx !== ci ? col : { ...col, links: col.links.map((l, lIdx) => lIdx === li ? { ...l, [k]: v } : l) }))
  const removeLink = (ci: number, li: number) =>
    setFooterColumns(prev => prev.map((col, cIdx) => cIdx !== ci ? col : { ...col, links: col.links.filter((_, lIdx) => lIdx !== li) }))
  const addLink = (ci: number) =>
    setFooterColumns(prev => prev.map((col, cIdx) => cIdx !== ci ? col : { ...col, links: [...col.links, { label: '', url: '' }] }))

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin/config" className="cfg-back">← Cấu hình</a>
        <h1 className="cfg-title">Cấu hình chung</h1>
        <p className="cfg-subtitle">Tên website, slogan, điều hướng và footer</p>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Thông tin cơ bản</div>
        <div className="cfg-row">
          <label className="cfg-label">Tên website<input className="cfg-input" value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Offerdy" /></label>
          <label className="cfg-label">Slogan<input className="cfg-input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Real Deals. Verified." /></label>
        </div>
        <label className="cfg-label">Dòng bản quyền (footer)<input className="cfg-input" value={copyrightText} onChange={e => setCopyrightText(e.target.value)} placeholder="© 2025 Offerdy. All rights reserved." /></label>
        <div className="cfg-image-note">Logo và Favicon — upload ảnh qua <strong>Sanity Studio</strong> (không hỗ trợ upload ảnh trực tiếp tại đây).</div>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Menu điều hướng</div>
        <div className="cfg-array-wrap">
          {navigation.length === 0 && <div className="cfg-array-empty">Chưa có mục nào</div>}
          {navigation.map((n, i) => (
            <div key={i} className="cfg-array-item">
              <div className="cfg-array-fields">
                <div className="cfg-array-row">
                  <input className="cfg-input" placeholder="Nhãn (VD: Deals)" value={n.label} onChange={e => updateNav(i, 'label', e.target.value)} />
                  <input className="cfg-input" placeholder="URL (VD: /deals)" value={n.url} onChange={e => updateNav(i, 'url', e.target.value)} />
                </div>
              </div>
              <button type="button" className="cfg-array-remove" onClick={() => removeNav(i)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="cfg-add-btn" onClick={addNav}>＋ Thêm mục menu</button>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Cột Footer</div>
        {footerColumns.map((col, ci) => (
          <div key={ci} style={{ marginBottom: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input className="cfg-input" placeholder="Tiêu đề cột" value={col.title} onChange={e => updateColTitle(ci, e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="cfg-array-remove" onClick={() => removeCol(ci)}>×</button>
            </div>
            {col.links.map((l, li) => (
              <div key={li} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="cfg-input" placeholder="Nhãn link" value={l.label} onChange={e => updateLink(ci, li, 'label', e.target.value)} />
                <input className="cfg-input" placeholder="URL" value={l.url} onChange={e => updateLink(ci, li, 'url', e.target.value)} />
                <button type="button" className="cfg-array-remove" onClick={() => removeLink(ci, li)}>×</button>
              </div>
            ))}
            <button type="button" className="cfg-add-btn" style={{ marginTop: 6 }} onClick={() => addLink(ci)}>＋ Thêm link</button>
          </div>
        ))}
        <button type="button" className="cfg-add-btn" onClick={addCol}>＋ Thêm cột footer</button>
      </div>

      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu cấu hình'}</button>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
