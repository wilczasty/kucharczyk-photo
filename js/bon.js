/* Bon podarunkowy (sekcja #bon): przykładowy bon zmienia się na żywo, gdy ktoś wybiera pakiet
   albo wpisuje imię i dedykację. Na razie tylko do oglądania – nic nie jest wysyłane. */
(function () {
  const wybor = document.getElementById("bon-wybor");
  if (!wybor) return;
  const bon = k => document.querySelector(`[data-bon="${k}"]`);
  const dla = document.getElementById("bon-dla");
  const ded = document.getElementById("bon-dedykacja");

  const w = bon("waznosc");
  if (w) {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(w.dataset.miesiecy || 12));
    w.textContent = d.toLocaleDateString("pl-PL");
  }
  if (!wybor.querySelector("input[name=bon-rodzaj]:checked")) {
    const pierwszy = wybor.querySelector("input[name=bon-rodzaj]");
    if (pierwszy) pierwszy.checked = true;
  }

  function odswiez() {
    const r = wybor.querySelector("input[name=bon-rodzaj]:checked");
    if (r) {
      bon("pakiet").textContent = r.dataset.nazwa;
      bon("szczegoly").textContent = r.dataset.szczegoly;
    }
    bon("dla").textContent = dla.value.trim() || bon("dla").dataset.domyslnie;
    bon("dedykacja").textContent = ded.value.trim() || bon("dedykacja").dataset.domyslnie;
  }
  wybor.addEventListener("input", odswiez);
  wybor.addEventListener("change", odswiez);
  odswiez();
})();
