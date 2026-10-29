// Relais pour lire un agenda iCal (Google, iCloud, Outlook) depuis l'appli.
// Le navigateur ne peut pas lire ces adresses directement (CORS) : on les récupère ici.
// Seuls les hébergeurs d'agendas connus sont autorisés.
const ALLOW = [/^calendar\.google\.com$/, /^([a-z0-9-]+\.)*icloud\.com$/, /^outlook\.(office365|live|office)\.com$/, /^([a-z0-9-]+\.)*calendar\.yahoo\.com$/];

module.exports = async (req, res) => {
  let u = String((req.query || {}).u || '').trim().replace(/^webcals?:\/\//i, 'https://');
  let url;
  try { url = new URL(u); } catch (e) { res.status(400).send('Adresse invalide'); return; }
  if (url.protocol !== 'https:' || !ALLOW.some(r => r.test(url.hostname))) { res.status(400).send('Agenda non pris en charge'); return; }
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
    const r = await fetch(url.toString(), { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'EmploiDuTemps/1.0', Accept: 'text/calendar, */*' } });
    clearTimeout(t);
    if (!r.ok) { res.status(502).send('Agenda inaccessible (' + r.status + ')'); return; }
    const txt = await r.text();
    if (txt.length > 6e6 || !/BEGIN:VCALENDAR/.test(txt)) { res.status(422).send('Ce lien ne contient pas un agenda'); return; }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).send(txt);
  } catch (e) { res.status(504).send('Agenda injoignable'); }
};
