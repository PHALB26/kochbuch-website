/* ===========================
   Veganes Jahreszeiten-Kochbuch – Cookmode & Scaling
   =========================== */

/* Helpers (scoped) */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const NBSP = "\u00A0";

function parseNum(x){ if(typeof x==="number") return x; if(x==null) return NaN; return parseFloat(String(x).trim().replace(",", ".")); }
function isIntLike(n){ return Math.abs(n - Math.round(n)) < 1e-9; }
function formatNum(n){ if(isIntLike(n)) return String(Math.round(n)); const r=Math.round(n*10)/10; return String(r).replace(".", ","); }
function pluralize(sing, plur, amt){ if(!sing) return ""; if(!plur) return sing; const n=Number(amt); return (n>1)?plur:sing; }

/* ===========================
   Seitenskalierung (außer Kochmodus)
   =========================== */
let currentPortions = 4;

/* Basis-Portionen IMMER dynamisch aus dem DOM lesen (falls recipe.js später rendert) */
function getBasePortions(){
  const z = $("#zutaten");
  const s = $("#zubereitung");
  if (z?.dataset?.originalPortions) return parseInt(z.dataset.originalPortions,10);
  if (s?.dataset?.originalPortions) return parseInt(s.dataset.originalPortions,10);
  return 4;
}

function updatePortionText(){
  const el = $("#portion-text"); if(!el) return;
  const sing = el.dataset.unitSingular || "Portion";
  const plur = el.dataset.unitPlural || "Portionen";
  el.textContent = `${currentPortions} ${currentPortions===1?sing:plur}`;
}

/* Zutaten-Scaling mit optionalen word-singular/plural */
function scaleIngredientsPage(){
  const ul = $("#zutaten");
  if(!ul) return;
  const factor = currentPortions / getBasePortions();
  $$("#zutaten li").forEach(li=>{
    if(li.hasAttribute("data-no-scale")) return;
    const base = parseNum(li.dataset.base);
    if(Number.isNaN(base)) return;

    const unit = li.dataset.unit || "";
    const wSing = li.dataset.wordSingular || "";
    const wPlur = li.dataset.wordPlural || "";
    const originalText = li.dataset.originalText || "";

    const scaled = base * factor;
    const numStr = formatNum(scaled);

    const unitPart = wSing
      ? (" " + pluralize(wSing, wPlur, scaled))
      : (unit ? NBSP + unit : "");

    li.textContent = `${numStr}${unitPart} ${originalText}`.trim();
  });
}

function scaleInlinePage(root=null){
  const scope = root || document;                // robust gegen null
  const factor = currentPortions / getBasePortions();
  $$(".scaled", scope).forEach(span=>{
    const base = parseNum(span.dataset.base);
    if(Number.isNaN(base)) return;
    const unit = span.dataset.unit || "";
    const wSing = span.dataset.wordSingular || "";
    const wPlur = span.dataset.wordPlural || "";
    const scaled = base * factor;
    const numStr = formatNum(scaled);
    span.textContent = `${numStr}${unit?NBSP+unit:""}${wSing?(" "+pluralize(wSing,wPlur,scaled)):""}`.trim();
  });
}

function mirrorSteps(){
  const z = $("#zubereitung");
  const m = $("#steps");
  if(!z || !m) return;
  m.innerHTML = z.innerHTML;
}

function scaleAllPage(){
  scaleIngredientsPage();
  scaleInlinePage($("#zubereitung"));   // falls noch nicht da, passiert dank scope-Fallback nichts
  mirrorSteps();
}

function changePortion(delta){
  currentPortions = Math.max(1, (currentPortions||1) + delta);
  updatePortionText();
  scaleAllPage();
}

function copyIngredients(){
  const ul = $("#zutaten"); if(!ul) return;
  const parts=[]; let block="";
  ul.childNodes.forEach(n=>{
    if(n.tagName==="H4"){ block = n.textContent.trim(); parts.push(`\n${block}:`); }
    else if(n.tagName==="LI"){ parts.push(`• ${n.textContent.trim()}`); }
  });
  const text = parts.join("\n").trim();
  navigator.clipboard.writeText(text).then(
    ()=>alert("Zutaten wurden kopiert."),
    ()=>{
      const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); alert("Zutaten wurden kopiert."); }catch{ alert("Kopieren nicht möglich."); }
      ta.remove();
    }
  );
}

