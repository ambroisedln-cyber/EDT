import sys,re
src,dst=sys.argv[1],sys.argv[2]
s=open(src,encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,('NOT FOUND',a[:90],s.count(a)); s=s.replace(a,b)

# ---- icônes fines (traits) pour la barre d'onglets ----
def svg(p): return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'
IC={
 'jour':svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>'),
 'semaine':svg('<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4M9.5 9.5v11M14.5 9.5v11"/>'),
 'mois':svg('<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4"/><path d="M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 16.5h.01M12 16.5h.01" stroke-width="2.4"/>'),
 'annee':svg('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
 'todo':svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.2l2.5 2.5 4.9-5.2"/>'),
 'rech':svg('<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.5 15.5l4.5 4.5"/>'),
}
m=re.search(r"const TABS=\[(.*?)\];",s)
assert m
t=m.group(0)
for k,v in IC.items():
    t=re.sub(r"\['"+k+r"','[^']*'","['"+k+"','"+v+"'",t)
s=s.replace(m.group(0),t)

CSS='''
/* ===== Affinage du design ===== */
html,body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
:root{--sh:0 1px 2px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.05);--tint:color-mix(in srgb,var(--c,var(--ac)) 11%,transparent)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--sh:0 0 0 .5px rgba(255,255,255,.06)}}
h1{font-size:27px;font-weight:700;letter-spacing:-.6px}
.sub{font-size:13.5px}
.card{border-radius:16px;padding:14px 16px;box-shadow:var(--sh)}
.card h2{font-size:12px;font-weight:600;letter-spacing:.45px;margin-bottom:10px}
.it{padding:10px 0;border-bottom:.5px solid var(--ln)}
.nv button{font-size:20px}.nv .td{font-size:15px;font-weight:500}
/* boutons : teintés et discrets au lieu de pleins */
.add{gap:8px;align-items:center}
.add button,.btn{background:var(--tint);color:var(--c,var(--ac));border-radius:10px;padding:8px 14px;min-height:38px;font-size:15px;font-weight:600;transition:opacity .15s,transform .1s}
.add button:active,.btn:active,.evg>button:active,.ev .ea>button:active{opacity:.6;transform:scale(.98)}
.add input,.add select,.nt{border-radius:10px;padding:9px 12px;min-height:38px}
.add input[type=text]{font-size:16px}
textarea{border-radius:12px}
.plus{width:24px;height:24px;font-size:16px;font-weight:500;background:var(--tint);color:var(--ac)}
/* pastilles et étiquettes plus fines */
.chip{padding:3px 9px;font-size:13px;border-radius:8px;margin:0 5px 6px 0}
.tag{font-size:11px;padding:2px 7px;border-radius:6px;font-weight:500}
.ck{width:20px;height:20px;border-width:1.5px}
.x{font-size:18px;opacity:.7}
/* événements */
.ev{background:color-mix(in srgb,var(--c) 5%,var(--card));border-left-width:3px;border-radius:10px;padding:10px 12px}
.ev .ea{gap:6px}
.ev .ea>button,.ev .ea>label{background:color-mix(in srgb,var(--c,var(--ac)) 8%,var(--card));min-height:34px;font-size:13.5px;font-weight:500;border-radius:9px}
.ev .ea .del{width:40px;font-size:15px}
.evg>button,.evg>label{min-height:40px;font-size:14px;font-weight:500;border-radius:10px}
.evg .pri{background:var(--ac);color:#fff}
.ef .fb button{min-height:42px;border-radius:11px}
/* formulaires dans les événements */
.ev .add button{padding:6px 12px;min-height:34px;font-size:14px}
.ev .add input{min-height:34px;padding:7px 10px}
/* boutons de la sauvegarde et du compte */
[data-bkx],[data-acc="cfg"]{background:var(--tint)!important;color:var(--ac)!important;font-weight:600}
[data-acc="out"]{background:color-mix(in srgb,#ff3b30 10%,transparent)!important}
/* barre d'onglets */
nav{border-top:.5px solid var(--ln);padding-top:5px}
nav button{font-size:10px;font-weight:500;gap:1px;padding:3px 0}
nav button i{display:flex;height:26px;align-items:center}
nav button i svg{width:24px;height:24px}
nav .on i svg{stroke-width:2.1}
/* écran de connexion */
.af input{box-shadow:var(--sh)}
.af .pri{border-radius:12px;padding:13px;font-weight:600}
'''
rep('</style>\n</head>',CSS+'</style>\n</head>')
open(dst,'w',encoding='utf-8').write(s); print('ok',len(s))
