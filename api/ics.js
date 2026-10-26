// Génère un fichier calendrier (.ics) à partir des paramètres du lien,
// pour qu'un événement partagé puisse être ajouté au Calendrier Apple.
const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const pad = n => String(n).padStart(2, '0');
const okDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const okTime = h => /^\d{2}:\d{2}$/.test(h || '');
const ymd = d => d.replace(/-/g, '');
function addDays(d, n) { const [y, m, j] = d.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, j + n)); return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()); }
function addMin(d, h, min) { const [y, m, j] = d.split('-').map(Number), [hh, mm] = h.split(':').map(Number); const t = new Date(Date.UTC(y, m - 1, j, hh, mm + min)); return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' + pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + '00'; }
const RR = { d: 'DAILY', w: 'WEEKLY', m: 'MONTHLY', y: 'YEARLY' };
const VTZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Paris', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];
module.exports = (req, res) => {
  const q = req.query || {};
  const t = String(q.t || 'Événement').slice(0, 200), d = String(q.d || ''), h = String(q.h || ''), e = String(q.e || '');
  if (!okDate(d)) { res.status(400).send('Date invalide'); return; }
  const min = Math.max(5, Math.min(1440 * 7, parseInt(q.m, 10) || 60));
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Emploi du temps//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  if (okTime(h)) L.push(...VTZ);
  L.push('BEGIN:VEVENT', 'UID:' + ymd(d) + (h || '').replace(':', '') + '-' + Math.random().toString(36).slice(2) + '@edt', 'DTSTAMP:' + now);
  if (okTime(h)) { L.push('DTSTART;TZID=Europe/Paris:' + ymd(d) + 'T' + h.replace(':', '') + '00', 'DTEND;TZID=Europe/Paris:' + addMin(d, h, min)); }
  else { L.push('DTSTART;VALUE=DATE:' + ymd(d), 'DTEND;VALUE=DATE:' + addDays(okDate(e) ? e : d, 1)); }
  L.push('SUMMARY:' + esc(t));
  if (RR[q.rc]) L.push('RRULE:FREQ=' + RR[q.rc]);
  if (q.l) L.push('LOCATION:' + esc(String(q.l).slice(0, 300)));
  if (q.n) L.push('DESCRIPTION:' + esc(String(q.n).slice(0, 1000)));
  if (okTime(h)) L.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(t), 'END:VALARM');
  L.push('END:VEVENT', 'END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="evenement.ics"');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(L.join('\r\n') + '\r\n');
};
