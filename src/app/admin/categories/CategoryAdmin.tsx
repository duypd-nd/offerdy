'use client'

import { useState, useTransition } from 'react'
import { updateCategory, deleteCategory, createCategory } from './actions'

const COLOR_CLASSES = ['ci-tech','ci-fashion','ci-beauty','ci-home','ci-food','ci-travel','ci-ai','ci-sports','ci-kids']

const EMOJIS = [
  '📱','💻','🖥️','⌚','📷','🎧','🖨️','🔌','🔋','💡','🎮','🕹️',
  '👗','👠','👒','👜','💍','🧣','🧥','👟','🕶️','💄','💅','🧴',
  '🏠','🛋️','🪑','🛏️','🧹','🍳','🌿','🕯️','🖼️','🪴','🛁','🚿',
  '🍕','🍔','🥗','🍱','☕','🧃','🍰','🥘','🍜','🥩','🍣','🍷',
  '✈️','🏖️','🗺️','🏕️','🚢','🏔️','🌴','🎡','🗽','🧳','🛫','🌏',
  '🤖','🧠','⚡','🔬','🧬','💊','🩺','🔭','🧪','🛸','🔮','🌐',
  '⚽','🏀','🎾','🏋️','🧘','🚴','🏊','⛷️','🎯','🥊','🏆','🎽',
  '🧸','🪀','🎨','📚','🎒','✏️','🎈','🎠','🦄','🍭','🎪','🌈',
  '🛒','💰','🏷️','🎁','💳','📦','🤝','🌟','✨','💎','🔥','🆕',
]

type AdminCategory = {
  _id: string; name: string; slug: string; emoji: string
  dealCount?: string; colorClass?: string; order?: number; _createdAt: string
}

