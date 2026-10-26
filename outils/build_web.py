import sys
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding='utf-8').read()
if s.count('<!DOCTYPE html>'):
    i=s.index('<!DOCTYPE html>'); j=s.rindex('</body>\n</html>')+len('</body>\n</html>'); s=s[i:j]+'\n'
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,('NOT FOUND',a[:80],s.count(a)); s=s.replace(a,b)
rep('<title>Mon emploi du temps</title>','''<title>Mon emploi du temps</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Planning">
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">''')
a=s.index("async function upFiles(files,msg){"); b=s.index("async function addVac(")
s=s[:a]+"""const IDB=()=>new Promise((ok,ko)=>{const r=indexedDB.open('edt-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)});
async function fput(id,blob){const db=await IDB();return new Promise((ok,ko)=>{const t=db.transaction('f','readwrite');t.objectStore('f').put(blob,id);t.oncomplete=ok;t.onerror=()=>ko(t.error)})}
async function fget(id){const db=await IDB();return new Promise((ok,ko)=>{const r=db.transaction('f').objectStore('f').get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function fdel(id){try{const db=await IDB();db.transaction('f','readwrite').objectStore('f').delete(id)}catch(e){}}
async function fall(){const db=await IDB();return new Promise((ok,ko)=>{const o={},r=db.transaction('f').objectStore('f').openCursor();r.onsuccess=()=>{const c=r.result;if(c){o[c.key]=c.value;c.continue()}else ok(o)};r.onerror=()=>ko(r.error)})}
async function upFiles(files,msg){const out=[];if(!files.length)return out;
  try{for(const f of files){if(f.size>25e6){msg.textContent='Fichier trop volumineux.';return null}const b=await prep(f),id='f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);await fput(id,b);out.push({id,n:f.name.slice(0,40),t:b.type||f.type})}}catch(e){msg.textContent='Enregistrement du fichier impossible.';return null}
  return out}
document.addEventListener('click',async e=>{const a=e.target.closest('a[data-fid]');if(!a)return;e.preventDefault();e.stopPropagation();
  const w=window.open('','_blank');try{const b=await fget(a.dataset.fid);if(!b){if(w)w.close();alert('Fichier introuvable sur cet appareil.');return}const u=URL.createObjectURL(b);if(w)w.location=u;else location.href=u}catch(er){if(w)w.close()}},true);
"""+s[b:]
rep('''href="/_blob/'+f.id+'" target="_blank" rel="noopener">''','''href="#" data-fid="'+esc(f.id)+'">''')
a=s.index("async function delAsset(id){"); b=s.index("\n",a)
s=s[:a]+"async function delAsset(id){await fdel(id)}"+s[b:]
a=s.index("    const mcp=typeof claude!=='undefined'?await claude.use('mcp'):null;"); b=s.index("    WXH[ck]=html;put(html);")
s=s[:a]+r"""    let e0=WXP[city];
    if(!e0||Date.now()-e0.t>108e5)e0=WXP[city]={t:Date.now(),p:(async()=>{
      const g=await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&format=json&name='+encodeURIComponent(city.split(',')[0].trim()))).json();
      const p=g&&g.results&&g.results[0];if(!p){const er=new Error('nf');er.code='nf';throw er}
      const r=await (await fetch('https://api.open-meteo.com/v1/forecast?latitude='+p.latitude+'&longitude='+p.longitude+'&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=16')).json();
      if(!r||!r.daily){const er=new Error('empty');er.code='empty';throw er}
      return r})()};
    let loc;try{loc=await e0.p}catch(er){if(WXP[city]===e0)delete WXP[city];throw er}
    const dd=loc.daily,ix=(dd.time||[]).indexOf(k);
    if(ix<0){msg('Prévisions disponibles pour aujourd’hui et les 15 jours suivants.');return}
    const W=WMO(dd.weather_code[ix]),R=v=>Math.round(v),tg=q=>'<span class="tag">'+esc(q)+'</span> ';
    const html='<div style="color:var(--tx);font-size:16px"><div style="display:flex;align-items:center;gap:14px"><div style="font-size:44px;line-height:1">'+W[0]+'</div><div style="flex:1"><div style="font-size:26px;font-weight:700">'+R(dd.temperature_2m_max[ix])+'° <span style="font-size:17px;color:var(--mu);font-weight:500">/ '+R(dd.temperature_2m_min[ix])+'°</span></div><div style="color:var(--mu);font-size:14px">'+esc(W[1])+'</div></div></div><div style="margin-top:10px">'+(dd.precipitation_probability_max[ix]!=null?tg('🌧️ '+dd.precipitation_probability_max[ix]+' %'):'')+tg('Ressenti '+R(dd.apparent_temperature_max[ix])+'°')+tg('💨 '+R(dd.wind_speed_10m_max[ix])+' km/h')+(dd.uv_index_max[ix]!=null?tg('UV '+R(dd.uv_index_max[ix])):'')+'</div><div style="color:var(--mu);font-size:12px;margin-top:8px">Open-Meteo</div></div>';
"""+s[b:]
rep("const pl=r=>","const WMO=c=>c===0?['☀️','Ensoleillé']:c===1?['🌤️','Plutôt ensoleillé']:c===2?['⛅','Partiellement nuageux']:c===3?['☁️','Couvert']:c<=48?['🌫️','Brouillard']:c<=57?['🌦️','Bruine']:c<=67?['🌧️','Pluie']:c<=77?['❄️','Neige']:c<=82?['🌦️','Averses']:c<=86?['🌨️','Averses de neige']:['⛈️','Orage'];\nconst pl=r=>")
for l in s.split('\n'):
    pass
