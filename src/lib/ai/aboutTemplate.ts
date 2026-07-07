// Renders the site's standard "About the Brand" card layout as a static HTML
// string. Content (text/emoji) comes from the AI; markup/CSS/script are fixed
// here so the AI can never produce malformed HTML or drift from the house style.

export type AboutCard = { icon: string; title: string; text: string }
export type AboutContent = {
  tagline: string
  introBadgeEmoji: string
  introText: string
  productRange: AboutCard
  customerBenefits: AboutCard
  shoppingExperience: AboutCard
  whyChoose: AboutCard
}

// Numeric HTML entity refs (matches the existing site convention) instead of
// raw emoji glyphs, which some editors/CMS pipelines mangle on copy-paste.
function toHtmlEntities(str: string): string {
  return Array.from(str).map(ch => `&#${ch.codePointAt(0)};`).join('')
}

export function renderAboutHtml(storeName: string, about: AboutContent): string {
  const cards = [about.productRange, about.customerBenefits, about.shoppingExperience, about.whyChoose]
  const cardsHtml = cards
    .map((card, i) => `
  <div class="abs-card">
    <div class="abs-card-icon abs-ic${i + 1}">${toHtmlEntities(card.icon)}</div>
    <p class="abs-card-title">${card.title}</p>
    <p class="abs-card-text">${card.text}</p>
  </div>`)
    .join('')

  return `<style>
.abs-wrap{width:100%;box-sizing:border-box;padding:40px 32px 48px;font-family:'Inter',sans-serif;font-size:15px;line-height:1.7;color:#1a1a2e;background:#fff;border:1.5px solid #e8e4f5;border-radius:16px;box-shadow:0 4px 20px rgba(34,139,34,.07)}
.abs-header{text-align:center;margin-bottom:44px}
.abs-eyebrow{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#228B22;background:#eaf8ea;padding:5px 14px;border-radius:100px;margin-bottom:12px}
.abs-title{font-size:clamp(24px,5vw,34px);font-weight:700;line-height:1.2;margin:0 0 8px;color:#1a1a2e}
.abs-title em{font-style:italic;color:#228B22}
.abs-sub{color:#5a5a7a;font-size:14.5px;margin:0}
.abs-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.abs-card{background:#f8fff8;border:1.5px solid #e8e4f5;border-radius:14px;padding:24px 22px;transition:box-shadow .22s,transform .22s}
.abs-card:hover{box-shadow:0 8px 28px rgba(34,139,34,.12);transform:translateY(-2px)}
.abs-card-icon{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px}
.abs-ic1{background:#eaf8ea}.abs-ic2{background:#f0fff0}.abs-ic3{background:#f0fdf4}.abs-ic4{background:#f3fff3}
.abs-card-title{font-size:15px;font-weight:700;color:#1a1a2e;margin:0 0 8px}
.abs-card-text{font-size:13.5px;color:#5a5a7a;line-height:1.7;margin:0}
.abs-intro{background:#f8fff8;border:1.5px solid #e8e4f5;border-radius:14px;padding:24px 26px;margin-bottom:16px;display:flex;gap:18px;align-items:flex-start}
.abs-intro-badge{flex-shrink:0;width:48px;height:48px;border-radius:12px;background:#228B22;display:flex;align-items:center;justify-content:center;font-size:22px}
.abs-intro-text{font-size:14px;color:#5a5a7a;line-height:1.75;margin:0}
.abs-intro-text strong{color:#1a1a2e}
@media(max-width:540px){.abs-grid{grid-template-columns:1fr}.abs-intro{flex-direction:column}}
</style>

<div class="abs-wrap">

<div class="abs-header">
  <div class="abs-eyebrow">About the Brand</div>
  <h2 class="abs-title">About <em>${storeName}</em></h2>
  <p class="abs-sub">${about.tagline}</p>
</div>

<div class="abs-intro">
  <div class="abs-intro-badge">${toHtmlEntities(about.introBadgeEmoji)}</div>
  <p class="abs-intro-text"><strong>${storeName}</strong> ${about.introText}</p>
</div>

<div class="abs-grid">
${cardsHtml}
</div>

</div>

<script>
(function(){
  var el=document.querySelector('.abs-wrap');
  if(!el)return;
  var p=el.parentElement;
  while(p&&p.tagName!=='BODY'){
    p.style.setProperty('border','none','important');
    p.style.setProperty('box-shadow','none','important');
    p.style.setProperty('background','transparent','important');
    p.style.setProperty('border-radius','0','important');
    p.style.setProperty('padding','0','important');
    p=p.parentElement;
  }
})();
</script>`
}
