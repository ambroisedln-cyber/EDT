// Envoi des rappels par notification.
// Appelée toutes les 5 minutes par pg_cron (en-tête x-cron-secret),
// ou par l'appli avec {test:true} et le jeton de l'utilisateur pour une notification d'essai.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const pad = (n: number) => String(n).padStart(2, "0");

// Heure locale de Paris, exprimée en "minutes locales" comparables entre elles.
export function parisNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  const key = p.year + "-" + p.month + "-" + p.day;
  return { key, min: Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) / 6e4, hour: +p.hour, minute: +p.minute };
}
const locMin = (k: string, h: string) => { const [y, m, d] = k.split("-").map(Number), [hh, mm] = h.split(":").map(Number); return Date.UTC(y, m - 1, d, hh, mm) / 6e4; };
const addDay = (k: string, n: number) => { const [y, m, d] = k.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + "-" + pad(t.getUTCMonth() + 1) + "-" + pad(t.getUTCDate()); };
const fmtH = (h: string) => h.replace(":", "h");

// Calcule les rappels à envoyer maintenant pour un utilisateur.
export function dueReminders(S: any, now = parisNow()) {
  const out: { key: string; title: string; body: string }[] = [];
  const cfg = S.cfg || {}, defRem = +cfg.rem || 0, en = S.lang === "en";
  const days = S.days || {};
  const inTxt = (m: number) => m >= 1440 ? (en ? "tomorrow" : "demain") : m >= 60 ? (m % 60 ? Math.floor(m / 60) + " h " + (m % 60) : m / 60 + " h") : m + " min";
  // Rendez-vous : rappel propre (x.rem) ou rappel par défaut des réglages
  for (const k of [now.key, addDay(now.key, 1), addDay(now.key, 2)]) {
    ((days[k] && days[k].r) || []).forEach((x: any) => {
      if (!x || !x.x || !/^\d{2}:\d{2}$/.test(x.h || "")) return;
      const rem = (x.rem !== undefined && x.rem !== null && x.rem !== "") ? +x.rem : (defRem > 0 ? defRem : -1);
      if (!(rem >= 0)) return;
      const at = locMin(k, x.h), when = at - rem;
      if (when <= now.min && when > now.min - 15 && at >= now.min) {
        const place = x.tele ? (en ? "Video call" : (x.c === "Meeting" ? "Visio" : "Téléconsultation")) : (x.l || "");
        const lead = rem === 0 ? (en ? "Now · " : "Maintenant · ") : (en ? "In " : "Dans ") + inTxt(rem) + " · ";
        out.push({ key: "r|" + k + "|" + x.h + "|" + x.x + "|" + rem, title: x.x, body: lead + (en ? "at " : "à ") + fmtH(x.h) + (place ? " · " + place : "") });
      }
    });
  }
  // Tâches avec un rappel à date et heure précises (x.ra = "AAAA-MM-JJTHH:MM")
  const taskRem = (x: any, where: string) => {
    if (!x || !x.x || x.f || x.cx || typeof x.ra !== "string") return;
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(x.ra);
    if (!m) return;
    const when = locMin(m[1], m[2]);
    if (when <= now.min && when > now.min - 15) out.push({ key: "t|" + x.ra + "|" + x.x, title: en ? "Reminder" : "Rappel", body: x.x + (where ? " · " + where : "") + (x.nt ? "\n" + String(x.nt).slice(0, 120) : "") });
  };
  Object.keys(days).forEach((k) => ((days[k] && days[k].t) || []).forEach((x: any) => taskRem(x, "")));
  const GN: Record<string, string> = { m: "Médical", j: "Job", a: "Autre", p: "Projets", c: "Courses", k: "Commandes", v: "Vacances" };
  Object.keys(S.g || {}).forEach((g) => (S.g[g] || []).forEach((x: any) => taskRem(x, GN[g] || "")));
  if (cfg.remv && now.hour === 20 && now.minute < 20) {
    const k = addDay(now.key, 1);
    const L = ((days[k] && days[k].r) || []).filter((x: any) => x && x.x).sort((a: any, b: any) => (a.h || "99").localeCompare(b.h || "99")).map((x: any) => (x.h ? fmtH(x.h) + " " : "") + x.x);
    if (L.length) out.push({ key: "v|" + k, title: en ? "Tomorrow" : "Demain", body: L.join(" · ") });
  }
  return out;
}

async function secrets() {
  const { data } = await sb.from("app_secrets").select("k,v");
  return Object.fromEntries((data || []).map((r: any) => [r.k, r.v]));
}

async function sendTo(subs: any[], payload: unknown) {
  let ok = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 }); ok++; }
    catch (e: any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from("push_subs").delete().eq("endpoint", s.endpoint); }
  }
  return ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sec = await secrets();
  webpush.setVapidDetails("https://emploi-du-temps-tau.vercel.app", sec.vapid_public, sec.vapid_private);
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* vide */ }

  if (body && body.test) {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u || !u.user) return new Response(JSON.stringify({ error: "auth" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    const { data: subs } = await sb.from("push_subs").select("*").eq("user_id", u.user.id);
    const en = body.lang === "en";
    const n = await sendTo(subs || [], { title: en ? "Reminders are on ✓" : "Rappels activés ✓", body: en ? "You will be notified before your appointments." : "Tu seras prévenu avant tes rendez-vous.", url: "./" });
    return new Response(JSON.stringify({ sent: n }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (req.headers.get("x-cron-secret") !== sec.cron) return new Response("Forbidden", { status: 403 });
  const { data: subs } = await sb.from("push_subs").select("*");
  const byUser: Record<string, any[]> = {};
  (subs || []).forEach((s: any) => { (byUser[s.user_id] = byUser[s.user_id] || []).push(s); });
  const ids = Object.keys(byUser);
  if (!ids.length) return new Response(JSON.stringify({ users: 0 }), { headers: { "Content-Type": "application/json" } });
  const { data: rows } = await sb.from("user_data").select("user_id,data").in("user_id", ids);
  const now = parisNow();
  let sent = 0;
  for (const r of rows || []) {
    for (const d of dueReminders(r.data || {}, now)) {
      const { error } = await sb.from("reminders_sent").insert({ user_id: r.user_id, key: d.key });
      if (error) continue; // déjà envoyé
      sent += await sendTo(byUser[r.user_id], { title: d.title, body: d.body, url: "./" });
    }
  }
  await sb.from("reminders_sent").delete().lt("sent_at", new Date(Date.now() - 3 * 864e5).toISOString());
  return new Response(JSON.stringify({ users: ids.length, sent }), { headers: { "Content-Type": "application/json" } });
});
