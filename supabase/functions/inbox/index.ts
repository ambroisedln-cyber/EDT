// Boîte de réception « Partager vers Planning » (raccourci iPhone, etc.)
// POST /functions/v1/inbox?k=<jeton>  — corps : formulaire (t = texte/lien, f = fichier), JSON {text,url,title} ou brut.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, GET, OPTIONS" };
const out = (msg: string, status = 200) => new Response(msg, { status, headers: { ...CORS, "content-type": "text/plain; charset=utf-8" } });
const URLRE = /https?:\/\/[^\s<>"]+/i;
const ent = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
async function pageTitle(u: string) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 4000);
    const r = await fetch(u, { signal: c.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1", "accept-language": "fr-FR,fr;q=0.9" } });
    clearTimeout(t); if (!r.ok || !/html/i.test(r.headers.get("content-type") || "")) return "";
    const h = (await r.text()).slice(0, 300000);
    const m = h.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)/i) || h.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title/i) || h.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
    return m ? ent(m[1]).slice(0, 140) : "";
  } catch { return ""; }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return out("");
  const q = new URL(req.url).searchParams;
  let k = q.get("k") || "", txt = q.get("t") || q.get("text") || q.get("url") || "", title = q.get("title") || "";
  let file: File | null = null;
  const ct = req.headers.get("content-type") || "";
  try {
    if (req.method === "POST") {
      if (/multipart\/form-data|application\/x-www-form-urlencoded/i.test(ct)) {
        const fd = await req.formData();
        k = k || String(fd.get("k") || "");
        for (const [name, v] of fd.entries()) {
          if (typeof v === "string") { if (name === "title") title = v; else if (name !== "k" && v.trim() && !txt.includes(v.trim())) txt = (txt ? txt + "\n" : "") + v.trim(); }
          else if (v && (v as File).size > 0 && !file) file = v as File;
        }
      } else if (/json/i.test(ct)) {
        const j = await req.json(); k = k || j.k || ""; title = title || j.title || "";
        txt = [txt, j.text, j.url].filter((x) => x && String(x).trim()).map(String).join("\n");
      } else {
        const b = await req.blob();
        if (b.size) { if (/^text\//i.test(b.type) || !b.type) txt = (txt ? txt + "\n" : "") + (await b.text()); else file = new File([b], q.get("name") || "Fichier", { type: b.type }); }
      }
    }
  } catch (_) { return out("Contenu illisible", 400); }
  if (!/^[a-f0-9]{48}$/.test(k)) return out("Lien de partage invalide", 404);
  const { data: tk } = await sb.from("inbox_tokens").select("user_id").eq("token", k).maybeSingle();
  if (!tk) return out("Lien de partage invalide", 404);
  const uid = tk.user_id as string;
  // Fichier texte envoyé comme fichier : on le lit comme du texte
  if (file && /^text\/plain/i.test(file.type) && file.size < 200000) { const s = (await file.text()).trim(); if (s && !txt.includes(s)) txt = (txt ? txt + "\n" : "") + s; file = null; }
  // Une page web « téléchargée » à partir d'un lien : on garde juste le lien
  if (file && /html/i.test(file.type) && URLRE.test(txt)) file = null;
  txt = txt.trim().slice(0, 20000);
  // Avec une photo/un fichier, le champ texte ne contient souvent que son nom : inutile
  if (file && /^[^\s\/]+\.[a-z0-9]{2,5}$/i.test(txt)) txt = "";
  if (!txt && !file) return out("Rien à ajouter", 400);
  if (file && file.size > 25e6) return out("Fichier trop volumineux (25 Mo max)", 413);
  const um = txt.match(URLRE), url = um ? um[0] : "";
  if (!title && url && txt.replace(url, "").trim() === "") title = await pageTitle(url);
  let file_id = null, file_name = null, file_type = null;
  if (file) {
    file_id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    file_name = (file.name && file.name !== "blob" ? file.name : "Fichier").slice(0, 60); file_type = file.type || "application/octet-stream";
    const { error } = await sb.storage.from("files").upload(uid + "/" + file_id, file, { contentType: file_type, upsert: true });
    if (error) return out("Envoi du fichier impossible", 500);
  }
  const { error } = await sb.from("inbox").insert({ user_id: uid, title: title || null, body: txt || null, url: url || null, file_id, file_name, file_type });
  if (error) return out("Ajout impossible", 500);
  return out("Ajouté à Planning ✓");
});
