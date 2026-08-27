/**
 * Bo dinh tuyen nha cung cap AI.
 *
 * ⚠️ Test o day co y **khong** kiem duong di dep. Duong dep tu no lo. Thu phai
 * kiem la ba kich ban ton tien hoac lam hong im lang:
 *
 *   1. Ba nha mien phi cung chet -> Claude co bi goi vo han khong
 *   2. Khoa mien phi chua dang ky -> hanh vi co giu nguyen nhu truoc 27/08 khong
 *   3. Nha tra ve dung hinh nhung SAI NOI DUNG -> co bi nuot khong
 *
 * Moi nha cung cap deu la nha GIA. Khong goi API that trong test: cham, ton han
 * muc mien phi, va ket qua phu thuoc mang — mot test do dac dinh khong duoc phep
 * do mang.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { generateStructured, KhongCoNhaNaoError, datBoNgheLog, type LogRouter } from '@/lib/ai/router'
import { AIProviderError, type AIProvider, type EnvLike, type ProviderName } from '@/lib/ai/router/types'
import { xoaHetCauDao, dangNghi, ghiHong, CAU_DAO_NGUONG_HONG, CAU_DAO_NGHI_MS } from '@/lib/ai/router/breaker'
import { datLaiNganSach, soLanDaGoiTraPhi, docNganSachTuEnv, NGAN_SACH_MAC_DINH } from '@/lib/ai/router/budget'
import { thuTuNha, nhaEpChoViec, modelCuaNha, khoaCuaNha } from '@/lib/ai/router/registry'
import { schemaChoGemini, schemaChoOpenAI } from '@/lib/ai/router/jsonSchema'
import { taoNhaOpenAI } from '@/lib/ai/router/providers/openaiCompat'
import { taoNhaGemini } from '@/lib/ai/router/providers/gemini'

const Schema = z.object({ description: z.string().describe('mo ta') })

/** Nha gia: khai bao san no se lam gi. */
function nhaGia(opts: {
  name: ProviderName
  coKhoa?: boolean
  ket: 'ok' | AIProviderError['loai']
  demGoi?: { n: number }
}): () => AIProvider {
  return () => ({
    name: opts.name,
    isAvailable: () => opts.coKhoa !== false,
    model: () => `${opts.name}-gia`,
    async generate<T extends z.ZodType>() {
      if (opts.demGoi) opts.demGoi.n += 1
      if (opts.ket === 'ok') {
        return {
          // Nha gia luon tra dung hinh cua `Schema` — ep kieu o day chi de khop
          // chu ky tong quat, khong phai de nuot mot dau ra sai hinh.
          data: { description: `tu ${opts.name}` } as z.infer<T>,
          provider: opts.name, model: `${opts.name}-gia`, latencyMs: 1,
        }
      }
      throw new AIProviderError(opts.ket, opts.name, `${opts.name} gia hong: ${opts.ket}`)
    },
  })
}

const req = { task: 'offer-content' as const, schema: Schema, system: 's', prompt: 'p', maxTokens: 128 }
const ENV_SACH: EnvLike = {}

function imLang() { datBoNgheLog(() => {}) }

// ── 1. Duong di co ban ────────────────────────────────────────────
test('nha dau tien chay duoc thi KHONG dung toi nha sau', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const demClaude = { n: 0 }
  const kq = await generateStructured(req, ENV_SACH, {
    groq: nhaGia({ name: 'groq', ket: 'ok' }),
    anthropic: nhaGia({ name: 'anthropic', ket: 'ok', demGoi: demClaude }),
  })
  assert.equal(kq.provider, 'groq')
  assert.equal(demClaude.n, 0, 'Claude bi goi du groq da chay duoc — moi lan nhu the la mot khoan tien')
})

test('nha mien phi hong thi roi xuong nha sau, dung thu tu', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const kq = await generateStructured(req, ENV_SACH, {
    groq: nhaGia({ name: 'groq', ket: 'retryable' }),
    gemini: nhaGia({ name: 'gemini', ket: 'retryable' }),
    openrouter: nhaGia({ name: 'openrouter', ket: 'ok' }),
    anthropic: nhaGia({ name: 'anthropic', ket: 'ok' }),
  })
  assert.equal(kq.provider, 'openrouter')
})

