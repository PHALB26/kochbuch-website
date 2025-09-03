function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function getSlug(){ return new URLSearchParams(location.search).get("id"); }

async function loadRecipe(){
  const slug = getSlug();
  const titleEl = qs("#recipe-title");
  if(!slug){ titleEl.textContent = "Kein Rezept ausgewählt."; return; }

  try{
    const res = await fetch(`data/recipes/${slug}.json`, {cache:"no-store"});
    if(!res.ok) throw new Error(`Fehler: ${res.status}`);
    const r = await res.json();

    // Hero
    titleEl.textContent = r.title ?? slug;
    qs("#recipe-intro").textContent = r.intro ?? "";

    const meta = qs("#meta-bar");
    meta.innerHTML = "";
    (r.meta ?? []).forEach(m => {
      const span = document.createElement("span");
      span.className = "meta-pill";
      span.textContent = m;
      meta.appendChild(span);
    });

    // Hero-Bild (optional: r.image)
    if(r.image){
      qs("#hero-image").innerHTML = `<img src="${r.image}" alt="${r.title ?? ''}">`;
      qsa("#hero-image img")[0].style = "width:100%;height:100%;object-fit:cover;";
    }

    // Zutaten
    const ingUl = qs("#ingredients");
    ingUl.innerHTML = "";
    (r.ingredients ?? []).forEach(txt => {
      const li = document.createElement("li");
      li.textContent = txt; ingUl.appendChild(li);
    });

    // Steps
    const stepsOl = qs("#steps");
    stepsOl.innerHTML = "";
    (r.steps ?? []).forEach(txt => {
      const li = document.createElement("li");
      li.textContent = txt; stepsOl.appendChild(li);
    });

    // Copy-Button
    qs("#copy-ingredients")?.addEventListener("click", async () => {
      const lines = (r.ingredients ?? []).join("\n");
      await navigator.clipboard.writeText(lines);
      const b = qs("#copy-ingredients");
      const old = b.textContent;
      b.textContent = "Kopiert!";
      setTimeout(()=> b.textContent = old, 1200);
    });

  }catch(e){
    titleEl.textContent = "Rezept konnte nicht geladen werden.";
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", loadRecipe);