/* ===========================
   Kochmodus – eigener Zustand
   =========================== */
let cookSeq = [];
let cookIndex = 0;
const _timerRegistry = [];

const cookState = {
  portions: null,
  basePortions: 4
};

/* Scaling nur innerhalb eines Roots (Kochmodus) */
function cook_scaleIngredientsIn(root){
  if(!root) return;
  const factor = (cookState.portions||cookState.basePortions) / cookState.basePortions;
  $$("li[data-base]", root).forEach(li=>{
    if(li.hasAttribute("data-no-scale")) return;
    const base = parseNum(li.dataset.base);
    if(Number.isNaN(base)) return;

    const unit = li.dataset.unit || "";
    const wSing = li.dataset.wordSingular || "";
    const wPlur = li.dataset.wordPlural || "";
    const originalText = li.dataset.originalText || "";

    const scaled = base * factor;
    const numStr = formatNum(scaled);

    const unitPart = wSing
      ? (" " + pluralize(wSing, wPlur, scaled))
      : (unit ? NBSP + unit : "");

    li.textContent = `${numStr}${unitPart} ${originalText}`.trim();
  });
}

function cook_scaleInlineIn(root){
  if(!root) return;
  const factor = (cookState.portions||cookState.basePortions) / cookState.basePortions;
  $$(".scaled", root).forEach(span=>{
    const base = parseNum(span.dataset.base);
    if(Number.isNaN(base)) return;
    const unit = span.dataset.unit || "";
    const wSing = span.dataset.wordSingular || "";
    const wPlur = span.dataset.wordPlural || "";
    const scaled = base * factor;
    const numStr = formatNum(scaled);
    span.textContent = `${numStr}${unit?NBSP+unit:""}${wSing?(" "+pluralize(wSing,wPlur,scaled)):""}`.trim();
  });
}

function cook_applyScalingIn(root){ cook_scaleIngredientsIn(root); cook_scaleInlineIn(root); }

/* Kochmodus-Portionsleiste (±) */
function cook_buildServingsBar(){
  const wrap = document.createElement("div");
  wrap.className = "cook-servings-bar";

  const btnMinus = document.createElement("button");
  btnMinus.type="button"; btnMinus.className="cook-servings-btn"; btnMinus.textContent="−";

  const label = document.createElement("span");
  label.className="cook-servings-text";

  const btnPlus = document.createElement("button");
  btnPlus.type="button"; btnPlus.className="cook-servings-btn"; btnPlus.textContent="+";

  function setVal(v){
    v = Math.max(1, parseInt(v,10) || 1);
    cookState.portions = v;
    label.textContent = `${v} ${v===1?"Portion":"Portionen"}`;
    const root = document.getElementById("modal-content");
    if(root) cook_applyScalingIn(root);
  }

  btnMinus.addEventListener("click", ()=> setVal((cookState.portions||cookState.basePortions)-1));
  btnPlus.addEventListener("click", ()=> setVal((cookState.portions||cookState.basePortions)+1));

  setVal(cookState.portions || cookState.basePortions);
  wrap.append(btnMinus, label, btnPlus);
  return wrap;
}

/* Sequenz bauen aus DOM (jeweils frische Clones) */
function buildCookSequence(){
  cookSeq = [];
  const uten = $("#utensilien"); if(uten) cookSeq.push({type:"list", title:"Utensilien", node: uten.cloneNode(true)});
  const zut  = $("#zutaten");    if(zut)  cookSeq.push({type:"list", title:"Zutaten",   node: zut.cloneNode(true)});
  const steps = $("#zubereitung");
  if(steps){ $$("#zubereitung li").forEach((li,i)=> cookSeq.push({type:"step", title:`Schritt ${i+1}`, node: li.cloneNode(true)})); }
}

/* Wake Lock nur im Kochmodus */
let _wakeLock = null;
async function requestWakeLock(){
  try{
    if("wakeLock" in navigator){
      _wakeLock = await navigator.wakeLock.request("screen");
      document.addEventListener("visibilitychange", async ()=>{
        if(document.visibilityState==="visible" && _wakeLock===null){
          try{ _wakeLock = await navigator.wakeLock.request("screen"); }catch{}
        }
      });
    }
  }catch(e){ console.warn("WakeLock nicht verfügbar/verweigert:", e); }
}
async function releaseWakeLock(){ try{ if(_wakeLock){ await _wakeLock.release(); _wakeLock=null; } }catch(e){ console.warn(e); } }