// ── 2. Kich ban dat nhat: ba nha mien phi cung chet ───────────────
test('⚠️ ba nha mien phi cung chet -> Claude duoc goi, nhung CHI trong ngan sach', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const env: EnvLike = { AI_PAID_MAX_CALLS: '2' }
  const demClaude = { n: 0 }
  const kho = {
    groq: nhaGia({ name: 'groq', ket: 'retryable' }),
    gemini: nhaGia({ name: 'gemini', ket: 'retryable' }),
    openrouter: nhaGia({ name: 'openrouter', ket: 'retryable' }),
    anthropic: nhaGia({ name: 'anthropic', ket: 'ok', demGoi: demClaude }),
  }

  // Hai lan dau: con ngan sach.
  assert.equal((await generateStructured(req, env, kho)).provider, 'anthropic')
  assert.equal((await generateStructured(req, env, kho)).provider, 'anthropic')

  // Lan thu ba: het. Phai NEM chu khong phai "thoi cu goi".
  await assert.rejects(() => generateStructured(req, env, kho), (e: unknown) => {
    assert.ok(e instanceof KhongCoNhaNaoError)
    assert.ok(e.chiTiet.some(c => c.provider === 'anthropic' && c.loai === 'het-ngan-sach'), JSON.stringify(e.chiTiet))
    return true
  })
  assert.equal(demClaude.n, 2, 'Claude bi goi qua han muc — day dung la hoa don khong ai chan')
  assert.equal(soLanDaGoiTraPhi(), 2)
})

test('⚠️ ngan sach dem lan GOI, khong dem lan thanh cong', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const env: EnvLike = { AI_PAID_MAX_CALLS: '1' }
  const kho = { anthropic: nhaGia({ name: 'anthropic', ket: 'retryable' }) }
  // Claude hong -> van phai tinh la da tieu mot lan goi. Neu chi dem lan THANH
  // CONG thi mot Claude dang loi se duoc goi lai vo han, va moi lan van tinh tien.
  await assert.rejects(() => generateStructured(req, env, kho))
  assert.equal(soLanDaGoiTraPhi(), 1)
})

// ── 3. Chua dang ky khoa mien phi -> hanh vi cu ───────────────────
test('⚠️ chua co khoa mien phi nao -> roi thang xuong Claude, y nhu truoc 27/08', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const kq = await generateStructured(req, ENV_SACH, {
    groq: nhaGia({ name: 'groq', coKhoa: false, ket: 'ok' }),
    gemini: nhaGia({ name: 'gemini', coKhoa: false, ket: 'ok' }),
    openrouter: nhaGia({ name: 'openrouter', coKhoa: false, ket: 'ok' }),
    anthropic: nhaGia({ name: 'anthropic', ket: 'ok' }),
  })
  assert.equal(kq.provider, 'anthropic')
})

test('khong co nha nao ca -> nem loi noi ro la thieu khoa, khong nem loi mo ho', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  await assert.rejects(() => generateStructured(req, ENV_SACH, {}), (e: unknown) => {
    assert.ok(e instanceof KhongCoNhaNaoError)
    assert.match(e.message, /khong co nha cung cap/i)
    return true
  })
})

/**
 * ⚠️ Do that tren production sang 27/08: cron chet voi thong diep
 * `Moi nha cung cap AI deu hong: anthropic(auth)` — dung MOT ten. Ba nha mien
 * phi bi bo qua lang le vi Vercel chua co khoa, va thong diep khong he nhac
 * den chung, nen no doc y het nhu "site chi co mot nha cung cap". Phai mo code
 * ra doc `isAvailable()` moi biet. Thong diep phai tu no phan biet duoc
 * THIEU KHOA voi KHOA HONG.
 */
