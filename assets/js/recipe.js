// Liest den Parameter ?id=slug aus der URL
function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadRecipe() {
  const slug = getSlug();
  if (!slug) {
    document.getElementById("recipe-title").textContent = "Kein Rezept ausgewählt.";
    return;
  }

  try {
    const res = await fetch(`data/recipes/${slug}.json`);
    if (!res.ok) throw new Error("Rezept nicht gefunden");
    const recipe = await res.json();

    // Titel + Intro
    document.getElementById("recipe-title").textContent = recipe.title || slug;
    document.getElementById("recipe-intro").textContent = recipe.intro || "";

    // Zutaten
    const ingList = document.getElementById("ingredients");
    ingList.innerHTML = "";
    (recipe.ingredients || []).forEach(ing => {
      const li = document.createElement("li");
      li.textContent = ing;
      ingList.appendChild(li);
    });

    // Schritte
    const stepsList = document.getElementById("steps");
    stepsList.innerHTML = "";
    (recipe.steps || []).forEach(step => {
      const li = document.createElement("li");
      li.textContent = step;
      stepsList.appendChild(li);
    });

  } catch (err) {
    document.getElementById("recipe-title").textContent = "Fehler beim Laden des Rezepts.";
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", loadRecipe);