/* Kochmodus-Schriftgröße (nur im Modal) */
function applyCookFontSize(pct){
  const px = 16 * pct / 100;
  document.documentElement.style.setProperty("--cook-font-size", px+"px");
  const ind = document.querySelector(".cook-fs-controls .fs-indicator"); if(ind) ind.textContent = pct+"%";
}
function injectCookFSControls(){
  const modalInner = $("#cookmode .modal-inner");
  if(!modalInner || modalInner.querySelector(".cook-fs-controls")) return;
  let pct = 100; // Start immer 100%
  const box = document.createElement("div");
  box.className="cook-fs-controls";
  box.innerHTML = `
    <button type="button" data-fs="down" aria-label="Schrift kleiner">A−</button>
    <span class="fs-indicator" aria-live="polite">${pct}%</span>
    <button type="button" data-fs="up" aria-label="Schrift größer">A+</button>
    <button type="button" data-fs="reset" aria-label="Zurücksetzen">100%</button>
  `;
  box.addEventListener("click", (e)=>{
    const b = e.target.closest("button[data-fs]"); if(!b) return;
    const m = b.getAttribute("data-fs");
    if(m==="down")  pct = Math.max(90,  pct-10);
    if(m==="up")    pct = Math.min(180, pct+10);
    if(m==="reset") pct = 100;
    applyCookFontSize(pct);
  });

  const anchor = $("#step-progress");
  if (anchor) modalInner.insertBefore(box, anchor); else modalInner.appendChild(box);
  applyCookFontSize(pct);
}
function cleanupCookmodeEnhancements(){
  const box = document.querySelector(".cook-fs-controls");
  if (box) box.remove();
  document.documentElement.classList.remove("cook-zoom");
  document.documentElement.style.removeProperty("--cook-font-size");
  releaseWakeLock();
}

/* Modal-Flow */
function openModal(){ $("#cookmode").style.display="flex"; }

function closeModal(){
  // Timer sauber stoppen
  _timerRegistry.forEach(fn=>{ try{ fn(); }catch{} }); _timerRegistry.length=0;

  // UI schließen & resetten
  $("#cookmode").style.display="none";
  const content=$("#modal-content"); if(content) content.innerHTML="";
  const title=$("#modal-title"); if(title) title.textContent="";
  const ring=$("#step-progress .progress"); if(ring) ring.style.strokeDashoffset="314";
  const cnt=$("#step-count"); if(cnt) cnt.textContent="0/0";

  // State zurücksetzen
  cookSeq=[]; cookIndex=0; cookState.portions=null;

  cleanupCookmodeEnhancements();
}
function closeDoneModal(){ $("#done-modal").style.display="none"; closeModal(); }

function renderCookStep(){
  const total = cookSeq.length;
  if(cookIndex>=total){ $("#cookmode").style.display="none"; $("#done-modal").style.display="flex"; return; }

  const item = cookSeq[cookIndex];
  $("#modal-title").textContent = item.title;
  const content = $("#modal-content");

  // Vorherige Timer stoppen
  if(_timerRegistry.length){ _timerRegistry.forEach(fn=>{ try{ fn(); }catch{} }); _timerRegistry.length=0; }

  content.innerHTML = "";

  if(item.type==="list"){
    const hasIngredients = !!item.node.querySelector("li[data-base]");
    if(hasIngredients){ content.appendChild(cook_buildServingsBar()); }
    content.appendChild(item.node);
  }else{
    const p=document.createElement("p");
    p.style.fontSize="1.05rem";
    p.style.lineHeight="1.6";
    p.appendChild(item.node);
    content.appendChild(p);
    initStepTimers(content); // Timer nur in Schritten
  }

  // nach dem Einfügen sicher skalieren
  cook_applyScalingIn(content);

  /* --- Fortschritt NUR über Schritte berechnen --- */
  const totalSteps = cookSeq.filter(x => x.type === "step").length;
  const currentStepIndex = cookSeq.slice(0, cookIndex + 1).filter(x => x.type === "step").length;

  const ring = $("#step-progress .progress");
  const circ = 2*Math.PI*50; // r=50 im SVG
  const progress = totalSteps ? (currentStepIndex / totalSteps) : 0;
  if(ring){
    ring.style.strokeDasharray = `${circ}`;
    ring.style.strokeDashoffset = `${circ*(1-progress)}`;
  }
  $("#step-count").textContent = `${currentStepIndex}/${totalSteps}`;
}