import re
s=re.sub(r"    if\(c==='server_not_connected'\).*\n","",s)
s=re.sub(r"    if\(c==='approval_required'.*\n","",s)
a=s.index("let dbDocs=null,dbT=null;"); b=s.rindex("</script>")
s=s[:a]+"function dbPush(){}let dbT=null;\n"+s[b:]
# backup section: replace the user's in-app section if present, else add a card
BK='''<p class="sub" style="margin:0 0 10px">Tes données sont enregistrées sur cet iPhone. Exporte-les régulièrement pour les garder en lieu sûr.</p><div class="add" style="margin-top:0"><button data-bkx="1" style="background:var(--ac);color:#fff;border-radius:10px;padding:10px 14px">Exporter</button><label style="background:var(--bg);border-radius:10px;padding:10px 14px;color:var(--ac);position:relative;overflow:hidden">Importer<input type="file" data-bki="1" accept=".json,application/json,text/plain" style="position:absolute;inset:0;opacity:0"></label></div><div class="bkm sub" style="margin:8px 0 0"></div>'''
m=re.search(r"<h2>Sauvegarde</h2>.*?</div></div>(?=</details>)",s)
if m: s=s[:m.start()]+'<h2>Sauvegarde</h2>'+BK+'</div>'+s[m.end():]
else: rep('<nav><div id="nav"></div></nav>','<div class="card" style="margin-top:28px"><h2>Sauvegarde de mes données</h2>'+BK+'</div>\n<nav><div id="nav"></div></nav>')
s=s.replace("</script>\n</body>","""
(function(){const m=t=>document.querySelectorAll('.bkm').forEach(e=>e.textContent=t);
  const b2d=b=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(b)});
  document.addEventListener('click',async ev=>{if(!ev.target.closest('[data-bkx]'))return;m('Préparation…');let files={};try{const all=await fall();for(const k in all)files[k]=await b2d(all[k])}catch(e){}
    const name='emploi-du-temps-'+key(new Date())+'.json',blob=new Blob([JSON.stringify({v:1,S,files})],{type:'application/json'}),file=new File([blob],name,{type:'application/json'});
    try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});m('Export terminé.');return}}catch(e){if(e&&e.name==='AbortError'){m('');return}}
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4e3);m('Export terminé.')});
  document.addEventListener('change',async e=>{if(!e.target.matches('[data-bki]'))return;const f=e.target.files[0];e.target.value='';if(!f)return;
    try{const o=JSON.parse(await f.text()),d=o.S||o;if(!d||typeof d.days!=='object')throw 0;
      if(!confirm('Remplacer les données de cet appareil par celles du fichier ?'))return;
      for(const k in (o.files||{})){try{await fput(k,await (await fetch(o.files[k])).blob())}catch(er){}}
      S=Object.assign({days:{},dates:[],vac:[],g:{m:[],j:[],a:[]}},d);mig();save();render();m('Import terminé ✓')}catch(er){m('Fichier non reconnu.')}});
})();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
</script>
</body>""",1)
s=s.replace("(typeof claude==='undefined'?","(true?")
DL_OLD="let DLC=null;try{if(typeof claude!=='undefined'&&claude.use)claude.use('downloads').then(d=>{DLC=d||null}).catch(()=>{})}catch(e){}"
DL_NEW="const DLC={save:async({filename,data})=>{const ty=/\\.csv$/i.test(filename)?'text/csv':'text/plain',b=new Blob([data],{type:ty+';charset=utf-8'}),f=new File([b],filename,{type:ty});try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e&&e.name==='AbortError'){const er=new Error('declined');er.code='declined';throw er}}const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4e3)}};"
s=s.replace(DL_OLD,DL_NEW)
assert 'claude' not in s.replace('Claude',''), [x for x in re.findall(r'.{30}claude.{30}',s)]
open(dst,'w',encoding='utf-8').write(s); print('ok',len(s),'inapp' if m else 'card')
