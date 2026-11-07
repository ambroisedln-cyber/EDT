/* Carnet de route — mode hors ligne */
const V = "carnet-v1";
const SHELL = ["./", "index.html", "supabase.js", "manifest.json", "fiches-pays.json", "icon-180.png", "icon-192.png", "icon-512.png"];
const DOCS = "carnet-docs";
const scope = () => self.registration.scope;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== DOCS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const docKey = path => new URL("_doc/" + encodeURIComponent(path), scope()).href;

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);

  // Billets, photos et PDF stockés sur ton compte : réseau d'abord, copie gardée pour le hors ligne
  const m = u.pathname.match(/\/storage\/v1\/object\/sign\/voyage\/(.+)$/);
  if (m) {
    const key = docKey(decodeURIComponent(m[1]));
    e.respondWith(fetch(req).then(r => { if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(DOCS).then(ca => ca.put(key, c)); } return r; })
      .catch(() => caches.open(DOCS).then(ca => ca.match(key)).then(r => r || Response.error())));
    return;
  }
  if (u.origin === self.location.origin && u.pathname.includes("/_doc/")) {
    e.respondWith(caches.open(DOCS).then(ca => ca.match(u.href)).then(r => r || new Response("Document non disponible hors ligne", { status: 404 })));
    return;
  }
  // Polices Google : cache d'abord
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(V).then(ca => ca.match(req).then(hit => hit || fetch(req).then(r => { ca.put(req, r.clone()); return r; }))));
    return;
  }
  if (u.origin !== self.location.origin || u.pathname.includes("/api/")) return;

  // Page : réseau d'abord (pour avoir la dernière version), sinon la copie
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(ca => ca.put("index.html", c)); return r; })
      .catch(() => caches.open(V).then(ca => ca.match("index.html"))));
    return;
  }
  // Autres fichiers de l'appli : copie tout de suite, mise à jour en arrière-plan
  e.respondWith(caches.open(V).then(ca => ca.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) ca.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});

// L'appli demande de garder des documents pour le hors ligne
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "cache-docs" && Array.isArray(d.items)) {
    e.waitUntil(caches.open(DOCS).then(async ca => {
      for (const it of d.items) {
        const key = docKey(it.path);
        if (await ca.match(key)) continue;
        try { const r = await fetch(it.url); if (r.ok) await ca.put(key, r); } catch (err) {}
      }
    }));
  }
});
