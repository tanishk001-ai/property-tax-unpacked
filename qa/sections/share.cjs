// SH-*: titles, Open Graph / Twitter tags, preview image, favicon.
const { openPage, sleep, rawGet } = require("../lib.cjs");
const { ids } = require("../expected.cjs");

const meta = (html, key) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]*content="([^"]*)"`, "i")) || html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]*(?:property|name)="${key}"`, "i")); return m ? m[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'") : null; };
function pngSize(buf) { return buf.slice(1, 4).toString() === "PNG" ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null; }

module.exports = async function share({ browser, base, env, rec }) {
  const { ok, note } = rec;
  // SH-01 titles per screen, both languages (client-side title after load)
  for (const lang of ["en", "hi"]) {
    const p = await openPage(browser, { width: 1366, height: 800, lang });
    const titles = {};
    for (const [key, path, sel] of [["landing", "/", ".landing-shell"], ["bill", "/bill/DEMO-7719", ".bill-main"], ["breakdown", "/bill/DEMO-7719/breakdown", ".breakdown-main"], ["faq", "/faq", ".faq-list"], ["terms", "/terms", ".terms-page h1"]]) {
      await p.goto(base + path); await p.waitForSelector(sel); await sleep(900);
      titles[key] = await p.title();
    }
    note("SH-01", `${lang}: ${JSON.stringify(titles)}`);
    const uniq = new Set(Object.values(titles)).size === 5;
    ok("SH-01", uniq, `${lang}: titles are not distinct per screen: ${JSON.stringify(titles)}`, p);
    if (lang === "hi") ok("SH-01", Object.values(titles).every((t) => /[ऀ-ॿ]/.test(t)), "a Hindi title has no Devanagari: " + JSON.stringify(titles), p);
    if (lang === "en") ok("SH-01", /DEMO-7719/.test(titles.bill) && /DEMO-7719/.test(titles.breakdown), "bill/breakdown titles do not name the property: " + JSON.stringify(titles), p);
    await p.ctx.close();
  }
  // server-rendered <title> and meta for the pages people share
  const pages = ["/", "/bill/DEMO-7719", "/bill/DEMO-3982/breakdown", "/faq", "/terms"];
  const images = new Set();
  for (const path of pages) {
    const res = await rawGet(base, path); const html = res.body;
    const tags = { title: (html.match(/<title>([^<]*)<\/title>/) || [])[1], ogTitle: meta(html, "og:title"), ogDesc: meta(html, "og:description"), ogImage: meta(html, "og:image"), ogUrl: meta(html, "og:url"), ogType: meta(html, "og:type"), ogSite: meta(html, "og:site_name"), tw: meta(html, "twitter:card"), twImage: meta(html, "twitter:image"), desc: meta(html, "description") };
    note("SH-02", `${path}: ${JSON.stringify(tags)}`);
    const abs = (u) => !!u && (base.startsWith("https") ? /^https:\/\// : /^https?:\/\//).test(u);
    ok("SH-02", !!tags.ogTitle && !!tags.ogDesc && abs(tags.ogImage) && !!tags.tw && !!tags.desc, `${path}: ${JSON.stringify(tags)}`);
    ok("SH-02", !tags.ogUrl || abs(tags.ogUrl), `${path}: og:url must be absolute: ${tags.ogUrl}`);
    if (path.startsWith("/bill/")) ok("SH-01", /DEMO-\d{4}/.test(tags.title || "") && /DEMO-\d{4}/.test(tags.ogTitle || ""), `${path}: server-rendered title "${tags.title}" / og:title "${tags.ogTitle}" do not name the property`);
    if (tags.ogImage) images.add(tags.ogImage);
    if (tags.twImage) images.add(tags.twImage);
  }
  // SH-03 the image answers and is the right size (fetched from this environment's origin)
  for (const url of images) {
    let pathOnly; try { pathOnly = new URL(url).pathname; } catch { ok("SH-03", false, "bad image url " + url); continue; }
    const res = await new Promise((resolve) => { const http = require("http"); const u = new URL(base); http.get({ host: u.hostname, port: u.port, path: pathOnly }, (r) => { const c = []; r.on("data", (d) => c.push(d)); r.on("end", () => resolve({ status: r.statusCode, type: r.headers["content-type"], buf: Buffer.concat(c) })); }).on("error", () => resolve({ status: 0 })); });
    const size = res.buf && pngSize(res.buf);
    ok("SH-03", res.status === 200 && /^image\//.test(res.type || "") && size && size.w >= 1200 && size.h >= 600 && Math.abs(size.w / size.h - 1.91) < 0.05 && res.buf.length < 600000, `${url}: status ${res.status} type ${res.type} size ${JSON.stringify(size)} bytes ${res.buf && res.buf.length}`);
  }
  if (!images.size) ok("SH-03", false, "no og:image on any page");
  // SH-06 favicon
  {
    const home = await rawGet(base, "/");
    const href = (home.body.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/) || [])[1];
    const fav = href ? await rawGet(base, href) : await rawGet(base, "/favicon.ico");
    ok("SH-06", fav.status === 200 && /image|icon|svg/.test(fav.headers["content-type"] || ""), `icon ${href || "/favicon.ico"} -> ${fav.status} ${fav.headers["content-type"]}`);
  }
  void ids; void env;
};
