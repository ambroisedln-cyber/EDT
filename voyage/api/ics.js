// Renvoie un fichier .ics pour l'ajouter à Calendrier (iPhone, Mac) ou à tout agenda.
module.exports = (req, res) => {
  let body = req.body || {};
  if (typeof body === "string") { try { body = Object.fromEntries(new URLSearchParams(body)); } catch (e) { body = {}; } }
  let ics = typeof body.ics === "string" ? body.ics : "";
  if (!ics && req.query && req.query.e) {
    try { ics = Buffer.from(String(req.query.e).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); } catch (e) { ics = ""; }
  }
  if (!ics.startsWith("BEGIN:VCALENDAR") || !ics.trim().endsWith("END:VCALENDAR") || ics.length > 300000) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Calendrier invalide");
  }
  const name = String(body.n || (req.query && req.query.n) || "voyage").replace(/[^\w-]+/g, "-").slice(0, 60) || "voyage";
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${name}.ics"`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(ics);
};