export default function CategoryAdmin({ initialCategories }: { initialCategories: AdminCategory[] }) {
  const [cats, setCats] = useState(initialCategories)
  const [search, setSearch] = useState('')
  const [editingCat, setEditingCat] = useState<AdminCategory | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = cats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const handleField = (id: string, field: string, value: unknown) =>
    setCats(prev => prev.map(c => c._id === id ? { ...c, [field]: value } : c))

  const handleDelete = (id: string) => {
    if (!confirm('Xóa category này?')) return
    startTransition(async () => {
      await deleteCategory(id)
      setCats(prev => prev.filter(c => c._id !== id))
      showToast('Đã xóa category')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Category</h1>
          <div className="oa-breadcrumb">Home / Category</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem Website
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm mới</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-num">#</th>
              <th>Tên</th>
              <th>Emoji</th>
              <th>Deal Count</th>
              <th>Color Class</th>
              <th>Thứ tự</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c._id}>
                <td className="oa-td-num">{i + 1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingCat(c)}>{c.name}</button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.slug}</div>
                </td>
                <td style={{ fontSize: 22 }}>{c.emoji}</td>
                <td>
                  <input className="oa-inline-num" style={{ width: 120 }} value={c.dealCount ?? ''} placeholder="4,820 deals"
                    onChange={e => handleField(c._id, 'dealCount', e.target.value)} />
                </td>
                <td>
                  <select className="oa-inline-sel" value={c.colorClass ?? ''} onChange={e => handleField(c._id, 'colorClass', e.target.value)}>
                    <option value="">—</option>
                    {COLOR_CLASSES.map(cc => <option key={cc} value={cc}>{cc}</option>)}
                  </select>
                </td>
                <td>
                  <input className="oa-inline-num" type="number" value={c.order ?? ''} placeholder="0"
                    onChange={e => handleField(c._id, 'order', e.target.value ? Number(e.target.value) : undefined)} />
                </td>
                <td>
                  <div className="oa-row-btns">
                    <button className="oa-row-save" title="Lưu" onClick={() => {
                      startTransition(async () => {
                        await updateCategory(c._id, { dealCount: c.dealCount, colorClass: c.colorClass, order: c.order })
                        showToast('Đã lưu')
                      })
                    }}>✓</button>
                    <button className="oa-row-del" onClick={() => handleDelete(c._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="oa-empty">Không tìm thấy category nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">{filtered.length} / {cats.length} category</div>
      </div>

      {showModal && (
        <CategoryModal mode="add" onClose={() => setShowModal(false)}
          onSaved={c => { setCats(prev => [...prev, c]); setShowModal(false); showToast('Đã thêm') }} />
      )}
      {editingCat && (
        <CategoryModal mode="edit" initial={editingCat} onClose={() => setEditingCat(null)}
          onSaved={updated => { setCats(prev => prev.map(c => c._id === updated._id ? updated : c)); setEditingCat(null); showToast('Đã lưu') }}
          onDeleted={id => { setCats(prev => prev.filter(c => c._id !== id)); setEditingCat(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function CategoryModal({ mode, initial, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminCategory
  onClose: () => void; onSaved: (c: AdminCategory) => void; onDeleted?: (id: string) => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '', slug: initial?.slug ?? '', emoji: initial?.emoji ?? '',
    dealCount: initial?.dealCount ?? '', colorClass: initial?.colorClass ?? '', order: initial?.order ?? 0,
  })
  const [isPending, startTransition] = useTransition()
  const [showEmoji, setShowEmoji] = useState(false)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, name, ...(mode === 'add' ? { slug } : {}) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      if (mode === 'add') {
        const doc = await createCategory({ name: form.name, slug: form.slug, emoji: form.emoji, dealCount: form.dealCount || undefined, colorClass: form.colorClass || undefined, order: form.order || undefined })
        onSaved({ _id: doc._id, _createdAt: new Date().toISOString(), ...form, dealCount: form.dealCount || undefined, colorClass: form.colorClass || undefined })
      } else if (initial) {
        await updateCategory(initial._id, { name: form.name, slug: { _type: 'slug', current: form.slug }, emoji: form.emoji, dealCount: form.dealCount || undefined, colorClass: form.colorClass || undefined, order: form.order || undefined })
        onSaved({ ...initial, ...form, dealCount: form.dealCount || undefined, colorClass: form.colorClass || undefined })
      }
    })
  }

  const handleDelete = () => {
    if (!initial || !onDeleted || !confirm('Xóa category này?')) return
    startTransition(async () => { await deleteCategory(initial._id); onDeleted(initial._id) })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal">
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm Category mới' : 'Chỉnh sửa Category'}</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <div className="oa-modal-row">
            <label className="oa-label">Tên *<input className="oa-input" value={form.name} onChange={e => handleNameChange(e.target.value)} required /></label>
            <label className="oa-label">Emoji *
              <div className="oa-emoji-wrap">
                <input className="oa-input" value={form.emoji} onChange={e => set('emoji', e.target.value)} placeholder="📱" required
                  onFocus={() => setShowEmoji(true)}
                  onBlur={() => setTimeout(() => setShowEmoji(false), 150)} />
                {showEmoji && (
                  <div className="oa-emoji-picker">
                    {EMOJIS.map(em => (
                      <button key={em} type="button" className="oa-emoji-opt"
                        onMouseDown={() => { set('emoji', em); setShowEmoji(false) }}>{em}</button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </div>
          <label className="oa-label">Slug *<input className="oa-input" value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase())} required /></label>
          <div className="oa-modal-row">
            <label className="oa-label">Deal Count<input className="oa-input" value={form.dealCount} onChange={e => set('dealCount', e.target.value)} placeholder="4,820 deals" /></label>
            <label className="oa-label">Color Class
              <select className="oa-input" value={form.colorClass} onChange={e => set('colorClass', e.target.value)}>
                <option value="">— Chọn —</option>
                {COLOR_CLASSES.map(cc => <option key={cc} value={cc}>{cc}</option>)}
              </select>
            </label>
            <label className="oa-label">Thứ tự<input className="oa-input" type="number" value={form.order} onChange={e => set('order', Number(e.target.value))} /></label>
          </div>
          <div className="oa-modal-footer">
            {mode === 'edit' && <button type="button" className="oa-btn oa-btn-red" onClick={handleDelete} disabled={isPending}>🗑 Xóa</button>}
            <div style={{ flex: 1 }} />
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending}>{isPending ? 'Đang lưu...' : mode === 'add' ? 'Thêm mới' : '💾 Lưu'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