test('⚠️ nha bi bo qua vi thieu khoa van phai co ten trong thong diep loi', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  await assert.rejects(
    () => generateStructured(req, ENV_SACH, {
      groq: nhaGia({ name: 'groq', coKhoa: false, ket: 'ok' }),
      gemini: nhaGia({ name: 'gemini', coKhoa: false, ket: 'ok' }),
      openrouter: nhaGia({ name: 'openrouter', coKhoa: false, ket: 'ok' }),
      anthropic: nhaGia({ name: 'anthropic', ket: 'auth' }),
    }),
    (e: unknown) => {
      if (!(e instanceof KhongCoNhaNaoError)) return false
      const loaiCua = (p: ProviderName) => e.chiTiet.find(x => x.provider === p)?.loai
      for (const ten of ['groq', 'gemini', 'openrouter'] as const) {
        assert.equal(loaiCua(ten), 'thieu-khoa', `${ten}: ${JSON.stringify(e.chiTiet)}`)
      }
      // Phan biet duoc hai the loai: thieu khoa != khoa hong.
      assert.equal(loaiCua('anthropic'), 'auth')
      assert.match(e.message, /groq\(thieu-khoa\)/)
      // Ten BIEN moi truong thi duoc noi; GIA TRI khoa thi khong bao gio.
      assert.match(e.chiTiet.find(x => x.provider === 'groq')!.loi, /GROQ_API_KEY/)
      return true
    },
  )
})

// ── 4. Phan loai loi ──────────────────────────────────────────────
test('`fatal` DUNG HAN, khong doi nha — doi nha khong chua duoc loi cua chinh minh', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const demClaude = { n: 0 }
  await assert.rejects(
    () => generateStructured(req, ENV_SACH, {
      groq: nhaGia({ name: 'groq', ket: 'fatal' }),
      anthropic: nhaGia({ name: 'anthropic', ket: 'ok', demGoi: demClaude }),
    }),
    (e: unknown) => e instanceof AIProviderError && e.loai === 'fatal',
  )
  assert.equal(demClaude.n, 0, 'prompt hong ma van do sang Claude thi chi ton tien de nhan cung mot loi')
})

test('`invalid-output` VAN doi nha — dau ra bi cat la loi cua nha do', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const kq = await generateStructured(req, ENV_SACH, {
    groq: nhaGia({ name: 'groq', ket: 'invalid-output' }),
    gemini: nhaGia({ name: 'gemini', ket: 'ok' }),
  })
  assert.equal(kq.provider, 'gemini')
})

// ── 5. Cau dao ────────────────────────────────────────────────────
test('cau dao: hong du nguong thi nghi, va HET gio nghi thi mo lai', () => {
  xoaHetCauDao()
  const t = 1_000_000
  assert.equal(dangNghi('groq', t), false)
  for (let i = 0; i < CAU_DAO_NGUONG_HONG; i++) ghiHong('groq', t)
  assert.equal(dangNghi('groq', t), true, 'du nguong ma khong nghi -> dot han muc mien phi vao nhung lan chac chan hong')
  assert.equal(dangNghi('groq', t + CAU_DAO_NGHI_MS + 1), false, 'nghi vinh vien -> mot su co 60 giay lam mat han nha do')
})

test('⚠️ loi `auth` KHONG tinh vao cau dao', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const kho = {
    groq: nhaGia({ name: 'groq', ket: 'auth' }),
    anthropic: nhaGia({ name: 'anthropic', ket: 'ok' }),
  }
  for (let i = 0; i < CAU_DAO_NGUONG_HONG + 1; i++) await generateStructured(req, ENV_SACH, kho)
  // Khoa go nham la loi cau hinh, khong phai nha do chap chon. Dem no vao cau dao
  // se lam thong bao chuyen thanh "dang nghi" va che mat nguyen nhan that.
  assert.equal(dangNghi('groq'), false)
})

// ── 6. Cau hinh ───────────────────────────────────────────────────
test('thu tu mac dinh lay tu phep do 27/08: groq truoc, claude cuoi', () => {
  assert.deepEqual(thuTuNha({}), ['groq', 'gemini', 'openrouter', 'anthropic'])
})

