// ==== deine Utils bleiben ====
window.$  = (sel, root=document) => root.querySelector(sel);
window.$$ = (sel, root=document) => [...root.querySelectorAll(sel)];

window.getRecipePath = () => {
  const qsId = new URLSearchParams(location.search).get("id");
  if (qsId) return qsId.replace(/^\/+|\/+$/g, "");
  const m = location.pathname.match(/\/recipe-pages\/(.+?)(?:\/index\.html?)?\/?$/);
  return m ? m[1] : null; // z.B. "fruehling/spargelcremesuppe"
};

window.loadJSON = async (url) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
};

// ==== Partials injecten + Navi pflegen ====
(function () {
  const path = location.pathname.replace(/\\/g, "/");
  const isWrapper = path.includes("/recipe-pages/");
  const isSeason  = path.includes("/season-pages/");
  const P = isWrapper ? "../../../" : (isSeason ? "../../" : ""); // Prefix je Tiefe

  async function inject(where, relPath, position) {
    try {
      const res = await fetch(P + relPath, { cache: "no-store" });
      if (!res.ok) return;
      const html = await res.text();
      where.insertAdjacentHTML(position, html);
    } catch {}
  }

  function prefixHeaderLinks() {
    document.querySelectorAll("header a[href]").forEach(a => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (/^(?:https?:)?\/\//i.test(href)) return; // absolute URLs nicht anfassen
      a.setAttribute("href", P + href);
    });
  }

  function markActiveSeason() {
    const m = path.match(/\/(?:recipe-pages|season-pages)\/([^/]+)\//);
    if (!m) return;
    const link = document.querySelector(`header a[data-season="${m[1]}"]`);
    if (link) link.classList.add("active");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await inject(document.body, "partials/header.html", "afterbegin");
    await inject(document.body, "partials/footer.html", "beforeend");
    prefixHeaderLinks();
    markActiveSeason();
  });
})();
