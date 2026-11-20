/* L'APPLI WEB DE HOUBLÀ (houbla.fr/appli/, 2026-11-10) — lui : « mes amis qui aiment la bière sont sur Android ».
   Une version web de l'app, qu'on peut poser sur l'écran d'accueil (Chrome sur Android : « Installer l'application »).
   Elle se sert des outils de la page d'une bière (scripts/page_biere.js, window.HoublaOutils) : le test, le match, la note.
   Trois onglets, comme l'app moins Explorer : POUR TOI (la bière pour ce soir, d'autres, chercher), SCANNER (la caméra lit
   le code-barres, Houblà dit ton match), MES BIÈRES (ta forme, tes notes, celles scannées).
   RIEN NE PART : le test, les notes et les scans restent dans le navigateur (localStorage). La caméra ne sert qu'à lire
   le code-barres, sur le téléphone. Avant tout, « As-tu 18 ans ou plus ? » (comme l'app). */
(function () {
  "use strict";
  var O = window.HoublaOutils;
  var racine = document.getElementById("appli");
  if (!O || !racine) return;
  var doc = document, H = O.H, esc = O.esc, el = O.el;
  var CLE_SCANS = "houbla.scans.1", CLE_MAJEUR = "houbla.majeur", CLE_ONGLET = "houbla.onglet", CLE_INSTALLE = "houbla.installer.vu";
  var OR = { robe: "#EAC14E", sur: "#2A2104" };
  try { sessionStorage.setItem("houbla.appli", "1"); } catch (e) { /* rien */ }

  function lireLocal(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } }
  function ecrireLocal(cle, v) { try { if (v == null) localStorage.removeItem(cle); else localStorage.setItem(cle, v); } catch (e) { /* rien */ } }
  function tesScans() { try { var s = JSON.parse(lireLocal(CLE_SCANS)); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; } }
  function garderScans(s) { ecrireLocal(CLE_SCANS, JSON.stringify(s)); }
  var meta = doc.querySelector('meta[name="theme-color"]');
  function teinter(c) { if (meta) meta.content = c; }
  var standalone = !!(window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;

  // ——— Les dessins ———
  var ICONES = {
    pourtoi: '<path d="M12 3.2l1.7 4.6 4.6 1.7-4.6 1.7L12 15.8l-1.7-4.6-4.6-1.7 4.6-1.7z"/><path d="M18.6 14.6l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/><path d="M5.4 15.4l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/>',
    scanner: '<path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7.5 8v8M10 8v8M12.6 8v8M15.4 8v8M16.8 8v8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    mes: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.8" r="3.1"/><path d="M6.4 17.6c1.3-2 3.3-3 5.6-3s4.3 1 5.6 3a7.6 7.6 0 0 1-11.2 0z"/>'
  };
  function icone(nom, taille) {
    return '<svg width="' + (taille || 26) + '" height="' + (taille || 26) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + ICONES[nom] + "</svg>";
  }
  var LOUPE = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>';

  /* Une forme qui ondule (la houle de l'app) : ta forme pleine dans ta couleur, ton trait par-dessus. */
  function formeVivante(svg, valeurs, plein, trait, decalage) {
    var p = svg.querySelector("path");
    p.setAttribute("fill", plein);
    if (trait) { p.setAttribute("stroke", trait); p.setAttribute("stroke-width", "2.4"); p.setAttribute("stroke-linejoin", "round");
                 p.setAttribute("vector-effect", "non-scaling-stroke"); }
    return O.vivant(svg, 30, function (t) { p.setAttribute("d", O.forme184(valeurs, t, decalage || 0)); });
  }

  // ——— L'état ———
  var vivants = [];
  function oublierTout() { vivants.forEach(O.oublier); vivants = []; }
  function garder(v) { vivants.push(v); return v; }
  var onglet = "pourtoi";
  try { onglet = sessionStorage.getItem(CLE_ONGLET) || "pourtoi"; } catch (e) { /* rien */ }
  if (/^#(pourtoi|scanner|mes)$/.test(location.hash)) onglet = location.hash.slice(1);

  /* Ton goût, avec tes notes, et ta couleur (la robe de la bière la plus proche de toi). */
  function tonEtat() {
    var s = O.lire();
    if (!s) return null;
    var notes = O.tesNotes(), gout = O.tonGoutAvecNotes(s, notes);
    var choix = O.index() ? O.pourToi(gout, s.preferee, notes, 7) : null;
    return { s: s, notes: notes, gout: gout, choix: choix, c: O.couleurDe(choix) };
  }

  // ——— L'ENTRÉE : l'âge, puis l'accueil et le test ———
  function rendre() {
    oublierTout();
    arreterCamera();
    if (lireLocal(CLE_MAJEUR) !== "1") return ecranAge();
    if (!O.lire()) return ecranAccueil();
    ecranAppli();
  }

  function ecranAge() {
    teinter(OR.robe);
    racine.className = "entree";
    racine.innerHTML = '<div class="ecran-entree" style="background:' + OR.robe + ";color:" + OR.sur + '">'
      + '<div class="age-milieu"><h1 class="nom-houbla monte">Houblà</h1>'
      + '<div class="age-question monte" style="--i:1"><p class="petit">Houblà parle de bière.</p><p class="grand">As-tu 18 ans ou plus ?</p></div>'
      + '<div class="age-refus" hidden><p class="grand-moyen">Reviens nous voir à tes 18 ans.</p><p class="petit">Houblà parle de bière : l\'app est réservée aux personnes majeures.</p></div></div>'
      + '<div class="age-bas monte" style="--i:2"><button type="button" class="bouton-plein oui" style="background:' + OR.sur + ";color:" + OR.robe + '">Oui, j\'ai 18 ans</button>'
      + '<button type="button" class="bouton-texte non">Non</button><button type="button" class="bouton-texte souligne revenir" hidden>Revenir</button>'
      + '<p class="sanitaire">L\'abus d\'alcool est dangereux pour la santé, à consommer avec modération.</p></div></div>';
    var q = racine.querySelector(".age-question"), refus = racine.querySelector(".age-refus");
    var oui = racine.querySelector(".oui"), non = racine.querySelector(".non"), revenir = racine.querySelector(".revenir");
    oui.addEventListener("click", function () { ecrireLocal(CLE_MAJEUR, "1"); rendre(); });
    non.addEventListener("click", function () { q.hidden = oui.hidden = non.hidden = true; refus.hidden = revenir.hidden = false; });
    revenir.addEventListener("click", function () { q.hidden = oui.hidden = non.hidden = false; refus.hidden = revenir.hidden = true; });
  }

  function ecranAccueil() {
    teinter(OR.robe);
    racine.className = "entree";
    racine.innerHTML = '<div class="ecran-entree" style="background:' + OR.robe + ";color:" + OR.sur + '">'
      + '<div class="accueil-haut"><svg class="accueil-forme monte" viewBox="0 0 184 184" width="176" height="176" aria-hidden="true">'
      + '<path fill="rgba(255,255,255,.72)" stroke="' + OR.sur + '" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>'
      + '<h1 class="nom-houbla monte" style="--i:1">Houblà</h1><p class="accroche monte" style="--i:2">Ton goût a une forme. Chaque bière aussi.</p>'
      + '<div class="phrases monte" style="--i:3"><p>Ta forme : ce que tu aimes, en un dessin.</p><p>Le match : à quel point une bière te ressemble, et pourquoi.</p>'
      + "<p>Pas de pub, rien de sponsorisé : tout sort de tes goûts.</p></div></div>"
      + '<div class="accueil-bas"><svg class="vague-bas" height="22" preserveAspectRatio="none" aria-hidden="true"><path fill="' + OR.sur + '"/></svg>'
      + '<div class="accueil-boutons" style="background:' + OR.sur + '"><button type="button" class="bouton-plein commencer" style="background:#F6E7BF;color:' + OR.sur + '">Dessiner ma forme</button>'
      + '<p class="sous-bouton">' + H.questions.length + " questions, une minute</p></div></div></div>";
    var svg = racine.querySelector(".accueil-forme"), p = svg.querySelector("path");
    garder(O.vivant(svg, 30, function (t) { p.setAttribute("d", O.forme184(H.base, t, 0)); }));
    var vb = racine.querySelector(".vague-bas"), pv = vb.querySelector("path");
    garder(O.vivant(vb, 30, function (t) {
      var l = vb.getBoundingClientRect().width || 390;
      vb.setAttribute("viewBox", "0 0 " + l + " 22");
      pv.setAttribute("d", O.vague(l, 22, 11, 4, t, 1, 7, 0, false));
    }));
    racine.querySelector(".commencer").addEventListener("click", function () { O.ouvrirTest(); });
  }
  doc.addEventListener("houbla:test", function () { rendre(); });

  // ——— L'APPLI : trois onglets ———
  function ecranAppli() {
    racine.className = "corps";
    racine.innerHTML = '<main class="onglet-page"></main>'
      + '<nav class="barre-onglets" aria-label="Onglets">'
      + bouton("pourtoi", "Pour toi") + bouton("scanner", "Scanner") + bouton("mes", "Mes bières") + "</nav>";
    racine.querySelectorAll(".barre-onglets button").forEach(function (b) {
      b.addEventListener("click", function () {
        var vers = b.getAttribute("data-onglet");
        if (vers === onglet) { window.scrollTo({ top: 0, behavior: O.CALME ? "auto" : "smooth" }); return; }
        aller(vers);
      });
    });
    montrerOnglet();
    if (!O.index()) O.chargerIndex().then(function () { if (onglet !== "scanner") montrerOnglet(); }, function () { /* chaque page le dit */ });
  }
  function bouton(nom, titre) {
    return '<button type="button" data-onglet="' + nom + '">' + icone(nom) + "<span>" + titre + "</span></button>";
  }
  function aller(vers) {
    onglet = vers;
    try { sessionStorage.setItem(CLE_ONGLET, vers); } catch (e) { /* rien */ }
    history.replaceState(null, "", "#" + vers);
    window.scrollTo(0, 0);
    montrerOnglet();
  }
  function montrerOnglet() {
    oublierTout();
    arreterCamera();
    var page = racine.querySelector(".onglet-page");
    if (!page) return;
    racine.querySelectorAll(".barre-onglets button").forEach(function (b) {
      b.setAttribute("aria-current", b.getAttribute("data-onglet") === onglet ? "page" : "false");
    });
    page.classList.remove("arrive");
    void page.offsetWidth;
    page.classList.add("arrive");
    if (onglet === "scanner") pageScanner(page);
    else if (onglet === "mes") pageMesBieres(page);
    else pagePourToi(page);
  }

  // ——— POUR TOI ———
  var rangCeSoir = 0;
  function pagePourToi(page) {
    var e = tonEtat(), c = e.c;
    teinter(c.robe);
    page.innerHTML = '<header class="haut-couleur" style="background:' + c.robe + ";color:" + c.sur + '">'
      + '<div class="haut-ligne"><h1>Pour toi</h1><svg class="ta-petite-forme" viewBox="0 0 184 184" width="58" height="58" aria-hidden="true"><path/></svg></div>'
      + '<p class="tes-mots">' + esc(O.distinctifs(e.gout).join(" · ")) + "</p></header>"
      + vagueDuHaut(c.robe)
      + '<div class="contenu">'
      + '<label class="champ-chercher">' + LOUPE + '<input type="search" placeholder="Chercher une bière" aria-label="Chercher une bière" autocomplete="off" enterkeyhint="search"></label>'
      + '<div class="resultats" aria-live="polite"></div>'
      + '<div class="pour-toi-suite">' + carteInstaller()
      + (e.choix ? partieCeSoir(e) : '<p class="vide">' + (O.index() ? "Aucune bière à te proposer pour l'instant." : "Un instant…") + "</p>")
      + "</div></div>";
    garder(formeVivante(page.querySelector(".ta-petite-forme"), e.gout, c.forme, c.sur, 1.3));
    brancherVagueDuHaut(page);
    brancherRecherche(page.querySelector(".champ-chercher input"), page.querySelector(".resultats"), page.querySelector(".pour-toi-suite"));
    brancherInstaller(page);
    if (e.choix) brancherCeSoir(page, e);
  }
  function partieCeSoir(e) {
    var liste = e.choix.bieres;
    if (!liste.length) return "";
    return '<p class="titre-partie">Ce soir, essaie</p><div class="ce-soir"></div>'
      + '<div class="ce-soir-boutons"><button type="button" class="pastille une-autre">Une autre</button></div>'
      + (liste.length > 1 ? '<p class="titre-partie">D\'autres pour toi</p><div class="liste-blanche autres"></div>' : "");
  }
  function brancherCeSoir(page, e) {
    var liste = e.choix.bieres, boite = page.querySelector(".ce-soir");
    if (!boite) return;
    var vivantCeSoir = null;
    function dessiner() {
      if (vivantCeSoir) O.oublier(vivantCeSoir);
      var x = liste[rangCeSoir % liste.length], b = x.b;
      boite.innerHTML = '<a class="grande-biere" href="/b/' + esc(b.slug) + '/" style="background:' + b.robe + ";color:" + b.sur + '">'
        + '<span class="gb-nom">' + esc(b.nom) + '</span><span class="gb-sous">' + esc([b.brasserie, b.type].filter(Boolean).join(" · ")) + "</span>"
        + '<svg class="gb-formes" viewBox="0 0 184 184" width="124" height="124" aria-hidden="true"><path class="b"/><path class="t"/></svg>'
        + '<span class="gb-match"><b>' + x.m.pc + '</b><small> %</small></span><span class="gb-dit">Ton match</span>'
        + '<span class="gb-phrase">' + esc(x.m.phrase) + "</span></a>";
      var svg = boite.querySelector(".gb-formes"), pb = svg.querySelector(".b"), pt = svg.querySelector(".t");
      pb.setAttribute("fill", b.forme);
      ["fill", "none", "stroke", b.sur, "stroke-width", "2.6", "stroke-linejoin", "round", "vector-effect", "non-scaling-stroke"]
        .forEach(function (v, i, a) { if (i % 2 === 0) pt.setAttribute(v, a[i + 1]); });
      vivantCeSoir = garder(O.vivant(svg, 30, function (t) {
        pb.setAttribute("d", O.forme184(b.valeurs, t, 0));
        pt.setAttribute("d", O.forme184(e.gout, t, 1.3));
      }));
      var autres = page.querySelector(".autres");
      if (autres) autres.innerHTML = liste.filter(function (y) { return y !== x; }).map(ligne).join("");
    }
    dessiner();
    page.querySelector(".une-autre").addEventListener("click", function () {
      rangCeSoir++;
      boite.classList.remove("change");
      void boite.offsetWidth;
      boite.classList.add("change");
      dessiner();
    });
  }
  function ligne(x) {
    var b = x.b;
    return '<a class="ligne" href="/b/' + esc(b.slug) + '/"><span class="rond" style="background:' + b.robe + '">'
      + '<svg viewBox="0 0 184 184" width="30" height="30" aria-hidden="true"><path d="' + O.forme184(b.valeurs, null, 0) + '" fill="' + b.forme + '"/></svg></span>'
      + '<span class="txt"><b>' + esc(b.nom) + "</b><span>" + esc([b.brasserie, b.type].filter(Boolean).join(" · ")) + "</span></span>"
      + (x.m ? '<span class="pc">' + x.m.pc + " %</span>" : "") + "</a>";
  }

  /* Le haut en couleur finit par une surface qui ondule (comme la page d'une bière). */
  function vagueDuHaut(robe) {
    return '<svg class="surface-haut" height="18" preserveAspectRatio="none" aria-hidden="true"><path fill="' + robe + '"/></svg>';
  }
  function brancherVagueDuHaut(page) {
    var s = page.querySelector(".surface-haut");
    if (!s) return;
    var p = s.querySelector("path");
    garder(O.vivant(s, 30, function (t) {
      var l = Math.round(s.getBoundingClientRect().width) || 390;
      s.setAttribute("viewBox", "0 0 " + l + " 18");
      p.setAttribute("d", O.vague(l, 18, 7, 3.2, t, 1, 8, 0, true));
    }));
  }

  /* Chercher : les bières de Houblà par leur nom ou leur brasserie, avec ton match. */
  function brancherRecherche(champ, sortie, cacher) {
    function montrer() {
      var texte = champ.value;
      if (!texte.trim()) { sortie.innerHTML = ""; if (cacher) cacher.hidden = false; return; }
      O.chargerIndex().then(function () {
        if (champ.value !== texte) return;
        var e = tonEtat(), r = O.chercher(texte);
        if (cacher) cacher.hidden = true;
        sortie.innerHTML = r.length
          ? '<div class="liste-blanche">' + r.map(function (b) { return ligne({ b: b, m: O.calculer(b, e.gout, e.s.preferee, e.notes) }); }).join("") + "</div>"
          : '<p class="vide">Aucune bière de Houblà ne porte ce nom. Houblà en connaît ' + O.index().length.toLocaleString("fr-FR") + ", pas encore celle-ci.</p>";
      }, function () { sortie.innerHTML = '<p class="vide">La recherche ne répond pas : vérifie ta connexion.</p>'; });
    }
    champ.addEventListener("input", montrer);
    champ.addEventListener("focus", function () { O.chargerIndex(); });
    return montrer;
  }

  // ——— Le mettre sur l'écran d'accueil ———
  var invitation = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    invitation = e;
    if (onglet === "pourtoi" && racine.querySelector(".onglet-page") && !racine.querySelector(".carte-installer")) montrerOnglet();
  });
  window.addEventListener("appinstalled", function () { invitation = null; ecrireLocal(CLE_INSTALLE, "1"); var c = racine.querySelector(".carte-installer"); if (c) c.remove(); });
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  function carteInstaller() {
    if (standalone || lireLocal(CLE_INSTALLE) === "1" || (!invitation && !IOS)) return "";
    return '<div class="carte-installer"><img src="/appli/icone-192.png" width="48" height="48" alt=""><div><b>Houblà sur ton écran d\'accueil</b>'
      + "<p>" + (invitation ? "Comme une app : un toucher, et c'est ouvert." : "Touche Partager, puis « Sur l'écran d'accueil ».") + "</p></div>"
      + (invitation ? '<button type="button" class="installer">Ajouter</button>' : "")
      + '<button type="button" class="plus-tard" aria-label="Pas maintenant">' + O.croix("#F3E9DC") + "</button></div>";
  }
  function brancherInstaller(page) {
    var carte = page.querySelector(".carte-installer");
    if (!carte) return;
    var b = carte.querySelector(".installer");
    if (b) b.addEventListener("click", function () {
      if (!invitation) return;
      invitation.prompt();
      invitation.userChoice.then(function () { invitation = null; carte.remove(); });
    });
    carte.querySelector(".plus-tard").addEventListener("click", function () { ecrireLocal(CLE_INSTALLE, "1"); carte.remove(); });
  }

  // ——— SCANNER : la caméra lit le code-barres ———
  var codes = null, codesDemandes = null;
  function chargerCodes() {
    if (codesDemandes) return codesDemandes;
    codesDemandes = fetch(H.codes).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { codes = j; return j; });
    codesDemandes.catch(function () { codesDemandes = null; });
    return codesDemandes;
  }
  /* Un code peut s'écrire avec ou sans le zéro du début (UPC-A à 12 chiffres, EAN-13 à 13). */
  function trouverCode(code) {
    if (!codes) return null;
    var essais = [code];
    if (code.length === 12) essais.push("0" + code);
    if (code.length === 13 && code[0] === "0") essais.push(code.slice(1));
    for (var i = 0; i < essais.length; i++) if (codes[essais[i]]) return codes[essais[i]];
    return null;
  }
  var flux = null, boucle = null, lecteur = null, occupe = false, dernierCode = null, dernierQuand = 0;
  var LIT = typeof window.BarcodeDetector === "function", codeEssaiJoue = false;
  function arreterCamera() {
    if (boucle) { clearTimeout(boucle); boucle = null; }
    if (flux) { flux.getTracks().forEach(function (t) { t.stop(); }); flux = null; }
    occupe = false;
  }
  doc.addEventListener("visibilitychange", function () {
    if (doc.hidden) arreterCamera();
    else if (onglet === "scanner" && racine.querySelector(".zone-camera.allumee")) montrerOnglet();
  });

  function pageScanner(page) {
    teinter("#000000");
    var e = tonEtat();
    page.innerHTML = '<div class="zone-camera">'
      + '<video playsinline muted aria-hidden="true"></video>'
      + '<div class="coins" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'
      + '<div class="camera-repos">' + icone("scanner", 54)
      + (LIT ? '<p class="camera-titre">Scanne une bière</p><p class="camera-sous">Houblà lit son code-barres et te dit si elle va te plaire.</p>'
             + '<button type="button" class="bouton-plein allumer">Ouvrir la caméra</button>'
             + '<p class="camera-prive">La caméra ne sert qu\'à lire le code-barres, sur ton téléphone : aucune image ne part.</p>'
             : '<p class="camera-titre">Ton navigateur ne lit pas les codes-barres</p><p class="camera-sous">Chrome sur Android le fait. Ici, cherche la bière par son nom, juste en dessous.</p>')
      + "</div>"
      + '<p class="consigne">Montre le code-barres à la caméra</p>'
      + '<div class="feuille-scan" hidden></div></div>'
      + '<div class="contenu sous-camera">'
      + (LIT ? '<button type="button" class="lien une-photo">Lire une photo</button><input type="file" accept="image/*" class="choisir-photo" hidden>' : "")
      + '<label class="champ-chercher">' + LOUPE + '<input type="search" placeholder="Ou cherche-la par son nom" aria-label="Chercher une bière par son nom" autocomplete="off" enterkeyhint="search"></label>'
      + '<div class="resultats" aria-live="polite"></div></div>';
    var zone = page.querySelector(".zone-camera"), video = zone.querySelector("video"), feuille = zone.querySelector(".feuille-scan");
    var champ = page.querySelector(".champ-chercher input");
    var montrerRecherche = brancherRecherche(champ, page.querySelector(".resultats"), null);
    chargerCodes().catch(function () { /* dit au moment du scan */ });
    var essai = new URLSearchParams(location.search).get("codeEssai");
    if (essai && !codeEssaiJoue) { codeEssaiJoue = true; setTimeout(function () { resultat(essai); }, 50); }
    if (!LIT) return;
    if (!lecteur) {
      try { lecteur = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] }); }
      catch (x) { try { lecteur = new BarcodeDetector(); } catch (y) { lecteur = null; } }
    }
    page.querySelector(".allumer").addEventListener("click", function () { allumer(); });
    var photo = page.querySelector(".choisir-photo");
    page.querySelector(".une-photo").addEventListener("click", function () { photo.click(); });
    photo.addEventListener("change", function () {
      var fichier = photo.files && photo.files[0];
      photo.value = "";
      if (!fichier || !lecteur) return;
      createImageBitmap(fichier).then(function (image) { return lecteur.detect(image); }).then(function (lus) {
        if (lus && lus.length) resultat(lus[0].rawValue);
        else montrerFeuille('<div class="feuille-neutre"><p class="fs-titre">Je ne vois pas de code-barres</p>'
          + '<p class="fs-sous">Prends le code-barres de près, bien à plat, sans reflet.</p>'
          + '<button type="button" class="bouton-plein suivante">D\'accord</button></div>', "#FFFFFF");
      }, function () { /* image illisible */ });
    });
    if (zone.dataset) zone.dataset.pret = "1";
    /* Déjà autorisée (deuxième visite) : la caméra s'ouvre seule. */
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "camera" }).then(function (p) { if (p.state === "granted") allumer(); }, function () { /* rien */ });
    }

    function allumer() {
      if (flux || !navigator.mediaDevices) return;
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function (s) {
          if (onglet !== "scanner" || !doc.body.contains(video)) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          flux = s;
          video.srcObject = s;
          video.play().catch(function () { /* rien */ });
          zone.classList.add("allumee");
          lire();
        }, function () {
          zone.querySelector(".camera-repos").innerHTML = icone("scanner", 54)
            + '<p class="camera-titre">La caméra n\'est pas autorisée</p><p class="camera-sous">Autorise-la dans les réglages du navigateur (le cadenas à côté de l\'adresse), ou cherche la bière par son nom, juste en dessous.</p>';
        });
    }
    function lire() {
      if (!flux || !lecteur) return;
      if (occupe || video.readyState < 2) { boucle = setTimeout(lire, 250); return; }
      lecteur.detect(video).then(function (lus) {
        if (lus && lus.length && !occupe) {
          var code = lus[0].rawValue, t = Date.now();
          if (code !== dernierCode || t - dernierQuand > 4000) resultat(code);
        }
      }, function () { /* image pas prête */ }).then(function () { if (flux) boucle = setTimeout(lire, 220); });
    }
    function montrerFeuille(html, fond, couleur) {
      occupe = true;
      feuille.innerHTML = html;
      feuille.style.background = fond;
      feuille.style.color = couleur || "#111114";
      feuille.hidden = false;
      zone.classList.add("resultat");
      feuille.classList.remove("monte-feuille");
      void feuille.offsetWidth;
      feuille.classList.add("monte-feuille");
      var s = feuille.querySelector(".suivante");
      if (s) s.addEventListener("click", fermerFeuille);
      var c = feuille.querySelector(".chercher-nom");
      if (c) c.addEventListener("click", function () { fermerFeuille(); champ.focus(); champ.scrollIntoView({ block: "center", behavior: O.CALME ? "auto" : "smooth" }); });
      return feuille;
    }
    function fermerFeuille() {
      dernierQuand = Date.now();
      feuille.classList.add("descend");
      setTimeout(function () {
        feuille.hidden = true;
        feuille.classList.remove("descend");
        feuille.innerHTML = "";
        zone.classList.remove("resultat");
        teinter("#000000");
        occupe = false;
      }, O.CALME ? 0 : 380);
    }
    function resultat(code) {
      dernierCode = code;
      dernierQuand = Date.now();
      occupe = true;
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (x) { /* rien */ } }
      Promise.all([chargerCodes(), O.chargerIndex()]).then(function () {
        var slug = trouverCode(code), b = slug && O.index().filter(function (x) { return x.slug === slug; })[0];
        if (!b) {
          montrerFeuille('<div class="feuille-neutre"><p class="fs-titre">Je ne connais pas ce code</p>'
            + '<p class="fs-sous">Houblà connaît ' + O.index().length.toLocaleString("fr-FR") + " bières, pas encore celle-ci. Cherche-la par son nom : elle y est peut-être sous un autre code.</p>"
            + '<button type="button" class="bouton-plein chercher-nom">Chercher par son nom</button>'
            + '<button type="button" class="bouton-texte suivante">Scanner une autre</button></div>', "#FFFFFF");
          return;
        }
        var e = tonEtat(), m = O.calculer(b, e.gout, e.s.preferee, e.notes), maNote = e.notes[b.slug];
        var scans = tesScans();
        if (!maNote) { scans[b.slug] = { slug: b.slug, le: new Date().toISOString().slice(0, 10), t: Date.now() }; garderScans(scans); }
        teinter(b.robe);
        var f = montrerFeuille('<div class="feuille-biere"><span class="poignee" aria-hidden="true"></span>'
          + '<p class="fs-nom">' + esc(b.nom) + '</p><p class="fs-sous">' + esc([b.brasserie, b.type].filter(Boolean).join(" · ")) + "</p>"
          + '<div class="fs-milieu"><svg class="fs-formes" viewBox="0 0 184 184" width="132" height="132" aria-hidden="true"><path class="b"/><path class="t"/></svg>'
          + '<div><div class="fs-chiffre"><b class="n">0</b><small> %</small></div><p class="fs-dit">Ton match</p></div></div>'
          + '<p class="fs-phrase">' + esc(m.phrase) + "</p>"
          + (maNote ? '<p class="fs-deja">Ta note : ' + O.nombreFr(maNote.note) + " · " + esc(quandCourt(maNote.le)) + "</p>" : '<p class="fs-deja">Gardée dans Mes bières : note-la quand tu l\'auras goûtée.</p>')
          + '<div class="fs-boutons"><a class="bouton-plein" href="/b/' + esc(b.slug) + '/" style="background:' + b.sur + ";color:" + b.robe + '">Voir sa fiche</a>'
          + '<button type="button" class="bouton-contour noter-scan">' + (maNote ? "Changer ma note" : "Noter") + "</button></div>"
          + '<button type="button" class="bouton-texte suivante">Scanner une autre</button></div>', b.robe, b.sur);
        var svg = f.querySelector(".fs-formes"), pb = svg.querySelector(".b"), pt = svg.querySelector(".t");
        pb.setAttribute("fill", b.forme);
        ["fill", "none", "stroke", b.sur, "stroke-width", "2.6", "stroke-linejoin", "round", "vector-effect", "non-scaling-stroke"]
          .forEach(function (v, i, a) { if (i % 2 === 0) pt.setAttribute(v, a[i + 1]); });
        garder(O.vivant(svg, 30, function (t) { pb.setAttribute("d", O.forme184(b.valeurs, t, 0)); pt.setAttribute("d", O.forme184(e.gout, t, 1.3)); }));
        O.compter(f.querySelector(".n"), m.pc, 0.25);
        f.querySelector(".noter-scan").addEventListener("click", function () {
          O.ouvrirNote(b, function () { fermerFeuille(); });
        });
        tirerPourFermer(f.querySelector(".feuille-biere"), fermerFeuille);
      }, function () {
        montrerFeuille('<div class="feuille-neutre"><p class="fs-titre">Pas de connexion</p><p class="fs-sous">Houblà a besoin du réseau pour reconnaître la bière.</p>'
          + '<button type="button" class="bouton-plein suivante">D\'accord</button></div>', "#FFFFFF");
      });
    }
    void montrerRecherche;
  }
  /* Tirer la feuille vers le bas la renvoie (la poignée, comme le résultat d'un scan dans l'app). */
  function tirerPourFermer(boite, fermer) {
    var depart = null;
    boite.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a,button")) return;
      depart = { y: e.clientY, id: e.pointerId };
    });
    boite.addEventListener("pointermove", function (e) {
      if (!depart || e.pointerId !== depart.id) return;
      var dy = Math.max(0, e.clientY - depart.y);
      boite.parentNode.style.transform = "translateY(" + dy + "px)";
    });
    function fin(e) {
      if (!depart || e.pointerId !== depart.id) return;
      var dy = e.clientY - depart.y;
      depart = null;
      boite.parentNode.style.transform = "";
      if (dy > 90) fermer();
    }
    boite.addEventListener("pointerup", fin);
    boite.addEventListener("pointercancel", fin);
  }
  var MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  function quandCourt(le) {
    if (!le) return "";
    var d = new Date(le + "T12:00:00"), auj = new Date();
    auj.setHours(12, 0, 0, 0);
    var j = Math.round((auj - d) / 864e5);
    if (j <= 0) return "aujourd'hui";
    if (j === 1) return "hier";
    return "le " + d.getDate() + " " + MOIS_COURTS[d.getMonth()];
  }

  // ——— MES BIÈRES ———
  var confirmerEffacer = false;
  function pageMesBieres(page) {
    var e = tonEtat(), c = e.c;
    teinter(c.robe);
    var notes = O.valeursNotes(e.notes).sort(function (a, b) { return (b.t || 0) - (a.t || 0) || (b.le || "").localeCompare(a.le || "") || a.nom.localeCompare(b.nom); });
    var scans = tesScans(), parSlug = {};
    if (O.index()) O.index().forEach(function (b) { parSlug[b.slug] = b; });
    var aGouter = Object.keys(scans).filter(function (s) { return !e.notes[s] && parSlug[s]; })
      .map(function (s) { return { b: parSlug[s], scan: scans[s] }; })
      .sort(function (a, b) { return (b.scan.t || 0) - (a.scan.t || 0); });
    page.innerHTML = '<header class="haut-couleur grand" style="background:' + c.robe + ";color:" + c.sur + '">'
      + '<h1>Mes bières</h1><svg class="ta-forme" viewBox="0 0 184 184" width="200" height="200" aria-hidden="true"><path/></svg>'
      + '<p class="ta-forme-titre">Ta forme</p><p class="tes-mots">' + esc(O.distinctifs(e.gout).join(" · ")) + "</p></header>"
      + vagueDuHaut(c.robe)
      + '<div class="contenu">'
      + (aGouter.length ? '<p class="titre-partie">Scannées, pas encore goûtées</p><div class="liste-blanche a-gouter">'
         + aGouter.map(function (x) { return ligneAGouter(x, e); }).join("") + "</div>" : "")
      + (notes.length ? '<p class="titre-partie">Tes notes</p><div class="liste-blanche tes-notes">' + notes.map(ligneNote).join("") + "</div>"
         + '<p class="aide-liste">Le chiffre à droite : ta note. Chaque note bouge ta forme.</p>'
         : '<div class="premiers-pas"><p class="titre-partie">Tes premières notes</p>'
           + etape(1, "Scanne une bière", "ou cherche-la : Houblà te dit si elle va te plaire.")
           + etape(2, "Goûte-la", "")
           + etape(3, "Note-la", "ta forme bouge, et Houblà te connaît mieux.")
           + '<button type="button" class="bouton-plein vers-scanner" style="background:#1C1C1E;color:#fff">Scanner une bière</button></div>')
      + '<p class="titre-partie">Réglages</p><div class="liste-blanche reglages">'
      + '<button type="button" class="reglage refaire">Refaire le test</button>'
      + (notes.length || aGouter.length ? '<button type="button" class="reglage effacer">' + (confirmerEffacer ? "Toucher encore pour tout effacer" : "Effacer mes notes et mes scans") + "</button>" : "")
      + "</div>"
      + '<p class="prive-mes">Ton test, tes notes et tes scans restent dans ce navigateur : rien n\'est envoyé. Houblà existe aussi sur iPhone.</p>'
      + '<p class="sanitaire-mes">L\'abus d\'alcool est dangereux pour la santé, à consommer avec modération.</p>'
      + "</div>";
    garder(formeVivante(page.querySelector(".ta-forme"), e.gout, c.forme, c.sur, 1.3));
    brancherVagueDuHaut(page);
    page.querySelectorAll(".changer-note").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        var n = e.notes[b.getAttribute("data-slug")];
        if (n) O.ouvrirNote(n, function () { montrerOnglet(); });
      });
    });
    page.querySelectorAll(".noter-scan").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        var x = parSlug[b.getAttribute("data-slug")];
        if (x) O.ouvrirNote(x, function () { montrerOnglet(); });
      });
    });
    var vs = page.querySelector(".vers-scanner");
    if (vs) vs.addEventListener("click", function () { aller("scanner"); });
    page.querySelector(".refaire").addEventListener("click", function () { O.ouvrirTest(); });
    var eff = page.querySelector(".effacer");
    if (eff) eff.addEventListener("click", function () {
      if (!confirmerEffacer) { confirmerEffacer = true; eff.textContent = "Toucher encore pour tout effacer"; eff.classList.add("attention");
                               setTimeout(function () { confirmerEffacer = false; if (doc.body.contains(eff)) { eff.textContent = "Effacer mes notes et mes scans"; eff.classList.remove("attention"); } }, 4000);
                               return; }
      confirmerEffacer = false;
      O.garderNotes({});
      garderScans({});
      montrerOnglet();
    });
    if (!O.index() && Object.keys(scans).length) O.chargerIndex().then(function () { if (onglet === "mes") montrerOnglet(); });
  }
  function etape(n, titre, texte) {
    return '<div class="etape-mes"><span class="num">' + n + "</span><div><b>" + esc(titre) + "</b>" + (texte ? "<p>" + esc(texte) + "</p>" : "") + "</div></div>";
  }
  function ligneNote(n) {
    return '<div class="ligne note-ligne"><a class="ligne-lien" href="/b/' + esc(n.slug) + '/"><span class="verre">' + verre(n.robe, n.note) + "</span>"
      + '<span class="txt"><b>' + esc(n.nom) + "</b><span>" + esc([n.brasserie || n.type, quandCourt(n.le)].filter(Boolean).join(" · ")) + "</span></span></a>"
      + '<button type="button" class="note-chiffre-mes changer-note" data-slug="' + esc(n.slug) + '" aria-label="Changer ta note de ' + esc(n.nom) + '">' + O.nombreFr(n.note) + "</button></div>";
  }
  function ligneAGouter(x, e) {
    var b = x.b, m = O.calculer(b, e.gout, e.s.preferee, e.notes);
    return '<div class="ligne note-ligne"><a class="ligne-lien" href="/b/' + esc(b.slug) + '/"><span class="verre">' + verre(b.robe, 0) + "</span>"
      + '<span class="txt"><b>' + esc(b.nom) + "</b><span>" + "Ton match " + m.pc + " % · " + esc(b.brasserie || b.type) + "</span></span></a>"
      + '<button type="button" class="pastille-noter noter-scan" data-slug="' + esc(b.slug) + '">Noter</button></div>';
  }
  /* Un petit verre rempli jusqu'à ta note (vide et en pointillé : pas encore goûtée). */
  var nVerres = 0;
  function verre(robe, note) {
    var id = "v" + (++nVerres), h = 3 + 22 * (1 - (note || 0) / 5);
    return '<svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true"><clipPath id="' + id + '"><path d="M3 3h20l-2 26.5Q20.8 31 18.6 31H7.4Q5.2 31 5 29.5Z"/></clipPath>'
      + (note ? '<rect y="' + h.toFixed(1) + '" width="26" height="34" fill="' + robe + '" clip-path="url(#' + id + ')"/>' : "")
      + '<path d="M3 3h20l-2 26.5Q20.8 31 18.6 31H7.4Q5.2 31 5 29.5Z" fill="none" stroke="rgba(17,17,20,.38)" stroke-width="1.5"'
      + (note ? "" : ' stroke-dasharray="3 3"') + ' stroke-linejoin="round"/></svg>';
  }

  // ——— Revenir d'une page de bière (où l'on a pu noter) : on redessine ———
  window.addEventListener("pageshow", function (e) { if (e.persisted && racine.className === "corps") montrerOnglet(); });
  window.addEventListener("storage", function (e) {
    if (e.key === "houbla.notes.1" || e.key === CLE_SCANS || e.key === "houbla.test.1") rendre();
  });

  rendre();
})();
