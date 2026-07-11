'use client'

import { useEffect, useRef, useState } from 'react'

const CSS = `
:root{
  --wine:#2a0713;
  --wine-2:#45091f;
  --rose-red:#ff2e63;
  --hot-pink:#ff5c8a;
  --soft-pink:#ff9bc0;
  --blush:#ffc2d6;
  --gold:#ffd9a0;
  --cream:#fff2f6;
  --glow:#ff4d7d;
}

#kyniem-page{position:relative}
#kyniem-page *{box-sizing:border-box;}
#kyniem-page{
  font-family:"Be Vietnam Pro",system-ui,sans-serif;
  color:var(--cream);
  background:
    radial-gradient(120% 90% at 50% 8%, #6a0e33 0%, var(--wine-2) 42%, var(--wine) 100%);
  overflow-x:hidden;
  min-height:100vh;
  position:relative;
  cursor: pointer;
  touch-action: manipulation;
}

#kyniem-page::before{
  content:"";
  position:fixed;
  inset:-20%;
  background:
    radial-gradient(40% 40% at 20% 25%, rgba(255,46,99,.35), transparent 70%),
    radial-gradient(45% 45% at 82% 20%, rgba(255,155,192,.28), transparent 70%),
    radial-gradient(50% 50% at 50% 100%, rgba(255,92,138,.30), transparent 70%);
  filter:blur(20px);
  animation:washMove 16s ease-in-out infinite alternate;
  z-index:0;
  pointer-events:none;
}
@keyframes washMove{
  0%{transform:translate(-2%, -1%) scale(1);}
  100%{transform:translate(2%, 2%) scale(1.06);}
}

.vignette{
  position:fixed;inset:0;z-index:1;pointer-events:none;
  background:radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(20,3,10,.65) 100%);
}

#hearts, #sparkles, #petals{
  position:fixed;inset:0;z-index:5;pointer-events:none;overflow:hidden;
}

.music-toggle{
  position:fixed;top:16px;right:16px;z-index:20;
  width:44px;height:44px;border-radius:50%;
  border:1px solid rgba(255,194,214,.4);
  background:linear-gradient(160deg, rgba(255,255,255,.18), rgba(255,92,138,.14));
  backdrop-filter:blur(6px);
  color:var(--cream);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 20px rgba(120,0,30,.35);
  cursor:pointer;
  transition:transform .2s ease;
}
.music-toggle:hover{transform:scale(1.08);}
.music-toggle svg{opacity:.55;transition:opacity .2s;}
.music-toggle.playing svg{opacity:1;}
.music-toggle.playing{animation:musicPulse 2s ease-in-out infinite;}
@keyframes musicPulse{
  0%,100%{box-shadow:0 6px 20px rgba(120,0,30,.35), 0 0 0 0 rgba(255,92,138,.45);}
  50%{box-shadow:0 6px 20px rgba(120,0,30,.35), 0 0 0 8px rgba(255,92,138,0);}
}

.scene{
  position:relative;z-index:3;
  min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  padding:60px 22px 90px;
  perspective:1100px;
}

.stage{
  transform-style:preserve-3d;
  transition:transform .35s cubic-bezier(.2,.8,.2,1);
  text-align:center;
  max-width:640px;
}

.eyebrow{
  font-size:clamp(.72rem,2.6vw,.9rem);
  letter-spacing:.42em;
  text-transform:uppercase;
  color:var(--blush);
  font-weight:600;
  transform:translateZ(30px);
  opacity:0;
  animation:rise 1s .2s forwards;
}
.eyebrow::before,.eyebrow::after{
  content:"";display:inline-block;width:34px;height:1px;vertical-align:middle;
  background:linear-gradient(90deg,transparent,var(--soft-pink));
  margin:0 14px;
}
.eyebrow::after{background:linear-gradient(90deg,var(--soft-pink),transparent);}

.heart-hero{
  position:relative;
  width:min(78vw,340px);
  margin:26px auto 6px;
  transform:translateZ(70px);
  opacity:0;
  animation:pop 1.1s .4s cubic-bezier(.18,.9,.25,1.2) forwards;
}
.heart-hero svg{
  display:block;width:100%;height:auto;
  filter:drop-shadow(0 0 26px rgba(255,46,99,.75)) drop-shadow(0 14px 40px rgba(255,92,138,.5));
  animation:beat 2.4s ease-in-out infinite;
  transform-origin:center 62%;
}
.heart-sparkles{
  position:absolute;inset:0;pointer-events:none;
}
.heart-hero .shine{
  mix-blend-mode:screen;
  opacity:.0;
  animation:shimmer 3.4s ease-in-out infinite;
}
.names{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:2px;
  padding-bottom:6%;
}
.names .n{
  font-family:"Dancing Script",cursive;
  font-weight:700;
  color:#fff;
  font-size:clamp(1.5rem,6.4vw,2.4rem);
  line-height:1.05;
  text-shadow:0 2px 14px rgba(120,0,30,.7);
}
.names .amp{
  font-family:"Playfair Display",serif;
  font-style:italic;
  color:var(--gold);
  font-size:clamp(1rem,4vw,1.3rem);
  filter:drop-shadow(0 0 10px rgba(255,217,160,.8));
}

.subtitle{
  font-family:"Playfair Display",serif;
  font-style:italic;
  font-size:clamp(1.15rem,4.6vw,1.7rem);
  color:var(--cream);
  margin-top:18px;
  transform:translateZ(45px);
  opacity:0;animation:rise 1s .7s forwards;
}

.dates{
  margin-top:12px;
  font-size:clamp(.82rem,3vw,.98rem);
  letter-spacing:.24em;
  color:var(--blush);
  transform:translateZ(35px);
  opacity:0;animation:rise 1s .85s forwards;
}
.dates b{color:var(--soft-pink);font-weight:600;}

.counter-label{
  margin-top:34px;
  font-size:.74rem;letter-spacing:.34em;text-transform:uppercase;
  color:var(--soft-pink);
  transform:translateZ(25px);
  opacity:0;animation:rise 1s 1s forwards;
}
.counter{
  margin:14px auto 0;
  display:flex;justify-content:center;flex-wrap:wrap;gap:10px;
  transform:translateZ(50px);
  opacity:0;animation:rise 1s 1.1s forwards;
}
.unit{
  min-width:74px;
  padding:14px 12px 10px;
  border-radius:18px;
  background:linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,92,138,.10));
  border:1px solid rgba(255,194,214,.35);
  box-shadow:0 10px 30px rgba(120,0,30,.4), inset 0 1px 0 rgba(255,255,255,.35);
  backdrop-filter:blur(6px);
}
.unit .num{
  font-family:"Playfair Display",serif;
  font-size:clamp(1.5rem,6vw,2.1rem);
  font-weight:700;
  line-height:1;
  background:linear-gradient(180deg,#fff,var(--blush));
  -webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:0 0 18px rgba(255,155,192,.5);
  font-variant-numeric:tabular-nums;
}
.unit .lab{
  display:block;margin-top:6px;
  font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:var(--blush);
}

.message{
  max-width:440px;margin:34px auto 0;
  font-weight:300;
  font-size:clamp(.95rem,3.4vw,1.05rem);
  line-height:1.8;
  color:#ffe6ee;
  transform:translateZ(30px);
  opacity:0;animation:rise 1s 1.3s forwards;
}
.message .sig{
  display:block;margin-top:14px;
  font-family:"Dancing Script",cursive;font-weight:600;font-size:1.3rem;color:var(--gold);
}
.typecursor{
  display:inline-block;
  width:2px;height:1em;
  background:var(--gold);
  margin-left:2px;
  vertical-align:text-bottom;
  animation:caretBlink .9s steps(1) infinite;
}
@keyframes caretBlink{0%,49%{opacity:1}50%,100%{opacity:0}}

.kyniem-footer{
  position:relative;z-index:3;
  text-align:center;padding:18px 0 34px;
  font-size:.72rem;letter-spacing:.14em;color:rgba(255,194,214,.65);
}
.kyniem-footer .beat-mini{color:var(--rose-red);display:inline-block;animation:beat 1.6s infinite;}

.hint{
  position:fixed;left:0;right:0;bottom:14px;z-index:4;text-align:center;
  font-size:.72rem;letter-spacing:.18em;color:rgba(255,255,255,.55);
  pointer-events:none;
  animation:fadePulse 3s ease-in-out infinite;
}

@keyframes rise{from{opacity:0;transform:translateY(22px) translateZ(0);}to{opacity:1;}}
@keyframes pop{0%{opacity:0;transform:translateZ(70px) scale(.6);}100%{opacity:1;transform:translateZ(70px) scale(1);}}
@keyframes beat{0%,100%{transform:scale(1);}14%{transform:scale(1.12);}28%{transform:scale(1);}42%{transform:scale(1.08);}}
@keyframes shimmer{0%,100%{opacity:0;transform:translateX(-30%);}45%{opacity:.7;}50%{opacity:.75;transform:translateX(30%);}}
@keyframes fadePulse{0%,100%{opacity:.35;}50%{opacity:.8;}}

.fh{
  position:absolute;
  bottom:-60px;
  will-change:transform,opacity;
  animation:floatUp var(--dur,9s) linear forwards;
  filter:drop-shadow(0 0 8px var(--fhc,#ff5c8a));
}
@keyframes floatUp{
  0%{opacity:0;transform:translateY(0) translateX(0) rotate(0deg) scale(.35);}
  10%{opacity:var(--op,.95);}
  30%{transform:translateY(-18vh) translateX(calc(var(--sway,20px) * .35)) rotate(80deg) scale(.95);}
  60%{transform:translateY(-60vh) translateX(var(--sway,20px)) rotate(200deg) scale(1.1);}
  100%{opacity:0;transform:translateY(-110vh) translateX(calc(var(--sway,20px)*-1)) rotate(360deg) scale(.9);}
}

.petal{
  position:absolute;
  top:-40px;
  border-radius:50% 0 50% 50%;
  will-change:transform,opacity;
  animation:petalFall var(--dur,10s) linear forwards;
}
@keyframes petalFall{
  0%{opacity:0;transform:translateY(0) translateX(0) rotate(0deg);}
  8%{opacity:var(--op,.85);}
  50%{transform:translateY(55vh) translateX(var(--sway,40px)) rotate(180deg);}
  92%{opacity:var(--op,.85);}
  100%{opacity:0;transform:translateY(115vh) translateX(calc(var(--sway,40px)*-1)) rotate(360deg);}
}

.fh-tap{
  position:fixed;
  border-radius:50%;
  box-shadow:0 0 18px 6px var(--fhc,#ff5c8a);
  will-change:transform,opacity;
  animation:burstFly var(--dur,1s) cubic-bezier(.15,.7,.3,1) forwards;
}
@keyframes burstFly{
  0%{opacity:0;transform:translate(0,0) scale(.3) rotate(0deg);}
  15%{opacity:1;transform:translate(calc(var(--dx,0px)*.35),calc(var(--dy,0px)*.35)) scale(1.3) rotate(20deg);}
  40%{opacity:1;transform:translate(calc(var(--dx,0px)*.7),calc(var(--dy,0px)*.7)) scale(1.1) rotate(-12deg);}
  70%{opacity:1;transform:translate(calc(var(--dx,0px)*.92),calc(var(--dy,0px)*.92)) scale(1) rotate(4deg);}
  100%{opacity:0;transform:translate(var(--dx,0px),var(--dy,0px)) scale(.6) rotate(20deg);}
}

.spark-tap{
  position:fixed;
  border-radius:50%;
  background:radial-gradient(circle, #fff 0%, rgba(255,217,160,.95) 18%, rgba(255,155,192,.45) 42%, transparent 70%);
  box-shadow:0 0 12px rgba(255,255,255,.9), 0 0 20px rgba(255,217,160,.55);
  animation:sparkTapOnce var(--dur,.8s) ease-out forwards;
}
@keyframes sparkTapOnce{
  0%{opacity:0;transform:scale(.2) translate(0,0) rotate(0deg);}
  30%{opacity:1;transform:scale(1.3) translate(calc(var(--dx,0px)*.4),calc(var(--dy,0px)*.4)) rotate(45deg);}
  100%{opacity:0;transform:scale(.3) translate(var(--dx,0px),var(--dy,0px)) rotate(120deg);}
}

.spark{
  position:absolute;
  border-radius:50%;
  background:radial-gradient(circle, #fff 0%, rgba(255,217,160,.95) 18%, rgba(255,155,192,.45) 42%, transparent 70%);
  box-shadow:0 0 12px rgba(255,255,255,.8), 0 0 22px rgba(255,217,160,.45);
  animation:twinkle var(--td,3s) ease-in-out infinite;
  opacity:0;
}
@keyframes twinkle{
  0%,100%{opacity:0;transform:scale(.3) rotate(0deg);}
  35%{opacity:1;transform:scale(1.1) rotate(20deg);}
  50%{opacity:.85;transform:scale(1.35) rotate(60deg);}
  70%{opacity:1;transform:scale(1) rotate(120deg);}
}

.burst{
  position:fixed;
  z-index:99999;
  pointer-events:none;
  transform:translate(-50%,-50%);
  animation:burstOut .75s ease-out forwards;
}
.burst-dot{
  position:absolute;
  left:50%;
  top:50%;
  width:18px;
  height:18px;
  border-radius:50%;
  background:radial-gradient(circle, #fff 0%, var(--fhc,#ff5c8a) 35%, transparent 72%);
  box-shadow:0 0 18px var(--fhc,#ff5c8a), 0 0 32px rgba(255,255,255,.45);
  transform:translate(-50%,-50%) scale(.2);
  animation:burstDot .75s ease-out forwards;
}
.burst-ring{
  position:absolute;
  left:50%;
  top:50%;
  width:22px;
  height:22px;
  border-radius:50%;
  border:2px solid rgba(255,255,255,.75);
  transform:translate(-50%,-50%) scale(.2);
  animation:burstRing .75s ease-out forwards;
}
@keyframes burstOut{
  0%{opacity:0;}
  10%{opacity:1;}
  100%{opacity:0;}
}
@keyframes burstDot{
  0%{transform:translate(-50%,-50%) scale(.2);}
  100%{transform:translate(-50%,-50%) scale(3.8);}
}
@keyframes burstRing{
  0%{transform:translate(-50%,-50%) scale(.2);opacity:1;}
  100%{transform:translate(-50%,-50%) scale(7);opacity:0;}
}

@media (prefers-reduced-motion: reduce){
  .eyebrow,.heart-hero,.subtitle,.dates,.counter-label,.counter,.message{
    animation:none!important;opacity:1!important;transform:none!important;
  }
  .heart-hero svg{animation:none!important;}
  #kyniem-page::before{animation:none;}
  #hearts .fh,#sparkles .spark{display:none;}
  .fh-tap{animation:burstFly var(--dur,1s) cubic-bezier(.15,.7,.3,1) forwards!important;}
  .spark-tap{animation:sparkTapOnce var(--dur,.8s) ease-out forwards!important;}
  .burst-dot{animation:burstDot .75s ease-out forwards!important;}
  .burst-ring{animation:burstRing .75s ease-out forwards!important;}
  .heart-sparkles .spark{animation:twinkle var(--td,3s) ease-in-out infinite!important;}
  .petal{animation:petalFall var(--dur,10s) linear forwards!important;}
}
.fh-tap{animation:burstFly var(--dur,1s) cubic-bezier(.15,.7,.3,1) forwards!important;}
.spark-tap{animation:sparkTapOnce var(--dur,.8s) ease-out forwards!important;}
.burst-dot{animation:burstDot .75s ease-out forwards!important;}
.burst-ring{animation:burstRing .75s ease-out forwards!important;}
.heart-sparkles .spark{animation:twinkle var(--td,3s) ease-in-out infinite!important;}
.petal{animation:petalFall var(--dur,10s) linear forwards!important;}
`

