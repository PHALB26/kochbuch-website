// ===== Utilities (deine Version bleibt erhalten) =====
window.$  = (sel, root=document) => root.querySelector(sel);
window.$$ = (sel, root=document) => [...root.querySelectorAll(sel)];

window.getRecipePath = () => {
  // ?id=fruehling/spargelcremesuppe (Dev-Route bleibt möglich)
  const qsId = new URLSearchParams(location.search).get("id");
  if (qsId) return qsId.replace(/^\/+|\/+$/g, "");

  // Wrapper-Route: /recipe-pages/<season>/<slug>/[index.html]
  const m = location.pathname.match(/\/recipe-pages\/(.+?)(?:\/index\.html?)?\/?$/);
  return m ? m[1] : null; // z.B. "fruehling/spargelcremesuppe"
};

window.loadJSON = async (url) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
};

// ===== Header/Footer-Partial einbinden + Navi aktiv setzen =====
(function (){
  const path = location.pathname.replace(/\\/g, "/");
  const isWrapper = path.includes("/recipe-pages/");
  const isSeason  = path.includes("/season-pages/");
  // Prefix für relative Pfade aus tieferen Verzeichnissen
  const P = isWrapper ? "../../../" : (isSeason ? "../../" : "");

  async function inject(where, htmlPath, position){
    try{
      const res = await fetch(P + htmlPath, { cache: "no-store" });
      if(!res.ok) return;
      const html = await res.text();
      where.insertAdjacentHTML(position, html);
    }catch(_e){}
  }

  function prefixHeaderLinks(){
    // alle internen Links im Header mit Prefix versehen
    $$("#" + "___dummy") // nur um QuerySelectorAll zu „öffnen“
    document.querySelectorAll("header a[data-nav]").forEach(a => {
      const raw = a.getAttribute("href");
      if(!raw) return;
      if(/^(https?:)?\/\//i.test(raw)) return; // absolute URLs nicht ändern
      a.setAttribute("href", P + raw);
    });
  }

  function markActive(){
    const mark = (season) => {
      const link = document.querySelector(`header a[data-season="${season}"]`);
      if(link) link.classList.add("active");
    };
    if (isWrapper){
      const m = path.match(/\/recipe-pages\/([^/]+)\//);
      if(m) mark(m[1]);
    } else if (isSeason){
      const m = path.match(/\/season-pages\/([^/]+)\//);
      if(m) mark(m[1]);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Header ganz oben, Footer ganz unten einfügen
    await inject(document.body, "partials/header.html", "afterbegin");
    await inject(document.body, "partials/footer.html", "beforeend");
    prefixHeaderLinks();
    markActive();
  });
})();