test('AI_PROVIDER_ORDER doi duoc thu tu, va ten rac thi bo qua chu khong lam sap', () => {
  assert.deepEqual(thuTuNha({ AI_PROVIDER_ORDER: 'gemini,groq' }), ['gemini', 'groq'])
  assert.deepEqual(thuTuNha({ AI_PROVIDER_ORDER: 'gemini, GROQ , gemini' }), ['gemini', 'groq'], 'trung lap/hoa thuong phai duoc chuan hoa')
  assert.deepEqual(thuTuNha({ AI_PROVIDER_ORDER: 'khong-ton-tai' }), ['groq', 'gemini', 'openrouter', 'anthropic'], 'go nham mot o cau hinh khong duoc lam ca trang thoi sinh noi dung')
  assert.deepEqual(thuTuNha({ AI_PROVIDER_ORDER: '   ' }), ['groq', 'gemini', 'openrouter', 'anthropic'])
})

test('ep mot viec dung mot nha cu the', () => {
  assert.equal(nhaEpChoViec('daily-report', { AI_TASK_PROVIDER_daily_report: 'anthropic' }), 'anthropic')
  assert.equal(nhaEpChoViec('daily-report', {}), undefined)
  assert.equal(nhaEpChoViec('daily-report', { AI_TASK_PROVIDER_daily_report: 'rac' }), undefined)
})

test('viec bi ep thi KHONG roi xuong nha khac', async () => {
  imLang(); xoaHetCauDao(); datLaiNganSach()
  const demClaude = { n: 0 }
  await assert.rejects(() => generateStructured(
    { ...req, task: 'daily-report' },
    { AI_TASK_PROVIDER_daily_report: 'groq' },
    { groq: nhaGia({ name: 'groq', ket: 'retryable' }), anthropic: nhaGia({ name: 'anthropic', ket: 'ok', demGoi: demClaude }) },
  ))
  assert.equal(demClaude.n, 0)
})

test('⚠️ o ngan sach go nham khong duoc bien thanh "cam han" hay "vo han"', () => {
  assert.deepEqual(docNganSachTuEnv({}), NGAN_SACH_MAC_DINH)
  assert.deepEqual(docNganSachTuEnv({ AI_PAID_MAX_CALLS: '' }), NGAN_SACH_MAC_DINH)
  assert.deepEqual(docNganSachTuEnv({ AI_PAID_MAX_CALLS: 'abc' }), NGAN_SACH_MAC_DINH, 'Number("abc") la NaN — de lot se thanh "khong bao gio con ngan sach"')
  assert.deepEqual(docNganSachTuEnv({ AI_PAID_MAX_CALLS: '-5' }), NGAN_SACH_MAC_DINH)
  assert.deepEqual(docNganSachTuEnv({ AI_PAID_MAX_CALLS: '0' }), { soLanToiDa: 0 }, 'so 0 la co y: cam han nha tra phi')
  assert.deepEqual(docNganSachTuEnv({ AI_PAID_MAX_CALLS: '7.9' }), { soLanToiDa: 7 })
})

test('model mac dinh phai la ten GOI DUOC, khong phai ten ListModels tra ve', () => {
  // Do 27/08: ListModels liet ke `gemini-2.5-flash*`, nhung :generateContent tra
  // 404 "no longer available to new users" cho dung nhung ten do.
  assert.equal(modelCuaNha('gemini', {}), 'gemini-3.5-flash-lite')
  assert.doesNotMatch(modelCuaNha('gemini', {}), /^gemini-2\./)
  assert.equal(modelCuaNha('gemini', { AI_MODEL_GEMINI: 'gemini-3.6-flash' }), 'gemini-3.6-flash')
})

test('xoay vong khoa: khoa thu hai la mot nguon han muc that su khac', () => {
  assert.deepEqual(khoaCuaNha('groq', { GROQ_API_KEY: 'a', GROQ_API_KEY_2: 'b' }), ['a', 'b'])
  assert.deepEqual(khoaCuaNha('groq', { GROQ_API_KEY_2: 'b' }), ['b'], 'chi co khoa phu thi van phai dung duoc')
  assert.deepEqual(khoaCuaNha('groq', { GROQ_API_KEY: '   ' }), [], 'khoa toan khoang trang = khong co khoa')
})