function prevStep(){ if(cookIndex>0){ cookIndex--; renderCookStep(); } }
function nextStep(){ cookIndex++; renderCookStep(); }

/* Start des Kochmodus */
function startCookingMode(){
  requestWakeLock();

  // Harter Reset
  const content = $("#modal-content"); if(content) content.innerHTML = "";
  const title   = $("#modal-title");   if(title)   title.textContent = "";
  const ring    = $("#step-progress .progress"); if(ring) ring.style.strokeDashoffset = "314";
  const cnt     = $("#step-count");    if(cnt)     cnt.textContent = "0/0";
  cookSeq = []; cookIndex = 0;

  // Setup
  cleanupCookmodeEnhancements();
  document.documentElement.classList.add("cook-zoom");
  injectCookFSControls();
  applyCookFontSize(100); // immer 100% Start

  // Reflow, damit Rem-Kaskade sicher greift
  requestAnimationFrame(() => document.documentElement.offsetHeight);

  // Portionen im Kochmodus
  cookState.basePortions = getBasePortions();
  cookState.portions = currentPortions || cookState.basePortions;

  buildCookSequence();
  cookIndex=0;
  openModal();
  renderCookStep();
}

/* Expose für Inline-Handler */
window.changePortion = changePortion;
window.copyIngredients = copyIngredients;
window.startCookingMode = startCookingMode;
window.prevStep = prevStep;
window.nextStep = nextStep;
window.closeModal = closeModal;
window.closeDoneModal = closeDoneModal;

/* ===========================
   Timer nur im Kochmodus
   =========================== */
