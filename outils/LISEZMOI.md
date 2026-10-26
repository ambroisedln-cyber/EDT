# Outils de mise en ligne

Pour adapter un HTML exporté depuis Claude (artefact) à la version en ligne :

```
python3 outils/build_web.py  export.html  etape1.html   # retire les fonctions propres à Claude (météo Open-Meteo, fichiers sur l'appareil, sauvegarde, PWA)
python3 outils/build_comptes.py etape1.html etape2.html  # ajoute les comptes Supabase, la synchro et les réglages par personne
python3 outils/build_design.py  etape2.html index.html   # affinage du design (boutons teintés, icônes fines)
```

Puis déposer `index.html` sur `main` : Vercel (projet `emploi-du-temps`) publie sur https://emploi-du-temps-tau.vercel.app.
Supabase : projet `emploi-du-temps` (rbofulzwbhrnlgbjqasn), table `public.user_data`, bucket privé `files`.

## Important
Depuis le 26/10/2026, `index.html` de ce dépôt est la **version de référence** : les modifications se font directement dessus (onglet À faire avec notes par tâche, design affiné, comptes…). Ne plus repartir d'un export de l'artefact Claude, sinon ces changements seraient perdus.
