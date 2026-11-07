// Données du widget écran d'accueil (Scriptable) : /functions/v1/widget?token=<jeton du flux calendrier>
// Renvoie les prochains rendez-vous et les tâches du jour, en lecture seule.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const pad = (n: number) => String(n).padStart(2, "0");
const okT = (h: unknown) => typeof h === "string" && /^\d{2}:\d{2}$/.test(h);
function parisNow() { const f = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()); const g = (t: string) => f.find((p) => p.type === t)!.value; return { k: g("year") + "-" + g("month") + "-" + g("day"), hm: g("hour") + ":" + g("minute") }; }
function addK(k: string, n: number) { const [y, m, d] = k.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + "-" + pad(t.getUTCMonth() + 1) + "-" + pad(t.getUTCDate()); }
const dayDiff = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5);
function rMatch(o: string, k: string, rc: string) { if (k <= o) return false; if (rc === "d") return true; if (rc === "w") return dayDiff(o, k) % 7 === 0;
  const dim = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); const y = +k.slice(0, 4), m = +k.slice(5, 7) - 1, d = +k.slice(8, 10), od = +o.slice(8, 10);
  const want = Math.min(od, dim(y, m)); if (rc === "m") return d === want; if (rc === "y") return m === +o.slice(5, 7) - 1 && d === want; return false; }
const nm = (t: string) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/s$/, "") : w)).join(" ");
function pdur(s: unknown) { const t = String(s || "").toLowerCase(); const a = t.match(/(\d+)\s*h\s*(\d+)?/); if (a) return +a[1] * 60 + (+a[2] || 0); const b = t.match(/(\d+)\s*m/); return b ? +b[1] : 60; }
const endHM = (h: string, du: unknown) => { const [a, b] = h.split(":").map(Number), m = a * 60 + b + pdur(du); return pad(Math.min(23, Math.floor(m / 60))) + ":" + pad(m >= 1440 ? 59 : m % 60); };
const LAB: Record<string, string> = { Resto: "Restaurant", Médical: "Médical" };
Deno.serve(async (req) => {
  const H = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "no-store" };
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response('{"error":"token"}', { status: 404, headers: H });
  const { data: t } = await sb.from("calendar_tokens").select("user_id").eq("token", token).maybeSingle();
  if (!t) return new Response('{"error":"token"}', { status: 404, headers: H });
  const { data: u } = await sb.from("user_data").select("data").eq("user_id", t.user_id).maybeSingle();
  const S: any = (u && u.data) || {}, days = S.days || {}, now = parisNow(), today = now.k;
  // Rendez-vous : aujourd'hui (pas encore finis) puis les 6 jours suivants
  const ev: any[] = [];
  for (let n = 0; n < 7 && ev.length < 6; n++) {
    const k = addK(today, n);
    ((days[k] || {}).r || []).filter((x: any) => x && x.x).sort((a: any, b: any) => String(a.h || "").localeCompare(String(b.h || ""))).forEach((x: any) => {
      if (n === 0 && okT(x.h) && endHM(x.h, x.du) <= now.hm) return;
      ev.push({ d: k, rel: n === 0 ? "Aujourd’hui" : n === 1 ? "Demain" : "", h: okT(x.h) ? x.h.replace(":", "h") : "", t: x.x, l: x.tele ? "Visio" : x.l || "", c: LAB[x.c] || x.c || "" });
    });
  }
  // Tâches du jour (dont répétitions)
  const tk: string[] = [], seen = new Set<string>();
  const add = (s: string) => { const n = nm(s); if (!s || seen.has(n)) return; seen.add(n); tk.push(s); };
  ((days[today] || {}).t || []).forEach((x: any) => { if (x && !x.f && !x.cx) add(x.x); else if (x) seen.add(nm(x.x)); });
  Object.values(S.g || {}).forEach((L: any) => (L || []).forEach((x: any) => { if (x && x.d === today && !x.f && !x.cx) add(x.x); }));
  Object.keys(days).forEach((k) => ((days[k] || {}).t || []).forEach((x: any) => { if (x && x.rc && !x.sp && !x.cx && !x.am && rMatch(k, today, x.rc) && !(x.ex && x.ex[today])) add(x.x); }));
  Object.values(S.g || {}).forEach((L: any) => (L || []).forEach((x: any) => { if (x && x.rc && !x.sp && !x.cx && x.d && rMatch(x.d, today, x.rc) && !(x.ex && x.ex[today])) add(x.x); }));
  return new Response(JSON.stringify({ today, now: now.hm, events: ev, tasks: tk.slice(0, 12), taskCount: tk.length }), { headers: H });
});
