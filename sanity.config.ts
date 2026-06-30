import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './sanity/schemaTypes'

const CONFIG_SINGLETONS = [
  'configGeneral', 'configAuthor', 'configSocial',
  'configSEO', 'configContent', 'configAds',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function singleton(S: any, name: string, title: string, icon: string) {
  return S.listItem()
    .title(`${icon} ${title}`)
    .id(name)
    .child(
      S.document()
        .schemaType(name)
        .documentId(name)
        .title(title)
    )
}

export default defineConfig({
  name: 'offerdy',
  title: 'Offerdy CMS',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  basePath: '/studio',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Offerdy CMS')
          .items([
            // ── NỘI DUNG ──────────────────────────────────────────
            S.listItem()
              .title('📦 Nội dung')
              .child(
                S.list()
                  .title('Nội dung')
                  .items([
                    S.listItem().title('⚡ Deals').schemaType('deal').child(S.documentTypeList('deal').title('Deals')),
                    S.listItem().title('🎁 Offers theo Store').schemaType('offer').child(
                      S.documentTypeList('offer')
                        .title('Offers theo Store')
                        .defaultOrdering([{ field: 'active', direction: 'desc' }, { field: '_createdAt', direction: 'desc' }])
                    ),
                    S.listItem().title('🏪 Stores').schemaType('store').child(S.documentTypeList('store').title('Stores')),
                    S.listItem().title('🗂️ Categories').schemaType('category').child(S.documentTypeList('category').title('Categories')),
                    S.listItem().title('⭐ Reviews').schemaType('review').child(S.documentTypeList('review').title('Reviews')),
                    S.listItem().title('✍️ Blog Posts').schemaType('post').child(S.documentTypeList('post').title('Blog Posts')),
                  ])
              ),

            S.divider(),

            // ── HỆ THỐNG ──────────────────────────────────────────
            S.listItem()
              .title('⚙️ Hệ thống')
              .child(
                S.list()
                  .title('Quản lý cấu hình')
                  .items([
                    singleton(S, 'configGeneral', 'Cấu hình chung', '🌐'),
                    singleton(S, 'configAuthor', 'Cấu hình tác giả', '👤'),
                    singleton(S, 'configSocial', 'Cấu hình mạng xã hội', '📱'),
                    singleton(S, 'configSEO', 'Cấu hình SEO', '🔍'),
                    singleton(S, 'configContent', 'Cấu hình nội dung', '📄'),
                    singleton(S, 'configAds', 'Cấu hình Ads', '📢'),
                  ])
              ),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    templates: (prev) =>
      prev.filter(({ schemaType }) => !CONFIG_SINGLETONS.includes(schemaType)),
  },
})