// ── 7. JSON Schema ────────────────────────────────────────────────
test('⚠️ schema cho Gemini phai sach `$schema` va `additionalProperties` o MOI tang', () => {
  const Long = z.object({
    ten: z.string(),
    trong: z.object({ sau: z.string() }),
    ds: z.array(z.object({ x: z.string() })),
  })
  const s = JSON.stringify(schemaChoGemini(Long))
  // Bo sot o tang trong thi Gemini tra 400 o GOC, rat de doc nham thanh
  // "schema qua phuc tap" va di sua nham cho.
  assert.doesNotMatch(s, /\$schema/)
  assert.doesNotMatch(s, /additionalProperties/)
  assert.match(s, /"sau"/, 'don qua tay lam mat luon truong long ben trong')
  assert.match(s, /"x"/)
})

test('schema cho OpenAI giu nguyen mo ta cua tung truong', () => {
  const s = schemaChoOpenAI(Schema) as { properties: Record<string, { description?: string }> }
  // Mo ta la thu quyet dinh chat luong: bo di thi model doan y nghia theo ten bien.
  assert.equal(s.properties.description.description, 'mo ta')
})

// ── 8. Log ────────────────────────────────────────────────────────
test('⚠️ log KHONG duoc chua prompt hay noi dung sinh ra', async () => {
  xoaHetCauDao(); datLaiNganSach()
  const logs: LogRouter[] = []
  datBoNgheLog(l => logs.push(l))
  await generateStructured(
    { ...req, system: 'BI-MAT-HE-THONG', prompt: 'BI-MAT-NGUOI-DUNG' },
    ENV_SACH,
    { groq: nhaGia({ name: 'groq', ket: 'ok' }) },
  )
  datBoNgheLog(() => {})
  const chu = JSON.stringify(logs)
  // Dataset Sanity cua du an nay la CONG KHAI, va log thi di ra ngoai. Prompt la
  // tai san; noi dung sinh ra co the chua thong tin chua cong bo.
  assert.doesNotMatch(chu, /BI-MAT-HE-THONG/)
  assert.doesNotMatch(chu, /BI-MAT-NGUOI-DUNG/)
  assert.doesNotMatch(chu, /tu groq/, 'noi dung sinh ra khong duoc lot vao log')
  assert.equal(logs.length, 1)
  assert.equal(logs[0].ok, true)
})

// ── 9. Con bug ma 20 test tren KHONG bat duoc ─────────────────────
test('⚠️ nha THAT phai doc `env` truyen vao, khong duoc tu doc process.env', () => {
  // Lan chay that 27/08 lo ra: adapter tu doc `process.env`, nen `AI_MODEL_GROQ`
  // truyen qua `generateStructured(req, env)` KHONG co tac dung gi. Ca 20 test o
  // tren van xanh vi chung dung nha GIA — nha gia khong he cham vao phan doc cau
  // hinh. Day la test duy nhat trong tep nay dung nha THAT.
  assert.equal(taoNhaOpenAI('groq', { GROQ_API_KEY: 'x', AI_MODEL_GROQ: 'model-rieng' }).model(), 'model-rieng')
  assert.equal(taoNhaGemini({ GEMINI_API_KEY: 'x', AI_MODEL_GEMINI: 'gem-rieng' }).model(), 'gem-rieng')

  // Va `isAvailable()` cung phai theo env truyen vao: env rong = khong co khoa,
  // ke ca khi may dang chay co khoa that trong process.env.
  assert.equal(taoNhaOpenAI('groq', {}).isAvailable(), false)
  assert.equal(taoNhaGemini({}).isAvailable(), false)
  assert.equal(taoNhaOpenAI('groq', { GROQ_API_KEY_2: 'chi-co-khoa-phu' }).isAvailable(), true)
})
