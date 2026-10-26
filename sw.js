const C='edt-v3';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon-180.png','icon-192.png','supabase.js'])))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});
// Rappels : affichage des notifications envoyées par le serveur
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){d={title:'Planning',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'Planning',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',data:{url:d.url||'./'},tag:d.tag||undefined}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus()}return self.clients.openWindow(url)}))});