(function(){
  const SOUND_KEY="vjkb_timer_sound";
  const isSound=()=> (localStorage.getItem(SOUND_KEY) ?? "1") === "1";
  const setSound=v => localStorage.setItem(SOUND_KEY, v?"1":"0");

  function fmt(sec){
    sec=Math.max(0,Math.floor(sec));
    const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
    const mm=h?String(m).padStart(2,"0"):String(m), ss=String(s).padStart(2,"0");
    return h?`${h}:${mm}:${ss}`:`${mm}:${ss}`;
  }
  function parseVal(attr){
    if(!attr) return NaN;
    const raw=String(attr).trim();
    if(/^\d+$/.test(raw)) return parseInt(raw,10);
    const p=raw.split(":").map(n=>parseInt(n,10));
    if(p.some(n=>Number.isNaN(n))) return NaN;
    if(p.length===2) return p[0]*60+p[1];
    if(p.length===3) return p[0]*3600+p[1]*60+p[2];
    return NaN;
  }
  function alarm(){
    if(!isSound()) return {start(){},stop(){}};
    const el=$("#timer-audio");
    if(el){
      el.loop=true;
      return {
        start(){ try{ el.currentTime=0; el.play().catch(()=>{});}catch{} },
        stop(){ try{ el.pause(); el.currentTime=0; }catch{} }
      };
    }
    const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return {start(){},stop(){}};
    const ctx=new Ctx(); let int=null;
    function beep(){
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type="sine"; o.frequency.value=880; g.gain.value=0.0001;
      o.connect(g).connect(ctx.destination); o.start();
      const t=ctx.currentTime; g.gain.exponentialRampToValueAtTime(0.25,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.35);
      o.stop(t+0.4);
    }
    return { start(){ if(!int){ beep(); int=setInterval(beep,900);} }, stop(){ if(int){ clearInterval(int); int=null; try{ctx.close();}catch{} } } };
  }
  function attach(panel,total){
    const display=panel.querySelector(".timer-display");
    const bStart =panel.querySelector(".timer-start");
    const bPause =panel.querySelector(".timer-pause");
    const bReset =panel.querySelector(".timer-reset");
    const bSound =panel.querySelector(".timer-sound");

    let remaining=total, running=false, tick=null, al=null;

    const render =()=> display.textContent = fmt(remaining);
    const cleanup=()=>{ try{ if(tick) clearInterval(tick);}catch{} tick=null; running=false; if(al){ try{al.stop();}catch{} } al=null; };
    const reset  =()=>{ cleanup(); remaining=total; panel.classList.remove("running","finished","paused"); bStart.disabled=false; bPause.disabled=true; render(); };
    const start  =()=>{ if(running) return; running=true; panel.classList.add("running"); bStart.disabled=true; bPause.disabled=false;
      const end = Date.now()+remaining*1000;
      tick = setInterval(()=>{ remaining=Math.max(0, Math.round((end-Date.now())/1000)); render();
        if(remaining<=0){ clearInterval(tick); tick=null; running=false; panel.classList.remove("running"); panel.classList.add("finished"); bStart.disabled=false; bPause.disabled=true; al=alarm(); al.start(); }
      },250);
    };
    const pause  =()=>{ if(!running) return; running=false; panel.classList.remove("running"); bStart.disabled=false; bPause.disabled=true; if(tick) clearInterval(tick); tick=null; };

    bStart.addEventListener("click", start);
    bPause.addEventListener("click", pause);
    bReset.addEventListener("click", reset);

    function updateSound(){
      if(isSound()){
        bSound.textContent="🔊"; bSound.title="Ton aus"; bSound.setAttribute("aria-label","Ton ausschalten");
      }else{
        bSound.textContent="🔇"; bSound.title="Ton an";  bSound.setAttribute("aria-label","Ton einschalten");
      }
    }
    bSound.addEventListener("click", ()=>{ const n=!isSound(); setSound(n); if(!n && al){ try{al.stop();}catch{} } updateSound(); });
    updateSound();

    render(); bPause.disabled=true;
    _timerRegistry.push(()=>cleanup());
  }
  function panel(seconds){
    const d=document.createElement("div");
    d.className="timer-panel";
    d.innerHTML=`
      <div class="timer-display">00:00</div>
      <div class="timer-buttons">
        <button type="button" class="timer-start btn-primary">Start</button>
        <button type="button" class="timer-pause">Pause</button>
        <button type="button" class="timer-reset">Reset</button>
        <button type="button" class="timer-sound icon-btn" aria-label="Ton umschalten">🔊</button>
      </div>`;
    attach(d, seconds);
    return d;
  }
  function initStepTimers(root){
    if(!root) return;
    root.querySelectorAll("li[data-timer]").forEach(li=>{
      if(li.querySelector(".timer-panel")) return;
      const sec = parseVal(li.getAttribute("data-timer")); if(!Number.isFinite(sec) || sec<=0) return;
      const target = li.querySelector(".step-text") || li;
      const p = panel(sec); p.style.marginTop="12px"; target.appendChild(p);
    });
  }
  window.initStepTimers = initStepTimers;
})();

/* ===========================
   Back-to-Top + Initialisierung
   =========================== */
document.addEventListener("DOMContentLoaded", ()=>{
  // Seiten-Portion initialisieren (aus sichtbarem Text, sonst Basis)
  const pt = $("#portion-text"); 
  if(pt){ const m=pt.textContent.match(/\d+/); currentPortions = m?parseInt(m[0],10):getBasePortions(); }
  else { currentPortions = getBasePortions(); }

  updatePortionText();
  // kurze Verzögerung, damit recipe.js DOM sicher eingefügt hat
  requestAnimationFrame(()=> scaleAllPage());

  // X-Buttons: falls mal ohne Inline-Handler
  const x1 = $("#cookmode .modal-close"); if(x1) x1.addEventListener("click", e=>{ e.preventDefault(); closeModal(); });
  const x2 = $("#done-modal .modal-close"); if(x2) x2.addEventListener("click", e=>{ e.preventDefault(); closeDoneModal(); });

  const backToTopBtn = $("#backToTop");
  if(backToTopBtn){
    window.addEventListener("scroll", ()=>{ backToTopBtn.style.display = (window.scrollY>400)?"block":"none"; });
    backToTopBtn.addEventListener("click", ()=> window.scrollTo({top:0,behavior:"smooth"}));
  }
});
