/**
 * Giong doc bang bo tong hop tieng ngay trong Windows (SAPI).
 *
 * ── VI SAO CHON CAI NAY TRUOC ─────────────────────────────────────
 *
 * Ke hoach dinh dung Google Cloud TTS (dung lai service account san co, mien phi
 * 4 trieu ky tu/thang) — nhung no doi **bat thanh toan** tren Google Cloud, tuc
 * doi mot quyet dinh cua nguoi van hanh. Con edge-tts thi mien phi that nhung la
 * cua khong chinh thuc.
 *
 * SAPI da nam san trong Windows: khong tai khoan, khong mang, khong han muc,
 * khong the hong vi mot dich vu ben ngoai doi y. Chat giong khong bang Google —
 * nhung no chung minh duoc CA DUONG TIENG ngay dem nay: doc -> do do dai -> dat
 * dung vao dong thoi gian -> tron vao video.
 *
 * Doi sang Google hay edge sau nay chi la viet them mot file cung hinh dang:
 *   docThanhTep(chu, tepRa, tuyChon) -> { tep, giay }
 *
 * ⚠️ Chu duoc truyen qua FILE chu khong nhet vao dong lenh PowerShell. Loi doc
 * co dau nhay, dau nhay don, ky tu $ va xuong dong — nhet thang vao dong lenh la
 * hong hoac te hon, la thuc thi nham thu gi do.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/** Danh sach giong co tren may. */
export function danhSachGiong() {
  return new Promise(res => {
    const ps = spawn('powershell', ['-NoProfile', '-Command',
      'Add-Type -AssemblyName System.Speech; ' +
      '(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ' +
      'ForEach-Object { $_.VoiceInfo.Name }'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let ra = ''
    ps.stdout.on('data', d => { ra += d })
    ps.on('close', () => res(ra.split(/\r?\n/).map(s => s.trim()).filter(Boolean)))
  })
}

/**
 * Doc `chu` thanh tep WAV. Tra ve duong dan va do dai that (giay).
 *
 * `rate` theo thang cua SAPI: -10 (cham) den 10 (nhanh), 0 la binh thuong.
 */
export function docSapi(chu, tepRa, { giong, rate = 0 } = {}) {
  return new Promise((res, rej) => {
    const tepChu = tepRa.replace(/\.wav$/i, '') + '.txt'
    fs.writeFileSync(tepChu, String(chu), 'utf8')

    const lenh = [
      'Add-Type -AssemblyName System.Speech',
      '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
      giong ? `$s.SelectVoice(${nhayPS(giong)})` : '',
      `$s.Rate = ${Math.round(rate)}`,
      `$s.SetOutputToWaveFile(${nhayPS(tepRa)})`,
      `$s.Speak([IO.File]::ReadAllText(${nhayPS(tepChu)}, [Text.Encoding]::UTF8))`,
      '$s.Dispose()',
    ].filter(Boolean).join('; ')

    const ps = spawn('powershell', ['-NoProfile', '-Command', lenh], { stdio: ['ignore', 'ignore', 'pipe'] })
    let loi = ''
    ps.stderr.on('data', d => { loi += d })
    ps.on('error', rej)
    ps.on('close', code => {
      try { fs.unlinkSync(tepChu) } catch {}
      if (code !== 0 || !fs.existsSync(tepRa)) return rej(new Error(loi.trim() || `SAPI tra ma ${code}`))
      // ⚠️ Do do dai THAT tu tep, khong uoc luong theo so tu. Do dai giong doc la
      // thu quyet dinh do dai scene — doan sai thi chu chay truoc tieng hoac
      // nguoc lai, va loi do chi lo ra khi xem lai ca video.
      res(tepRa)
    })
  })
}

/** Nhay don kieu PowerShell — nhan doi dau nhay don ben trong. */
function nhayPS(s) {
  return "'" + String(s).replace(/'/g, "''") + "'"
}
