import sys,re
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,('NOT FOUND',a[:90],s.count(a)); s=s.replace(a,b)

SB_URL='https://rbofulzwbhrnlgbjqasn.supabase.co'
SB_KEY='sb_publishable_xxOalgbQ9LqsXMYpST_Xaw_HEemlkQt'

# ---- remove personal defaults ----
s=re.sub(r"const DEF=\{[^;]*\};","let DEF={};const applyCfg=()=>{DEF=(S.cfg&&S.cfg.w)||{}};applyCfg();",s,count=1)
assert 'applyCfg();' in s
rep("const orc=k=>parse(k).getDay()===6?' <b class=\"orc\">ORC</b>':'';","const orc=k=>'';")
rep("(parse(k).getDay()===6?'ORC ':'')","''")
s=re.sub(r"const CG0=\{[^;]*\};","const CG0={};",s,count=1)
rep("(S.city||'Rueil-Malmaison')","(S.city||'Paris')")
assert 'Rueil' not in s and 'ORC' not in s.replace('.orc{','')
rep("function render(){","function render(){applyCfg();")

# ---- per-account local cache ----
rep("localStorage.getItem('edt')","localStorage.getItem(LSK)")
rep("localStorage.setItem('edt',","localStorage.setItem(LSK,")
rep("function dbPush(){}","function dbPush(){if(window.__push)window.__push()}")

# ---- account section in the backup card ----
rep('<div class="bkm sub" style="margin:8px 0 0"></div>',
    '<div class="bkm sub" style="margin:8px 0 0"></div><h2 style="margin-top:16px">Mon compte</h2><p class="sub" style="margin:0 0 10px">Connecté : \'+esc(UEMAIL)+\'</p><div class="add" style="margin-top:0"><button data-acc="cfg" style="background:var(--ac);color:#fff;border-radius:10px;padding:10px 14px">Mes horaires et ma ville</button><button data-acc="out" style="background:var(--bg);color:#ff3b30;border-radius:10px;padding:10px 14px">Se déconnecter</button></div>')
# import must re-apply settings
rep("S=Object.assign({days:{},dates:[],vac:[],g:{m:[],j:[],a:[]}},d);mig();save();render();",
    "S=Object.assign({days:{},dates:[],vac:[],g:{m:[],j:[],a:[]}},d);mig();save();render();if(!S.cfg)openCfg();")

BOOT='''<script src="supabase.js"></script>
<script>
const SB_URL='%s',SB_KEY='%s';
let LSK='edt:anon',UID=null,UEMAIL='';
try{const t=JSON.parse(localStorage.getItem('edt-auth')||'null');if(t&&t.user&&t.user.id){UID=t.user.id;UEMAIL=t.user.email||'';LSK='edt:'+UID;
  if(!localStorage.getItem(LSK)&&localStorage.getItem('edt')){localStorage.setItem(LSK,localStorage.getItem('edt'));localStorage.removeItem('edt')}}}catch(e){}
</script>
''' % (SB_URL,SB_KEY)
rep('<script>\nconst $=s=>',BOOT+'<script>\nconst $=s=>')

CSS='''#auth,#cfgo{position:fixed;inset:0;z-index:100;background:var(--bg);overflow-y:auto;padding:calc(24px + env(safe-area-inset-top,0px)) 16px 40px}
#auth .box,#cfgo .box{max-width:420px;margin:0 auto}
#auth h1,#cfgo h1{text-transform:none}
.af{display:flex;flex-direction:column;gap:10px}.af input{background:var(--card);border:0;border-radius:12px;padding:14px;font-size:16px;outline:none}
.af .pri{background:var(--ac);color:#fff;border-radius:12px;padding:14px;font-weight:700;text-align:center;font-size:16px}
.af .lnk{color:var(--ac);text-align:center;padding:8px;font-size:15px}
.amsg{min-height:20px;color:var(--mu);font-size:14px;text-align:center}.amsg.err{color:#ff3b30}
.cday{display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--ln)}.cday:last-child{border:0}
.cday label{flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-weight:600}.cday input[type=checkbox]{width:22px;height:22px}
.cday input[type=time]{background:var(--bg);border:0;border-radius:8px;padding:6px 4px;font-size:15px;width:84px;min-width:0;flex:none}.cday.off input[type=time]{opacity:.35}
'''
rep('</style>\n</head>',CSS+'</style>\n</head>')