const HEART_PATH = 'M12 21l-1.45-1.32C5.4 15 2 12 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.5-3.4 6.5-8.55 11.18L12 21z'
const COLORS = ['#ff2e63', '#ff5c8a', '#ff9bc0', '#ffc2d6', '#ffd9a0', '#ff7ab0', '#ff004d']
const PETAL_COLORS = [
  'linear-gradient(135deg,#ffd9e6,#ff9bc0)',
  'linear-gradient(135deg,#ffe9d6,#ffb199)',
  'linear-gradient(135deg,#fff0f5,#ffc2d6)',
  'linear-gradient(135deg,#ffd1e8,#ff6b9d)',
]
const MESSAGE_TEXT =
  'Ba tháng — chưa dài so với cả một đời, nhưng đủ để biết rằng người mình muốn nắm tay, mỗi sớm mai và mỗi hoàng hôn, chính là em. Cảm ơn vì đã chọn nhau.'

export default function KyNiemPage() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const userPausedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [typed, setTyped] = useState('')
  const [showSig, setShowSig] = useState(false)

  function toggleMusic() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      userPausedRef.current = true
      setPlaying(false)
    } else {
      userPausedRef.current = false
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {})
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    function attemptPlay() {
      if (userPausedRef.current || !audio) return
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {})
    }
    attemptPlay()
    window.addEventListener('pointerdown', attemptPlay)
    window.addEventListener('keydown', attemptPlay)
    return () => {
      window.removeEventListener('pointerdown', attemptPlay)
      window.removeEventListener('keydown', attemptPlay)
    }
  }, [])

  useEffect(() => {
    let i = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        i++
        setTyped(MESSAGE_TEXT.slice(0, i))
        if (i >= MESSAGE_TEXT.length) {
          if (interval) clearInterval(interval)
          setShowSig(true)
        }
      }, 30)
    }, 1450)
    return () => {
      clearTimeout(startTimeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function heartSVG(size: number, color: string) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="${HEART_PATH}"/></svg>`
    }

    const hearts = document.getElementById('hearts')
    const timers: ReturnType<typeof setTimeout>[] = []
    let heartInterval: ReturnType<typeof setInterval> | undefined

    function spawnHeart() {
      if (reduce || !hearts) return
      const size = 12 + Math.random() * 42
      const color = COLORS[(Math.random() * COLORS.length) | 0]
      const el = document.createElement('div')
      el.className = 'fh'
      el.style.left = Math.random() * 100 + 'vw'
      el.style.setProperty('--dur', 6 + Math.random() * 6 + 's')
      el.style.setProperty('--sway', ((Math.random() * 120 - 60) | 0) + 'px')
      el.style.setProperty('--op', (0.55 + Math.random() * 0.45).toFixed(2))
      el.style.setProperty('--fhc', color)
      el.innerHTML = heartSVG(size, color)
      hearts.appendChild(el)
      const t = setTimeout(() => el.remove(), 13000)
      timers.push(t)
    }

    if (!reduce) {
      heartInterval = setInterval(spawnHeart, 360)
      for (let i = 0; i < 12; i++) timers.push(setTimeout(spawnHeart, i * 140))
    }

    const petalLayer = document.getElementById('petals')
    let petalInterval: ReturnType<typeof setInterval> | undefined

    function spawnPetal() {
      if (!petalLayer) return
      const size = 10 + Math.random() * 14
      const bg = PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0]
      const el = document.createElement('div')
      el.className = 'petal'
      el.style.left = Math.random() * 100 + 'vw'
      el.style.width = size + 'px'
      el.style.height = size * 0.8 + 'px'
      el.style.background = bg
      el.style.setProperty('--dur', 8 + Math.random() * 6 + 's')
      el.style.setProperty('--sway', ((Math.random() * 140 - 70) | 0) + 'px')
      el.style.setProperty('--op', (0.5 + Math.random() * 0.4).toFixed(2))
      petalLayer.appendChild(el)
      const t = setTimeout(() => el.remove(), 15000)
      timers.push(t)
    }

    {
      petalInterval = setInterval(spawnPetal, 700)
      for (let i = 0; i < 6; i++) timers.push(setTimeout(spawnPetal, i * 300))
    }

    const sparkLayer = document.getElementById('sparkles')
    const sparkEls: HTMLElement[] = []
    if (!reduce && sparkLayer) {
      for (let j = 0; j < 60; j++) {
        const s = document.createElement('div')
        s.className = 'spark'
        const sz = 2 + Math.random() * 5
        s.style.width = sz + 'px'
        s.style.height = sz + 'px'
        s.style.left = Math.random() * 100 + 'vw'
        s.style.top = Math.random() * 100 + 'vh'
        s.style.setProperty('--td', 2 + Math.random() * 3 + 's')
        s.style.animationDelay = Math.random() * 4 + 's'
        sparkLayer.appendChild(s)
        sparkEls.push(s)
      }
    }

    const stage = document.getElementById('stage')
    function onMouseMove(e: MouseEvent) {
      if (!stage) return
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const rx = ((e.clientY - cy) / cy) * -6
      const ry = ((e.clientX - cx) / cx) * 8
      stage.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
    }
    function onMouseLeave() {
      if (stage) stage.style.transform = 'rotateX(0) rotateY(0)'
    }
    const finePointer = !reduce && window.matchMedia('(pointer:fine)').matches
    if (finePointer) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseleave', onMouseLeave)
    }

    function sparkleBurst(x: number, y: number) {
      const b = document.createElement('div')
      b.className = 'burst'
      b.style.left = x + 'px'
      b.style.top = y + 'px'
      const color = COLORS[(Math.random() * COLORS.length) | 0]
      b.style.setProperty('--fhc', color)
      b.innerHTML = '<span class="burst-dot"></span><span class="burst-ring"></span>'
      document.body.appendChild(b)
      const t = setTimeout(() => b.remove(), 800)
      timers.push(t)
    }

    function spawnClickHearts(x: number, y: number) {
      if (!hearts) return
      const count = 7 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6
        const dist = 110 + Math.random() * 100
        const dx = Math.round(Math.cos(angle) * dist)
        const dy = Math.round(Math.sin(angle) * dist)
        const size = 26 + Math.random() * 18
        const color = COLORS[(Math.random() * COLORS.length) | 0]
        const el = document.createElement('div')
        el.className = 'fh-tap'
        el.style.left = x - size / 2 + 'px'
        el.style.top = y - size / 2 + 'px'
        el.style.setProperty('--dx', dx + 'px')
        el.style.setProperty('--dy', dy + 'px')
        el.style.setProperty('--dur', 1.5 + Math.random() * 0.5 + 's')
        el.style.setProperty('--fhc', color)
        el.innerHTML = heartSVG(size, color)
        hearts.appendChild(el)
        const t = setTimeout(() => el.remove(), 2200)
        timers.push(t)
      }
    }

    function spawnClickSparkles(x: number, y: number) {
      if (!hearts) return
      const count = 10
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
        const dist = 40 + Math.random() * 60
        const dx = Math.round(Math.cos(angle) * dist)
        const dy = Math.round(Math.sin(angle) * dist)
        const sz = 5 + Math.random() * 7
        const el = document.createElement('div')
        el.className = 'spark-tap'
        el.style.width = sz + 'px'
        el.style.height = sz + 'px'
        el.style.left = x - sz / 2 + 'px'
        el.style.top = y - sz / 2 + 'px'
        el.style.setProperty('--dx', dx + 'px')
        el.style.setProperty('--dy', dy + 'px')
        el.style.setProperty('--dur', 0.9 + Math.random() * 0.5 + 's')
        hearts.appendChild(el)
        const t = setTimeout(() => el.remove(), 1600)
        timers.push(t)
      }
    }

    function handleTap(e: MouseEvent | TouchEvent) {
      const p = 'touches' in e ? e.touches[0] : (e as MouseEvent)
      if (p) {
        sparkleBurst(p.clientX, p.clientY)
        spawnClickSparkles(p.clientX, p.clientY)
        spawnClickHearts(p.clientX, p.clientY)
      }
    }
    window.addEventListener('pointerdown', handleTap as EventListener)

    const start = new Date(2026, 3, 12, 0, 0, 0)
    const d = document.getElementById('d')
    const h = document.getElementById('h')
    const m = document.getElementById('m')
    const s = document.getElementById('s')
    function pad(v: number) {
      return v < 10 ? '0' + v : '' + v
    }
    function tick() {
      const now = new Date()
      const diff = Math.max(0, now.getTime() - start.getTime())
      const sec = Math.floor(diff / 1000)
      const days = Math.floor(sec / 86400)
      const hrs = Math.floor((sec % 86400) / 3600)
      const mins = Math.floor((sec % 3600) / 60)
      const secs = sec % 60
      if (d) d.textContent = String(days)
      if (h) h.textContent = pad(hrs)
      if (m) m.textContent = pad(mins)
      if (s) s.textContent = pad(secs)
    }
    tick()
    const tickInterval = setInterval(tick, 1000)

    return () => {
      if (heartInterval) clearInterval(heartInterval)
      if (petalInterval) clearInterval(petalInterval)
      clearInterval(tickInterval)
      timers.forEach(clearTimeout)
      if (hearts) hearts.innerHTML = ''
      if (petalLayer) petalLayer.innerHTML = ''
      if (sparkLayer) sparkEls.forEach((el) => el.remove())
      if (finePointer) {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseleave', onMouseLeave)
      }
      window.removeEventListener('pointerdown', handleTap as EventListener)
    }
  }, [])

  return (
    <div id="kyniem-page">
      <title>Đức Duy &amp; Hồng Nhung — Kỷ niệm 3 tháng</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Be+Vietnam+Pro:wght@300;400;600&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="vignette" />
      <div id="hearts" aria-hidden="true" />
      <div id="sparkles" aria-hidden="true" />
      <div id="petals" aria-hidden="true" />

      <audio ref={audioRef} src="/kyniem-song.mp3" loop preload="none" />
      <button
        type="button"
        className={`music-toggle${playing ? ' playing' : ''}`}
        onClick={toggleMusic}
        aria-label={playing ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21s4.5-2.01 4.5-4.5V7h4V3h-7z" />
        </svg>
      </button>

      <main className="scene">
        <div className="stage" id="stage">
          <p className="eyebrow">Kỷ niệm 3 tháng yêu thương</p>

          <div className="heart-hero">
            <svg viewBox="0 0 100 92" role="img" aria-label="Trái tim Đức Duy và Hồng Nhung">
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ff6b9d" />
                  <stop offset="55%" stopColor="#ff2e63" />
                  <stop offset="100%" stopColor="#c9124a" />
                </linearGradient>
                <radialGradient id="hl" cx="35%" cy="28%" r="45%">
                  <stop offset="0" stopColor="#ffd9e6" stopOpacity=".9" />
                  <stop offset="100%" stopColor="#ffd9e6" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="sh" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset="50%" stopColor="#fff" stopOpacity=".85" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <clipPath id="hclip">
                  <path d="M50 86 C50 86 8 58 8 30 C8 15 19 7 31 7 C40 7 46 12 50 19 C54 12 60 7 69 7 C81 7 92 15 92 30 C92 58 50 86 50 86 Z" />
                </clipPath>
              </defs>
              <path
                d="M50 86 C50 86 8 58 8 30 C8 15 19 7 31 7 C40 7 46 12 50 19 C54 12 60 7 69 7 C81 7 92 15 92 30 C92 58 50 86 50 86 Z"
                fill="url(#hg)"
              />
              <ellipse cx="36" cy="28" rx="26" ry="18" fill="url(#hl)" />
              <g clipPath="url(#hclip)">
                <rect className="shine" x="-40" y="0" width="40" height="92" fill="url(#sh)" />
              </g>
            </svg>
            <div className="names">
              <span className="n">Đức Duy</span>
              <span className="amp">&amp;</span>
              <span className="n">Hồng Nhung</span>
            </div>
            <div className="heart-sparkles" aria-hidden="true">
              <span className="spark" style={{ top: '16%', left: '28%', width: 6, height: 6, animationDelay: '0s' }} />
              <span className="spark" style={{ top: '10%', left: '60%', width: 5, height: 5, animationDelay: '.7s' }} />
              <span className="spark" style={{ top: '34%', left: '80%', width: 7, height: 7, animationDelay: '1.4s' }} />
              <span className="spark" style={{ top: '58%', left: '15%', width: 5, height: 5, animationDelay: '2s' }} />
              <span className="spark" style={{ top: '72%', left: '55%', width: 6, height: 6, animationDelay: '.4s' }} />
              <span className="spark" style={{ top: '46%', left: '46%', width: 8, height: 8, animationDelay: '1.1s' }} />
              <span className="spark" style={{ top: '25%', left: '46%', width: 5, height: 5, animationDelay: '1.8s' }} />
              <span className="spark" style={{ top: '64%', left: '80%', width: 6, height: 6, animationDelay: '.9s' }} />
            </div>
          </div>

          <p className="subtitle">Ba tháng — và mãi về sau</p>
          <p className="dates">
            <b>12.04.2026</b> &nbsp;—&nbsp; <b>12.07.2026</b>
          </p>

          <p className="counter-label">Chúng mình đã bên nhau</p>
          <div className="counter" id="counter" aria-live="polite">
            <div className="unit">
              <span className="num" id="d">0</span>
              <span className="lab">Ngày</span>
            </div>
            <div className="unit">
              <span className="num" id="h">0</span>
              <span className="lab">Giờ</span>
            </div>
            <div className="unit">
              <span className="num" id="m">0</span>
              <span className="lab">Phút</span>
            </div>
            <div className="unit">
              <span className="num" id="s">0</span>
              <span className="lab">Giây</span>
            </div>
          </div>

          <p className="message">
            {typed}
            {!showSig && <span className="typecursor" aria-hidden="true" />}
            {showSig && <span className="sig">Yêu em ♥</span>}
          </p>
        </div>
      </main>

      <p className="kyniem-footer">
        Made with <span className="beat-mini">♥</span> &nbsp;•&nbsp; Đức Duy &amp; Hồng Nhung
      </p>
      <p className="hint">Chạm vào màn hình để thả tim ♥</p>
    </div>
  )
}
