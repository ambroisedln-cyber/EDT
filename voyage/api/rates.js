// Taux de change de référence publiés par la Banque centrale européenne (mis à jour chaque jour ouvré vers 16 h).
module.exports = async (req, res) => {
  try {
    const r = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", { headers: { "User-Agent": "carnet-de-route" } });
    if (!r.ok) throw new Error("ecb " + r.status);
    const x = await r.text();
    const date = (x.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/) || [])[1] || null;
    const rates = { EUR: 1 };
    for (const m of x.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) rates[m[1]] = +m[2];
    if (Object.keys(rates).length < 10) throw new Error("parse");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ source: "Banque centrale européenne", date, base: "EUR", rates });
  } catch (e) {
    res.status(502).json({ error: "indisponible" });
  }
};
