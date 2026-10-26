// Flux calendrier privé (.ics) : /functions/v1/calendar-feed?token=...
// Le jeton (64 caractères hex) identifie le compte ; aucune autre donnée n'est exposée.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const esc = (s: unknown) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: string) => d.replace(/-/g, "");
const okD = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const okT = (h: unknown) => typeof h === "string" && /^\d{2}:\d{2}$/.test(h);
function pdur(s: unknown) { const t = String(s || "").toLowerCase(); let m = 0; const a = t.match(/(\d+)\s*h\s*(\d+)?/); if (a) m = +a[1] * 60 + (+a[2] || 0); else { const b = t.match(/(\d+)\s*m/); if (b) m = +b[1]; else if (/^\d+$/.test(t.trim())) m = +t.trim(); } return m || 60; }
function addMin(d: string, h: string, min: number) { const [y, mo, j] = d.split("-").map(Number), [hh, mm] = h.split(":").map(Number); const t = new Date(Date.UTC(y, mo - 1, j, hh, mm + min)); return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + "T" + pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + "00"; }
function addDays(d: string, n: number) { const [y, mo, j] = d.split("-").map(Number); const t = new Date(Date.UTC(y, mo - 1, j + n)); return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()); }
function hash(s: string) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
function fold(line: string) { const out: string[] = []; let cur = ""; for (const ch of line) { if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " " + ch; } else cur += ch; } out.push(cur); return out.join("\r\n"); }
const VTZ = ["BEGIN:VTIMEZONE", "TZID:Europe/Paris", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
const LAB: Record<string, string> = { Médical: "Rendez-vous médical", Resto: "Restaurant", Événement: "Événement", Autre: "Autre" };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response("Not found", { status: 404 });
  const { data: t } = await sb.from("calendar_tokens").select("user_id").eq("token", token).maybeSingle();
  if (!t) return new Response("Not found", { status: 404 });
  const { data: u } = await sb.from("user_data").select("data").eq("user_id", t.user_id).maybeSingle();
  const S: any = (u && u.data) || {};
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const from = new Date(now.getTime() - 120 * 864e5).toISOString().slice(0, 10);
  const L: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Emploi du temps//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Mon emploi du temps", "X-WR-TIMEZONE:Europe/Paris", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", ...VTZ];
  const ev = (uid: string, lines: string[]) => { L.push("BEGIN:VEVENT", "UID:" + uid + "@edt", "DTSTAMP:" + stamp, ...lines, "END:VEVENT"); };
  const days = S.days || {};
  for (const k of Object.keys(days).sort()) {
    if (!okD(k) || k < from) continue;
    (days[k].r || []).forEach((x: any) => {
      if (!x || !x.x) return;
      const uid = "r-" + k + "-" + hash((x.h || "") + "|" + x.x + "|" + (x.c || ""));
      const lines: string[] = [];
      if (okT(x.h)) lines.push("DTSTART;TZID=Europe/Paris:" + ymd(k) + "T" + x.h.replace(":", "") + "00", "DTEND;TZID=Europe/Paris:" + addMin(k, x.h, pdur(x.du)));
      else lines.push("DTSTART;VALUE=DATE:" + ymd(k), "DTEND;VALUE=DATE:" + addDays(k, 1));
      lines.push("SUMMARY:" + esc(x.x));
      const loc = x.tele ? "Téléconsultation" : (x.l || "");
      if (loc) lines.push("LOCATION:" + esc(loc));
      const desc = [LAB[x.c] || x.c || "", x.who ? "Avec " + x.who : "", x.tele && x.lk ? "Lien : " + x.lk : "", x.nt || ""].filter(Boolean).join("\n");
      if (desc) lines.push("DESCRIPTION:" + esc(desc));
      if (x.c) lines.push("CATEGORIES:" + esc(LAB[x.c] || x.c));
      ev(uid, lines);
    });
  }
  (S.vac || []).forEach((v: any) => {
    if (!okD(v.a) || !okD(v.b) || v.b < from) return;
    ev("v-" + v.a + "-" + hash(v.l || ""), ["DTSTART;VALUE=DATE:" + ymd(v.a), "DTEND;VALUE=DATE:" + addDays(v.b, 1), "SUMMARY:" + esc("Vacances" + (v.l ? " · " + v.l : "")), ...(v.l ? ["LOCATION:" + esc(v.l)] : []), "TRANSP:TRANSPARENT"]);
  });
  const y = now.getFullYear();
  (S.dates || []).forEach((q: any) => {
    if (!q || !okD(q.d) || !q.n) return;
    if (q.rec) { const d0 = (y - 1) + q.d.slice(4); if (!okD(d0) || q.d.slice(5) === "02-29") return; ev("b-" + q.d.slice(5) + "-" + hash(q.n), ["DTSTART;VALUE=DATE:" + ymd(d0), "DTEND;VALUE=DATE:" + addDays(d0, 1), "RRULE:FREQ=YEARLY", "SUMMARY:" + esc("Anniversaire · " + q.n), "TRANSP:TRANSPARENT"]); }
    else if (q.d >= from) ev("d-" + q.d + "-" + hash(q.n), ["DTSTART;VALUE=DATE:" + ymd(q.d), "DTEND;VALUE=DATE:" + addDays(q.d, 1), "SUMMARY:" + esc(q.n), "TRANSP:TRANSPARENT"]);
  });
  L.push("END:VCALENDAR");
  return new Response(L.map(fold).join("\r\n") + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-cache", "Content-Disposition": "inline; filename=\"emploi-du-temps.ics\"" } });
});
