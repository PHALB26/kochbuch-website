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