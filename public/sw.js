const CACHE='impulse-v6';
const scope=new URL('./',self.location.href).pathname;

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('impulse-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const res=await fetch(req);
        const cache=await caches.open(CACHE);
        cache.put(req,res.clone()).catch(()=>{});
        return res;
      }catch{
        return (await caches.match(req)) || (await caches.match(scope)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    try{
      const res=await fetch(req);
      if(res.ok){ const cache=await caches.open(CACHE); cache.put(req,res.clone()).catch(()=>{}); }
      return res;
    }catch{return Response.error();}
  })());
});

self.addEventListener('push',event=>{
  let d={title:'Impulse',body:'Tenés una actualización.',url:scope};
  try{d={...d,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(d.title,{body:d.body,data:{url:d.url||scope}}));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    if(cs.length) return cs[0].focus();
    return self.clients.openWindow(event.notification.data?.url||scope);
  }));
});