AUTH=r'''
<div id="auth" hidden><div class="box">
<div style="text-align:center;margin:20px 0 24px"><img src="icon-180.png" alt="" style="width:76px;height:76px;border-radius:18px"><h1 style="margin:12px 0 4px">Mon emploi du temps</h1><p class="sub" id="asub">Connecte-toi pour retrouver ton planning.</p></div>
<div class="af" id="aform">
<input type="email" id="aem" placeholder="Adresse mail" autocomplete="email" inputmode="email" autocapitalize="off">
<input type="password" id="apw" placeholder="Mot de passe (6 caractères min.)" autocomplete="current-password">
<button class="pri" id="ago">Se connecter</button>
<div class="amsg" id="amsg"></div>
<button class="lnk" id="asw">Pas encore de compte ? Créer un compte</button>
<button class="lnk" id="afg" style="color:var(--mu);font-size:14px">Mot de passe oublié ?</button>
</div>
<div class="af" id="anew" hidden>
<input type="password" id="anp" placeholder="Nouveau mot de passe" autocomplete="new-password">
<button class="pri" id="ansave">Enregistrer le mot de passe</button>
<div class="amsg" id="anmsg"></div>
</div>
</div></div>
<div id="cfgo" hidden><div class="box">
<h1 style="margin:10px 0 4px">Tes horaires</h1><p class="sub">Coche tes jours de travail et indique tes horaires habituels. Tu pourras toujours modifier un jour précis dans l’appli.</p>
<div class="card" id="cdays"></div>
<div class="card"><h2>Ta ville (pour la météo)</h2><div class="af"><input type="text" id="ccity" placeholder="Ex. Paris" style="background:var(--bg)"></div></div>
<div class="af"><button class="pri" id="csave">Enregistrer</button><div class="amsg" id="cmsg"></div></div>
</div></div>
<script>
(function(){
const sb=supabase.createClient(SB_URL,SB_KEY,{auth:{storageKey:'edt-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.SB=sb;
const show=(id,on)=>{const e=document.getElementById(id);if(e)e.hidden=!on};
let mode='in';
const am=(t,err)=>{const m=$('#amsg');m.textContent=t||'';m.className='amsg'+(err?' err':'')};
const frErr=e=>{const m=(e&&e.message)||'';if(/Invalid login/i.test(m))return 'Adresse mail ou mot de passe incorrect.';if(/not confirmed/i.test(m))return 'Ton adresse mail n’est pas encore confirmée : ouvre le lien reçu par mail.';if(/already registered|already been registered/i.test(m))return 'Un compte existe déjà avec cette adresse : connecte-toi.';if(/at least 6|Password should/i.test(m))return 'Le mot de passe doit faire au moins 6 caractères.';if(/rate limit/i.test(m))return 'Trop de tentatives, réessaie dans quelques minutes.';if(/invalid.*email|Unable to validate email/i.test(m))return 'Adresse mail invalide.';if(/fetch|network/i.test(m))return 'Pas de connexion Internet.';return m||'Une erreur est survenue.'};
const setMode=m=>{mode=m;$('#ago').textContent=m==='in'?'Se connecter':'Créer mon compte';$('#asw').textContent=m==='in'?'Pas encore de compte ? Créer un compte':'Déjà un compte ? Se connecter';$('#apw').autocomplete=m==='in'?'current-password':'new-password';$('#afg').hidden=m!=='in';am('')};
$('#asw').onclick=()=>setMode(mode==='in'?'up':'in');
const back=location.origin+location.pathname;
$('#ago').onclick=async()=>{const email=$('#aem').value.trim(),password=$('#apw').value;if(!email||!password){am('Renseigne ton adresse mail et un mot de passe.',1);return}
  $('#ago').disabled=true;am(mode==='in'?'Connexion…':'Création du compte…');
  try{if(mode==='in'){const{error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;location.replace(back);return}
    const{data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:back}});if(error)throw error;
    if(data&&data.session){location.replace(back);return}
    if(data&&data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length){am('Un compte existe déjà avec cette adresse : connecte-toi.',1);setMode('in');return}
    am('Compte créé ✓ Un mail de confirmation t’a été envoyé : ouvre le lien qu’il contient, puis reviens te connecter ici.');setMode('in');
  }catch(e){am(frErr(e),1)}finally{$('#ago').disabled=false}};
$('#apw').onkeydown=e=>{if(e.key==='Enter')$('#ago').click()};
$('#afg').onclick=async()=>{const email=$('#aem').value.trim();if(!email){am('Écris d’abord ton adresse mail ci-dessus.',1);return}
  try{const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:back});if(error)throw error;am('Si un compte existe, un mail pour changer ton mot de passe vient d’être envoyé.')}catch(e){am(frErr(e),1)}};
$('#ansave').onclick=async()=>{const p=$('#anp').value,m=$('#anmsg');if(p.length<6){m.textContent='Au moins 6 caractères.';return}
  const{error}=await sb.auth.updateUser({password:p});if(error){m.textContent=frErr(error);return}m.textContent='Mot de passe modifié ✓';setTimeout(()=>location.replace(back),900)};

/* --- réglages : jours, horaires, ville --- */
const JL=[[1,'Lundi'],[2,'Mardi'],[3,'Mercredi'],[4,'Jeudi'],[5,'Vendredi'],[6,'Samedi'],[0,'Dimanche']];
window.openCfg=()=>{const w=(S.cfg&&S.cfg.w)||(S.cfg?{}:{1:['09:00','17:00'],2:['09:00','17:00'],3:['09:00','17:00'],4:['09:00','17:00'],5:['09:00','17:00']});
  $('#cdays').innerHTML=JL.map(([d,n])=>{const on=!!w[d],v=w[d]||['09:00','17:00'];return '<div class="cday'+(on?'':' off')+'" data-d="'+d+'"><label><input type="checkbox"'+(on?' checked':'')+'> '+n+'</label><input type="time" value="'+v[0]+'"> <span style="color:var(--mu)">–</span> <input type="time" value="'+v[1]+'"></div>'}).join('');
  $('#cdays').querySelectorAll('input[type=checkbox]').forEach(c=>c.onchange=()=>c.closest('.cday').classList.toggle('off',!c.checked));
  $('#ccity').value=(S.cfg&&S.cfg.city)||S.city||'';$('#cmsg').textContent='';show('cfgo',1)};
$('#csave').onclick=()=>{const w={};let bad=0;$('#cdays').querySelectorAll('.cday').forEach(r=>{const c=r.querySelector('input[type=checkbox]'),t=r.querySelectorAll('input[type=time]');if(c.checked){if(!t[0].value||!t[1].value)bad=1;w[r.dataset.d]=[t[0].value,t[1].value]}});
  if(bad){$('#cmsg').textContent='Indique une heure de début et de fin pour chaque jour coché.';return}
  const city=$('#ccity').value.trim();if(!city){$('#cmsg').textContent='Indique ta ville.';return}
  S.cfg={w,city};if(city!==S.city){S.city=city;S.auto=0}applyCfg();save();render();show('cfgo',0)};
document.addEventListener('click',async e=>{const b=e.target.closest('[data-acc]');if(!b)return;
  if(b.dataset.acc==='cfg')openCfg();
  else if(b.dataset.acc==='out'){if(!confirm('Se déconnecter ? Tes données restent enregistrées dans ton compte.'))return;try{await sb.auth.signOut()}catch(er){}try{localStorage.removeItem(LSK);localStorage.removeItem('edt-auth')}catch(er){}location.replace(back)}});

/* --- synchronisation --- */
let pushing=null,again=false;
const push=async()=>{if(!UID)return;if(pushing){again=true;return}pushing=1;try{await sb.from('user_data').upsert({user_id:UID,data:S,updated_at:new Date().toISOString()})}catch(e){}pushing=null;if(again){again=false;push()}};
window.__push=push;
const norm=()=>{S.g=Object.assign({m:[],j:[],a:[],p:[],c:[],v:[]},S.g||{});S.vac=S.vac||[];S.dates=S.dates||[];S.days=S.days||{}};
const pull=async()=>{try{const{data,error}=await sb.from('user_data').select('data').eq('user_id',UID).maybeSingle();if(error)throw error;
    const r=data&&data.data;
    if(r&&(r.ts||0)>(S.ts||0)){S=r;norm();try{localStorage.setItem(LSK,JSON.stringify(S))}catch(e){}mig();render();return 1}
    if(S.ts&&(!r||(r.ts||0)<S.ts))push();return 1}catch(e){return 0}};

/* --- fichiers joints : copie dans le compte --- */
const _fput=fput,_fget=fget,_fdel=fdel,fp=id=>UID+'/'+id;
fput=async(id,b)=>{await _fput(id,b);if(UID)sb.storage.from('files').upload(fp(id),b,{upsert:true,contentType:b.type||'application/octet-stream'}).catch(()=>{})};
fget=async id=>{let b=null;try{b=await _fget(id)}catch(e){}if(!b&&UID){try{const r=await sb.storage.from('files').download(fp(id));if(r&&r.data){b=r.data;_fput(id,b).catch(()=>{})}}catch(e){}}return b};
fdel=async id=>{await _fdel(id);if(UID)sb.storage.from('files').remove([fp(id)]).catch(()=>{})};

/* --- démarrage --- */
sb.auth.onAuthStateChange((ev,ses)=>{if(ev==='PASSWORD_RECOVERY'){show('auth',1);show('aform',0);show('anew',1);$('#asub').textContent='Choisis un nouveau mot de passe.'}});
(async()=>{let ses=null;try{ses=(await sb.auth.getSession()).data.session}catch(e){}
  if(location.hash&&/type=recovery/.test(location.hash))return;
  if(!ses){if(UID&&!navigator.onLine){start();return}show('auth',1);return}
  if(ses.user.id!==UID){location.replace(back);return}
  if(location.hash||location.search)history.replaceState(null,'',back);
  UEMAIL=ses.user.email||UEMAIL;start()})();
async function start(){show('auth',0);render();await pull();if(!S.cfg)openCfg()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&UID&&navigator.onLine)pull()});
})();
</script>
'''
# insert auth layer right before the service worker registration line (end of main script)
idx=s.rindex("if('serviceWorker' in navigator")
end=s.index('</script>',idx)+len('</script>')
s=s[:end]+AUTH+s[end:]
open(dst,'w',encoding='utf-8').write(s); print('ok',len(s))
