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

export const schemaTypes = [
  // Content
  dealType, storeType, categoryType, reviewType, postType, offerType, pageType,
  // Config
  configGeneralType, configAuthorType, configSocialType,
  configSEOType, configContentType, configAdsType,
]
