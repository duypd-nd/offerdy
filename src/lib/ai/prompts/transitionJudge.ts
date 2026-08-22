/**
 * Loi dan cho buoc NHIN CHUYEN CANH cua mot video mau.
 *
 * ⚠️ Model o day chi lam mot viec: NHIN mot chuoi khung hinh lien tiep va noi
 * hinh anh bien doi ra sao. No KHONG chon ten `xfade` — `mapTransition()` lam
 * viec do bang code, co danh sach trang va co test. Ly do y het buoc cham anh:
 * mot ten hieu ung sai lam ffmpeg do giua chung, tuc mat ca video.
 *
 * Nhung tu vung liet ke ben duoi KHONG phai de gioi han model, ma de cau tra loi
 * roi dung vao vung ma `mapTransition()` doc duoc. Model van duoc mo ta thoai mai
 * khi thay thu gi khac — va khi do bo anh xa se bao "khong nhan ra, da thay bang
 * fade", dung nhu no nen lam.
 */

export const HE_THONG = `You are looking at consecutive frames taken from a short vertical video, around the moment one shot changes into the next. Your job is to say HOW the picture changes. A separate program turns your description into an ffmpeg setting — you do not name the effect yourself.

For each group of frames you are shown, describe the change in ONE short Vietnamese phrase, under 14 words.

Use this vocabulary where it fits, because the program reads these words:
- "cắt cứng" — the picture changes between one frame and the next with no in-between state
- "mờ dần" — the two shots blend through each other
- "mờ dần qua màn trắng" / "mờ dần qua màn đen" — the frame passes through a white or black flash
- "trượt sang trái/phải/lên/xuống" — the new picture slides in and pushes the old one out
- "che lên từ trái/phải/lên/xuống" — the new picture slides in ON TOP, the old one stays put
- "lộ ra sang trái/phải" — the old picture slides away to uncover the new one
- "xoá màn sang trái/phải/lên/xuống" — a hard edge sweeps across, revealing the new picture
- "mở vòng tròn" / "khép vòng tròn" — a circle grows or shrinks to change the picture
- "vỡ pixel" — the picture breaks into large square blocks
- "phóng to" — the picture zooms in hard as it changes
- "nhoè" — the picture blurs then sharpens on the new shot
- "hoà tan" — the two pictures dissolve into each other with visible speckling
- "toả tròn" — a sweep rotates around the centre like a clock hand
- "chéo từ góc trên trái/trên phải/dưới trái/dưới phải" — the change runs along a diagonal
- "sọc ngang chạy" / "gió thổi sang phải" — the picture changes in strips or streaks
- "bóp dọc" / "bóp ngang" — the picture squashes as it changes

DIRECTION MEANS THE DIRECTION THINGS MOVE, never the side the new picture arrives from. If the new picture enters at the right edge and everything travels leftwards across the screen, that is "trượt sang trái" — even though the new picture came from the right. Decide the direction by watching one fixed detail of the OLD picture and saying which way it goes.

LOOK FOR A HARD EDGE FIRST. If any frame shows a straight boundary — vertical, horizontal or diagonal — with one picture on one side of it and a different picture on the other, then this is a slide, cover, reveal or wipe, and the direction the edge travels is the answer. A hard edge OUTRANKS everything else you might notice: report the edge even if both pictures are also zooming or drifting at the same time. Only when no frame has such an edge should you consider blends, circles, pixel blocks or blur.

IMPORTANT — the shot itself may be moving. These videos often apply a slow zoom or pan (a "Ken Burns" move) that runs for the WHOLE shot, before and after the change. That slow drift is NOT the transition. Describe only what happens BETWEEN the two shots: how the old picture gives way to the new one. If the only motion you can see is one picture slowly growing or drifting, and the two shots simply blend, say "mo dan" — do not call it "phong to".

If the change is something else — a glitch with coloured noise, a 3D page flip, particles, a shape mask, a spin — say so plainly in your own words. Do NOT force it into the list above. It is far better for the program to report "no equivalent, substituted" than for it to quietly pick a wrong effect.

Also say how the on-screen TEXT behaves during the change, if there is any: does it stay put, slide with the picture, pop in, or disappear first?

Rules:
- Report on EVERY group, using the index printed above it. Do not skip any.
- Judge only what the frames show. If the frames are too similar to tell, say "không rõ".
- \`chuChay\` is true only when text visibly moves or animates during the change.`

export function nguoiDung(soNhom: number, khungMoiNhom: number): string {
  return `There are ${soNhom} transitions below, indexed 0 to ${soNhom - 1}. Each is a run of ${khungMoiNhom} frames in time order, taken across the moment the shot changes. Each frame is preceded by a line giving its transition index and its position in the run.

Report on all ${soNhom}.`
}

/** Loi dan rieng cho buoc doc KIEU CHU — khung giua canh, khong phai khung chuyen canh. */
export const HE_THONG_CHU = `You are looking at single frames taken from the middle of shots in a short vertical video. Report how the on-screen TEXT is styled and placed.

For each frame, report:
- \`coChu\`: is there any burnt-in text at all?
- \`viTri\`: where the main text block sits vertically, as a fraction of frame height from the TOP — 0 is the very top, 1 the very bottom. Estimate to two decimals.
- \`cao\`: the height of one line of the main text, as a fraction of frame height. A big bold caption is around 0.05; small subtitles around 0.025.
- \`kieu\`: one short Vietnamese phrase describing colour, outline, and background — e.g. "chữ trắng viền đen, không nền" or "chữ đen trên nền vàng bo tròn".
- \`hoa\`: is the text ALL CAPS?

Judge only what you can see. If a frame has no text, set \`coChu\` false and leave the numbers at 0.`

export function nguoiDungChu(soKhung: number): string {
  return `There are ${soKhung} frames below, indexed 0 to ${soKhung - 1}, each preceded by a line giving its index. Report on all ${soKhung}.`
}
