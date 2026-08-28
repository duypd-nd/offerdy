/**
 * TRAN NGAN SACH NGAY — Google Ads Script cho Offerdy.
 *
 * Dan vao: Google Ads -> Tools -> Bulk actions -> Scripts -> dau (+)
 * Dat lich: Hourly (hang gio)
 *
 * VI SAO SCRIPT NAY CHAY BEN GOOGLE chu khong phai ben Offerdy: neu tran dat o
 * phia site thi cron chet la tran bien mat, va ban chi biet khi doc hoa don.
 * Script nay chay tren may chu cua Google, doc lap hoan toan voi site.
 *
 * ⚠️ NO LAM HAI VIEC, va viec thu hai quan trong ngang viec thu nhat:
 *   1. Tieu qua tran trong ngay -> TAT het chien dich, dan nhan
 *   2. Sang ngay moi (chi tieu ve 0) -> BAT LAI dung nhung cai no da tat
 * Thieu viec 2 thi script tat mot lan va chien dich nam im vinh vien — loi pho
 * bien nhat cua loai script nay.
 *
 * ⚠️ NHAN la cach script nho "cai nay do toi tat". Chien dich ban TU TAY tat se
 * khong mang nhan, nen script khong bao gio bat no len. Dung tu dan nhan nay.
 *
 * ⚠️ `getStatsFor('TODAY')` chay theo MUI GIO CUA TAI KHOAN Google Ads, khong
 * phai gio Viet Nam. Dat mui gio tai khoan cho khop voi cach ban doc so.
 *
 * 🚨 VA NO TRA VE TIEN THEO DON VI CUA TAI KHOAN, khong phai USD. Tai khoan
 * Offerdy (610-787-1439) tinh bang DONG, nen tran phai ghi bang DONG. Ghi 5
 * (dinh la "5 do") thi script hieu la 5 DONG va TAT SACH ngay lan chay dau —
 * va no khong bao loi, chi lang le tat. Do la ly do bien duoi ten la `_VND`.
 *
 * API da doi chieu voi tai lieu chinh thuc 28/08/2026:
 *   developers.google.com/google-ads/scripts/docs/examples/campaigns
 *   developers.google.com/google-ads/scripts/docs/features/labels
 */

// ─────────────────────────────────────────────────────────────────────────
// SUA HAI DONG NAY
// ─────────────────────────────────────────────────────────────────────────

/**
 * Tieu qua muc nay TRONG MOT NGAY la tat het. Ghi bang DON VI CUA TAI KHOAN
 * (tai khoan Offerdy dung VND).
 *
 * ⚠️ Day KHONG phai ngan sach ngay — ngan sach ngay dat trong chinh chien dich
 * (dang la 61.561d). Day la HANG RAO CHONG SU CO, nen phai dat CAO HON ngan
 * sach ngay. Google duoc phep tieu toi 2x ngan sach ngay trong mot ngay le
 * (bu lai o ngay khac), nen dat bang dung ngan sach se lam script tat oan
 * gan nhu moi ngay.
 *
 * Goi y: khoang 2,5x ngan sach ngay. Ngan sach 61.561d -> tran 150.000d.
 */
var TRAN_MOI_NGAY_VND = 150000;

/** Email nhan canh bao. De chuoi rong '' neu khong muon nhan mail. */
var EMAIL_CANH_BAO = '';

// ─────────────────────────────────────────────────────────────────────────

var NHAN = 'OFFERDY_TAT_TU_DONG';

function main() {
  baoDamCoNhan();

  var chiHomNay = AdsApp.currentAccount().getStatsFor('TODAY').getCost();  // don vi = tien te cua tai khoan
  Logger.log('Chi tieu hom nay: ' + chiHomNay.toFixed(0) + 'd / tran ' + TRAN_MOI_NGAY_VND + 'd');

  if (chiHomNay >= TRAN_MOI_NGAY_VND) {
    var daTat = tatHetChienDichDangChay();
    Logger.log('VUOT TRAN -> da tat ' + daTat.length + ' chien dich');
    if (daTat.length > 0 && EMAIL_CANH_BAO) {
      MailApp.sendEmail(
        EMAIL_CANH_BAO,
        'Offerdy: da tat quang cao vi vuot tran ngay',
        'Chi tieu hom nay ' + chiHomNay.toFixed(0) + 'd da dat tran ' + TRAN_MOI_NGAY_VND + 'd.\n\n' +
        'Da tat: ' + daTat.join(', ') + '\n\n' +
        'Script se tu bat lai vao ngay mai khi chi tieu ve 0.'
      );
    }
    return;
  }

  // Duoi tran -> bat lai nhung cai CHINH SCRIPT da tat. Sang ngay moi thi
  // `TODAY` ve 0 nen nhanh nay tu chay, khong can hen gio rieng.
  var daBat = batLaiNhungCaiScriptDaTat();
  if (daBat.length > 0) Logger.log('Da bat lai ' + daBat.length + ' chien dich: ' + daBat.join(', '));
}

/** Nhan phai ton tai truoc khi dan — `createLabel` nem loi neu da co. */
function baoDamCoNhan() {
  if (!AdsApp.labels().withCondition('label.name = "' + NHAN + '"').get().hasNext()) {
    AdsApp.createLabel(NHAN);
    Logger.log('Da tao nhan ' + NHAN);
  }
}

function tatHetChienDichDangChay() {
  var ten = [];
  var it = AdsApp.campaigns().withCondition('campaign.status = ENABLED').get();
  while (it.hasNext()) {
    var cd = it.next();
    cd.pause();
    cd.applyLabel(NHAN);   // dan nhan de biet duong bat lai
    ten.push(cd.getName());
  }
  return ten;
}

function batLaiNhungCaiScriptDaTat() {
  var ten = [];
  var rn = resourceNameCuaNhan();
  // Nhan vua duoc tao trong chinh lan chay nay co the chua truy van duoc ngay.
  // Khong co nhan = chua tung tat cai nao = khong co gi de bat lai. Thoat em
  // thay vi nem loi giua chung mot script dang giu tien.
  if (!rn) return ten;

  var it = AdsApp.campaigns()
    .withCondition('campaign.status = PAUSED')
    .withCondition('campaign.labels CONTAINS ANY ("' + rn + '")')
    .get();
  while (it.hasNext()) {
    var cd = it.next();
    cd.enable();
    cd.removeLabel(NHAN);  // go nhan: tu gio ban tat tay thi script khong dung toi
    ten.push(cd.getName());
  }
  return ten;
}

/**
 * Bo loc theo nhan trong bao cao dung RESOURCE NAME chu khong dung ten chu —
 * ghi ten chu vao `campaign.labels CONTAINS ANY` se khong khop gi ca va script
 * se im lang khong bat lai chien dich nao.
 */
function resourceNameCuaNhan() {
  var it = AdsApp.labels().withCondition('label.name = "' + NHAN + '"').get();
  return it.hasNext() ? it.next().getResourceName() : null;
}
