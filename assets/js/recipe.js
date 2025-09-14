// assets/js/recipe.js

function spanScaled(o){
  const s = document.createElement("span");
  s.className = "scaled";
  s.dataset.base = o.base;
  if (o.unit) s.dataset.unit = o.unit;
  if (o.wordSingular) s.dataset.wordSingular = o.wordSingular;
  if (o.wordPlural) s.dataset.wordPlural = o.wordPlural;

  // Startanzeige (Basiswert) – Cookmode skaliert später dynamisch
  let txt = String(o.base);
  if (o.unit) txt += "\u00A0" + o.unit; // NBSP
  s.textContent = txt;
  return s;
}

function liIngredient(it){
  if (it.group){
    const h = document.createElement("h4");
    h.textContent = it.group;
    return h;
  }
  const li = document.createElement("li");

  if (it.noScale){
    li.setAttribute("data-no-scale","true");
    li.textContent = it.text || "";
    return li;
  }

  li.dataset.base = it.base;
  if (it.unit) li.dataset.unit = it.unit;
  if (it.wordSingular) li.dataset.wordSingular = it.wordSingular;
  if (it.wordPlural)  li.dataset.wordPlural  = it.wordPlural;
  li.dataset.originalText = it.text || "";

  const num  = String(it.base);
  const unit = it.unit ? "\u00A0"+it.unit : "";
  li.textContent = `${num}${unit} ${it.text || ""}`.trim();
  return li;
}

function liStep(step){
  const li = document.createElement("li");
  if (step.timer) li.setAttribute("data-timer", step.timer);

  const div = document.createElement("div");
  div.className = "step-text";

  (step.parts || []).forEach(p => {
    if (p.text)   div.appendChild(document.createTextNode(p.text));
    if (p.scaled) div.appendChild(spanScaled(p.scaled));
  });

  li.appendChild(div);
  return li;
}

document.addEventListener("DOMContentLoaded", async () => {
  const root = $("#recipe-root");
  const path = getRecipePath(); // z. B. "fruehling/spargelcremesuppe"
  if (!root){ console.error("#recipe-root fehlt."); return; }
  if (!path){ root.innerHTML = "<p>Kein Rezept ausgewählt.</p>"; return; }

  try{
    const [season, slug] = path.split("/");

    // Pfad-Prefix: Wrapper liegt unter /recipe-pages/<s>/<slug>/ (3 Ebenen tief)
    // recipe.html (Dev) liegt im Root → ohne Prefix
    const isWrapper = location.pathname.includes("/recipe-pages/");
    const P = isWrapper ? "../../../" : "";

    // JSON laden (flach pro Saison)
    const data = await loadJSON(`${P}data/recipes/${season}/${slug}.json`);

    const meta = data.meta || {};
    const t    = meta.time || {};
    const heroSrc = `${P}${data.heroImage || `assets/img/${season}/${slug}/${slug}.jpg`}`;

    // Grundgerüst – IDs/Klassen kompatibel zu cookmode.js
    root.innerHTML = `
  <main class="recipe-page">
    <div class="recipe-container">

      <h2 id="recipe-title">${data.title || slug}</h2>
      <p class="recipe-intro">${data.intro || ""}</p>

      <button class="cookmode-btn" onclick="startCookingMode()">Kochmodus starten</button>

      <div id="cookmode" class="modal fullscreen cookmode">
        <div class="modal-inner">
          <div id="step-progress">
            <svg viewBox="0 0 120 120" width="120" height="120">
              <circle class="bg" cx="60" cy="60" r="50"></circle>
              <circle class="progress" cx="60" cy="60" r="50" stroke-dasharray="314" stroke-dashoffset="314"></circle>
            </svg>
            <div id="step-count">0/0</div>
          </div>
          <button class="modal-close" onclick="closeModal()">✕</button>
          <h2 id="modal-title">Utensilien</h2>
          <div id="modal-content"></div>
          <div class="modal-buttons">
            <button onclick="prevStep()">Zurück</button>
            <button onclick="nextStep()">Weiter</button>
          </div>
        </div>
      </div>

      <div id="done-modal" class="modal fullscreen cookmode" style="display:none;">
        <div class="modal-inner" style="justify-content:center; text-align:center;">
          <h2>Fertig!</h2>
          <p>Guten Appetit!</p>
          <button class="cookmode-btn" onclick="closeDoneModal()">Kochmodus beenden</button>
        </div>
      </div>

      <ol id="steps" style="display:none;" data-original-portions="${meta.basePortions || 4}"></ol>

      <div class="meta-grid">
        <div><strong>Vorbereitungszeit:</strong><br>${t.prep || "–"}</div>
        <div><strong>Kochzeit:</strong><br>${t.cook || "–"}</div>
        <div><strong>Gesamtzeit:</strong><br>${t.total || "–"}</div>
        <div><strong>Schwierigkeit:</strong><br>${meta.difficulty || "–"}</div>
      </div>

      ${heroSrc ? `<img src="${heroSrc}" alt="${data.title || ""}" class="hero-image">` : ""}

      <div class="portion-control">
        <button onclick="changePortion(-1)">−</button>
        <span id="portion-text" data-unit-singular="Portion" data-unit-plural="Portionen">${meta.basePortions || 4} Portionen</span>
        <button onclick="changePortion(1)">+</button>
        <button class="copy-btn" onclick="copyIngredients()">Zutaten kopieren</button>
      </div>

      <div class="ingredients-wrap">
        <section class="ingredients-col">
          <h3>Zutaten</h3>
          <ul id="zutaten" data-original-portions="${meta.basePortions || 4}"></ul>
        </section>

        <aside class="utensils-col">
          <h3>Benötigte Utensilien</h3>
          <ul id="utensilien"></ul>
        </aside>
      </div>

      <h3>Zubereitung</h3>
      <ol id="zubereitung" data-original-portions="${meta.basePortions || 4}"></ol>

      <div class="related">
        <h3>Tipps</h3>
        <p>${data.tips || "–"}</p>
      </div>

      ${Array.isArray(data.nutritionRows) && data.nutritionRows.length
        ? `<h3>Nährwerte pro Portion</h3>
           <table class="nutrition-table"><tbody>
             ${data.nutritionRows.map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}
           </tbody></table>
           <p class="nutrition-note">Die Nährwerte wurden automatisch berechnet und dienen nur als Orientierung.</p>`
        : "" }

    </div>
  </main>
`;

    // Zutaten
    const ingUL = $("#zutaten");
    (data.ingredients || []).forEach(it => ingUL.appendChild(liIngredient(it)));

    // Utensilien
    const utUL = $("#utensilien");
    (data.utensils || []).forEach(x => {
      const li = document.createElement("li");
      li.textContent = x;
      utUL.appendChild(li);
    });

    // Schritte
    const stepsOL = $("#zubereitung");
    (data.steps || []).forEach(st => stepsOL.appendChild(liStep(st)));

  } catch (e){
    console.error(e);
    root.innerHTML = `<p class="error">Rezept konnte nicht geladen werden.</p>`;
  }
});
