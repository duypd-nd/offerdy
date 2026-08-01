// Content types
import { dealType } from './deal'
import { storeType } from './store'
import { categoryType } from './category'
import { reviewType } from './review'
import { postType } from './post'
import { offerType } from './offer'
import { pageType } from './page'

// Config singletons
import { configGeneralType } from './configGeneral'
import { configAuthorType } from './configAuthor'
import { configSocialType } from './configSocial'
import { configSEOType } from './configSEO'
import { configContentType } from './configContent'
import { configAdsType } from './configAds'
import { configPersonaType } from './configPersona'

// AI-generated singletons
import { dailyReportType } from './dailyReport'
import { captionLogType } from './captionLog'

// Du lieu do nguoi dung cong khai tao ra
import { couponAlertType } from './couponAlert'

export const schemaTypes = [
  // Content
  dealType, storeType, categoryType, reviewType, postType, offerType, pageType,
  // Config
  configGeneralType, configAuthorType, configSocialType,
  configSEOType, configContentType, configAdsType, configPersonaType,
  // AI-generated
  dailyReportType, captionLogType,
  // Do nguoi dung cong khai tao
  couponAlertType,
]
