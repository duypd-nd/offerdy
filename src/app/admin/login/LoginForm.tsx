'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

export default function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <form action={formAction} className="lg-form">
      {notice && <p className="lg-notice">{notice}</p>}

      <label className="lg-label" htmlFor="email">Email</label>
      <input
        id="email" name="email" type="email" required autoComplete="username"
        autoFocus className="lg-input" placeholder="ban@offerdy.com"
      />

      <label className="lg-label" htmlFor="password">Mật khẩu</label>
      <input
        id="password" name="password" type="password" required
        autoComplete="current-password" className="lg-input"
      />

      <input type="hidden" name="next" value={next} />

      {/* `aria-live` de trinh doc man hinh doc len loi ngay khi no xuat hien,
          thay vi im lang nhu the khong co gi thay doi */}
      <p className="lg-error" role="alert" aria-live="polite">{state.error ?? ''}</p>

      <button type="submit" className="lg-submit" disabled={pending}>
        {pending ? 'Đang kiểm tra…' : 'Đăng nhập'}
      </button>
    </form>
  )
}
