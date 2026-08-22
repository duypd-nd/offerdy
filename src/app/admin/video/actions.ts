'use server'

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { requireAdmin } from '@/lib/adminSession'
import { loadDealSpec, type NguonKichBan } from '@/lib/video/loadDealSpec'
import { buildSpec, tongThoiLuong, type VideoSpec } from '@/lib/video/buildSpec'
import { generateCaptionsForDeal, markDealsPosted } from '@/app/admin/social-kit/actions'
import type { CaptionAngle } from '@/lib/ai/generateCaption'

/**
 * ⚠️ Module `'use server'` CHI export duoc ham async. Moi hang so hay kieu deu
 * phai nam o file khac — day la bay da mac trong du an nay truoc day.
 */

export type KetQuaPhanTich =
  | {
      ok: true
      spec: VideoSpec
      soAnh: number
      maCoupon: string | null
      thoiLuong: number
      canhBao: string[]
      /** Du de dung lai kich ban khi nguoi van hanh bo bot anh — khong goi lai AI. */
      nguon: NguonKichBan
      /** Anh thuc su dua vao kich ban, dung thu tu. */
      anhDung: string[]
      anhBo: { url: string; lyDo: string }[]
      daChamAnh: boolean
    }
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
      nguon: r.nguon,
      anhDung: r.anhDung,
      anhBo: r.anhBo,
      daChamAnh: r.daChamAnh,
    }
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 200) }
  }
}

export type KetQuaDungLai =
  | { ok: true; spec: VideoSpec; thoiLuong: number; anhDung: string[] }
  | { ok: false; error: string }

/**
 * Dung lai kich ban voi mot danh sach anh khac — khi nguoi van hanh tu bo anh.
 *
 * ⚠️ KHONG goi lai AI. Loi doc va diem cham anh da co trong `nguon`; goi lai
 * vua ton tien vua khien cung mot deal ra hai loi doc khac nhau giua hai lan
 * bam, va nguoi van hanh se tuong minh bam nham.
 *
 * ⚠️ `nguon` di tu trinh duyet len nen KHONG phai du lieu dang tin. Day khong
 * phai lo hong moi: `dungVideo()` von da nhan ca tep kich ban tu client, tuc
 * ranh gioi tin cay cua trang nay von la "quan tri vien dua gi thi dung nay".
 * Ca hai deu qua `requireAdmin()`, va bo dung video chi chay o may nguoi dung.
 * Ghi ra day de lan sau khong ai nham tuong co mot vong chan o day.
 */
export async function dungLaiKichBan(nguon: NguonKichBan, anhChon: string[]): Promise<KetQuaDungLai> {
  await requireAdmin()
  try {
    // ⚠️ `anhChon` la danh sach DAY DU va DA XEP mà trang admin muốn dùng, không
    // phải "những ảnh cần bỏ". Bản đầu nhận danh sách bỏ và tự lọc từ `anhGoc`,
    // và nó sai một cách kín đáo: mỗi lần bấm một ảnh thì mọi ảnh Claude đã loại
    // lại lặng lẽ quay vào kịch bản, vì `anhGoc` là danh sách TRƯỚC khi chấm.
    //
    // Vẫn lọc theo `anhGoc` để một URL lạ không lọt vào bộ dựng video.
    const hopLe = new Set(nguon.anhGoc)
    const anh = anhChon.filter(u => hopLe.has(u))
    if (!anh.length) return { ok: false, error: 'Phải giữ lại ít nhất một ảnh' }

    const spec = buildSpec({
      deal: nguon.deal,
      images: anh,
      beats: nguon.beats,
      couponCode: nguon.couponCode,
      storeName: nguon.storeName,
    })
    return { ok: true, spec, thoiLuong: tongThoiLuong(spec.scenes), anhDung: anh }
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

// ── Goi dang bai ──────────────────────────────────────────────────
//
// Nut that cua kenh video KHONG con la cong cu — 4 video da dung xong ma chua
// dang cai nao. Ly do rat tam thuong: de dang mot bai phai nhay qua ba cho —
// tep MP4 o `out/`, caption o `/admin/social-kit`, link do duoc o day. Goi nay
// gom ca ba vao mot cho, ngay canh video vua dung.
//
// ⚠️ KHONG viet lai bo may caption. `generateCaptionsForDeal` la NGUON DUY NHAT
// sinh caption — no da mang theo toan bo hang rao chong bia so (`findUnsafeText`,
// cho trong `{price}`/`{discount}` do code thay). Mot ban sao thu hai o day se
// lech khoi ban goc ngay lan sua brief dau tien, va cai lech ra la mot con so
// sai doc len trong bai dang.

export type BienTheCaption = { text: string; hashtags: string[] }

export type KetQuaCaption =
  | { ok: true; bienThe: BienTheCaption[]; bo: string[] }
  | { ok: false; error: string }

/**
 * Caption cho TikTok — nen tang nay KHONG bien URL trong caption thanh link
 * bam duoc, nen `generateCaption` tu chuyen CTA sang nhac MA san pham. Link do
 * duoc nam o bio, va o link ngay ben tren trong cung mot goi.
 */
export async function vietCaptionVideo(code: number, goc: CaptionAngle): Promise<KetQuaCaption> {
  await requireAdmin()
  const r = await generateCaptionsForDeal({
    code, angle: goc, platform: 'tiktok', count: 2,
    // `campaign: 'video'` de neu sau nay dan sang mot nen tang CO link bam duoc
    // thi link trong caption cung mang dung nhan `video` nhu link o bio.
    style: 'deal', campaign: 'video',
  })
  if (!r.ok) return r
  return { ok: true, bienThe: r.captions.map(c => ({ text: c.text, hashtags: c.hashtags })), bo: r.rejected }
}

/**
 * Tep MP4 da dung cho deal nay chua — ke ca dung tu phien truoc.
 *
 * Khong doan theo ma deal: `spec.output` la ten tep that ma `video-render.mjs`
 * ghi ra, nen hoi dung cai ten do.
 */
export async function tepVideoDaCo(output: string): Promise<{ tep: string; luc: string } | null> {
  await requireAdmin()
  if (process.env.VERCEL) return null
  // Chan duong dan di ra ngoai `out/` — `output` di tu client len.
  const ten = path.basename(output)
  const tep = path.join(process.cwd(), 'out', `${ten}.mp4`)
  if (!fs.existsSync(tep)) return null
  return { tep, luc: fs.statSync(tep).mtime.toISOString() }
}

/**
 * Danh dau da dang — cung mot o `lastPostedAt` ma `/admin/social-kit` dung de
 * xoay vong deal. Neu goi nay ghi cho khac thi hai trang se de xuat trung deal.
 */
export async function danhDauDaDang(code: number): Promise<{ ok: boolean }> {
  await requireAdmin()
  return markDealsPosted([code])
}
