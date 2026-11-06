// KGP Lab Bench service worker: works offline after the first visit.
// Bump VERSION whenever you publish changes so students get the update.
const VERSION='kgpbench-v2';
const FONTS='kgpbench-fonts';
const CORE=['./','index.html','styles.css','app.js','manifest.webmanifest','icons/favicon.svg','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(url.origin===location.origin){
    if(req.mode==='navigate'){ // network first so new versions show up, cache when offline
      e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put('index.html',c));return r}).catch(()=>caches.match('index.html')));return}
    e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(x=>x.put(req,c))}return r}).catch(()=>hit);return hit||net}));return}
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(c=>c.match(req).then(hit=>{const net=fetch(req).then(r=>{c.put(req,r.clone());return r}).catch(()=>hit);return hit||net})))}
});
