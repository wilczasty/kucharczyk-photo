/* =========================================================
   PORTFOLIO – lista zdjęć w galerii.

   Jak dodać zdjęcie:
   1. Wrzuć plik do folderu images/portfolio/ (np. images/portfolio/szklarnia-01.jpg)
   2. Dopisz linijkę poniżej:
      { src: "images/portfolio/szklarnia-01.jpg", category: "szklarnia", caption: "Wśród zieleni" },

   Kategorie (klucz → nazwa przycisku) definiujesz w CATEGORIES.
   Przycisk kategorii pojawia się sam, gdy jest w niej choć jedno zdjęcie.
   Kolejność na liście = kolejność w galerii.
   ========================================================= */
window.CATEGORIES = {
  rodzinne: "Rodzinne i dziecięce",
  reportaze: "Reportaże",
  portrety: "Portrety",
  szklarnia: "Szklarnia",
};

const P = name => `images/portfolio/${name}.jpg`;

window.PORTFOLIO = [
  { src: P("dzieci-pole-1"),          category: "rodzinne",   caption: "Wśród kapusty" },
  { src: P("konie-plener-1"),         category: "portrety",   caption: "Popołudnie na pastwisku" },
  { src: P("portret-sowa"),           category: "portrety",   caption: "Leśny portret" },
  { src: P("ciazowa-studio"),         category: "rodzinne",   caption: "W oczekiwaniu" },
  { src: P("konie-zawody-1"),         category: "reportaze",  caption: "Cross" },
  { src: P("portret-kwiaty"),         category: "portrety",   caption: "Piwonie" },
  { src: P("rodzinne-swieta-1"),      category: "rodzinne",   caption: "Świąteczny śmiech" },
  { src: P("panienski"),              category: "portrety",   caption: "Wieczór panieński" },
  { src: P("dzieci-pole-2"),          category: "rodzinne",   caption: "Mały ogrodnik" },
  { src: P("portret-kapelusz"),       category: "portrety",   caption: "Portret w kapeluszu" },
  { src: P("konie-zawody-2"),         category: "reportaze",  caption: "Galop" },
  { src: P("ciazowa-plener"),         category: "rodzinne",   caption: "Na łące" },
  { src: P("rodzinne-swieta-5"),      category: "rodzinne",   caption: "Rodzinne święta" },
  { src: P("grupowe-miasto"),         category: "portrety",   caption: "Sesja grupowa" },
  { src: P("portret-czarno-bialy"),   category: "portrety",   caption: "Światło i cień" },
  { src: P("kobiece-grupowe"),        category: "portrety",   caption: "Złota godzina" },
  { src: P("noworodek"),              category: "rodzinne",   caption: "Pierwsze tygodnie" },
  { src: P("wydarzenia-wystawa-psow"),category: "reportaze",  caption: "Wystawa psów" },
  { src: P("rodzinne-swieta-2"),      category: "rodzinne",   caption: "Bajka pod choinką" },
  { src: P("portret-zlota-suknia"),   category: "portrety",   caption: "Sesja kreatywna" },
  { src: P("dzieci-pole-3"),          category: "rodzinne",   caption: "Jesień na polu" },
  { src: P("reportaz-zaklad"),        category: "reportaze",  caption: "Reportaż firmowy" },
  { src: P("rodzinne-swieta-6"),      category: "rodzinne",   caption: "Prezenty" },
  { src: P("plener-zachod-slonca"),   category: "portrety",   caption: "Zachód słońca" },
  { src: P("konie-plener-2"),         category: "portrety",   caption: "Przyjaciółki" },
  { src: P("rodzinne-zima"),          category: "rodzinne",   caption: "Zimowy spacer" },
  { src: P("wydarzenia-11-listopada"),category: "reportaze",  caption: "11 listopada" },
  { src: P("rodzinne-swieta-3"),      category: "rodzinne",   caption: "Rozpakowywanie" },
  { src: P("rodzinne-swieta-4"),      category: "rodzinne",   caption: "Ubieranie choinki" },
  { src: P("konie-stajnia"),          category: "portrety",   caption: "W stajni" },
];
