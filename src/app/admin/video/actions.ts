'use server'

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { requireAdmin } from '@/lib/adminSession'
import { loadDealSpec } from '@/lib/video/loadDealSpec'
import { tongThoiLuong, type VideoSpec } from '@/lib/video/buildSpec'

/**
 * ⚠️ Module `'use server'` CHI export duoc ham async. Moi hang so hay kieu deu
 * phai nam o file khac — day la bay da mac trong du an nay truoc day.
 */

export type KetQuaPhanTich =
  | { ok: true; spec: VideoSpec; soAnh: number; maCoupon: string | null; thoiLuong: number; canhBao: string[] }
  | { ok: false; error: string }

export async function phanTichDeal(dealCode: number): Promise<KetQuaPhanTich> {
  await requireAdmin()
  if (!Number.isInteger(dealCode)) return { ok: false, error: 'Ma deal khong hop le' }
  try {
    const r = await loadDealSpec(dealCode)
    if (!r.ok) return r
    return {
      ok: true,
      spec: r.spec,
      soAnh: r.soAnh,
      maCoupon: r.maCoupon,
      thoiLuong: tongThoiLuong(r.spec.scenes),
      canhBao: r.canhBao,
    }
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 200) }
  }
}

/** May chu dang chay o dau — quyet dinh co dung video tai cho duoc khong. */
export async function chayTaiMayNguoiDung(): Promise<boolean> {
  await requireAdmin()
  return !process.env.VERCEL
}

export type KetQuaDung =
  | { ok: true; tep: string; giay: number; nhatKy: string }
  | { ok: false; error: string; nhatKy?: string }

/**
 * Dung video ngay tai cho.
 *
 * ⚠️ CHI CHAY DUOC KHI MO O MAY NGUOI DUNG (`npm run dev` tren may minh). Tren
 * Vercel thi khong: khong co ffmpeg, goi ham 250 MB, ham het gio 60 giay, o dia
 * tam mat sau moi lan chay. Day khong phai chuyen toi uu — la buc tuong.
 *
 * Nen tren production nut nay bi khoa va trang chi cho tai tep kich ban ve, kem
 * dong lenh de chay o may. Tu choi RO RANG con hon de nguoi dung bam mot nut
 * chay 60 giay roi thay mot loi khong hieu noi.
 */
export async function dungVideo(spec: VideoSpec): Promise<KetQuaDung> {
  await requireAdmin()
  if (process.env.VERCEL) {
    return { ok: false, error: 'Khong dung duoc video tren may chu. Tai tep kich ban ve roi chay `npm run video:render` o may.' }
  }

  const root = process.cwd()
  const thuMuc = path.join(root, '.scratch')
  fs.mkdirSync(thuMuc, { recursive: true })
  const tepSpec = path.join(thuMuc, `spec-${spec.product?.dealCode ?? 'x'}.json`)
  fs.writeFileSync(tepSpec, JSON.stringify(spec, null, 2))

  const batDau = Date.now()
  const nhatKy = await new Promise<string>((res, rej) => {
    const p = spawn(process.execPath, [path.join(root, 'scripts', 'video-render.mjs'), tepSpec], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let ra = ''
    p.stdout.on('data', d => { ra += d })
    p.stderr.on('data', d => { ra += d })
    p.on('error', rej)
    // Dung video 40 giay mat khoang mot phut ruoi tren may thuong; cho toi da 10
    // phut roi bo cuoc, de mot lan treo khong giu trang mai mai.
    const hetGio = setTimeout(() => { p.kill(); rej(new Error('Qua 10 phut — da dung lai')) }, 10 * 60 * 1000)
    p.on('close', code => {
      clearTimeout(hetGio)
      if (code === 0) res(ra)
      // Lay 800 ky tu CUOI: loi that cua ffmpeg nam o cuoi, con dau ra la danh
      // sach scene chay tot — cat dau thi thay toan tin vui truoc mot that bai.
      else rej(new Error(ra.slice(-800) || `Lenh tra ma ${code}`))
    })
  })

  const tep = path.join(root, 'out', `${spec.output}.mp4`)
  if (!fs.existsSync(tep)) return { ok: false, error: 'Lenh chay xong nhung khong thay tep video', nhatKy }
  return { ok: true, tep, giay: Math.round((Date.now() - batDau) / 1000), nhatKy }
}
