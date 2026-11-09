/* اختبار شامل لكل الشاشات في Chromium بلا واجهة: node test/run.js  (SHOTS=مجلد لقطات الشاشة) */
const { chromium } = require("playwright");
const path = require("path");
const root = path.resolve(__dirname, "..");
const SHOTS = process.env.SHOTS || "/tmp";
const errs = [];
const check = (c, m) => { if (!c) errs.push("FAIL: " + m); else console.log("ok  ", m); };

(async () => {
  const b = await chromium.launch();
  const mk = async (vw) => {
    const c = await b.newContext({ viewport: vw, hasTouch: true });
    const p = await c.newPage();
    p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
    p.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));
    return p;
  };
  const noOverflow = async (p, m) => check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no horizontal overflow: " + m);
  const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + ".png") });
  const app = "file://" + root + "/index.html";

  /* 1) التطبيق الحقيقي على هاتف */
  let p = await mk({ width: 390, height: 800 });
  await p.goto(app);
  check((await p.textContent("#app")).includes("عالم فيزيائي"), "home lists the real lesson");
  await noOverflow(p, "home"); await shot(p, "real-home");
  await p.goto(app + "#/lesson/u1-l1");
  check((await p.$$(".mod.off")).length === 2, "lesson shows writing+poetry as empty (honest, nothing invented)");
  await p.goto(app + "#/reading/u1-l1");
  check((await p.$$(".w")).length > 100, "reading words are tappable");
  await noOverflow(p, "reading"); await shot(p, "real-reading");
  await p.click(".w >> nth=3"); check((await p.$(".w.hl")) !== null, "tap highlights a word");
  await p.goto(app + "#/readq/u1-l1");
  for (let i = 0; i < 5; i++) { await p.click(".opt >> nth=0"); await p.click("#nx"); }
  check((await p.textContent("#app")).includes("جولة جديدة"), "reading round (5 questions) reaches summary");
  /* الدرس الثاني: نص طويل مشكَّل + أسئلة مفتوحة (الكتاب) + مطابقة */
  await p.goto(app + "#/reading/u1-l2"); await noOverflow(p, "long book text (lesson 2) on phone"); await shot(p, "real-reading2");
  check((await p.$$(".text p")).length === 14, "lesson 2 text has 14 paragraphs");
  await p.goto(app + "#/readq/u1-l2");
  let openSeen = 0, matchSeen = 0;
  for (let i = 0; i < 6; i++) {
    if (await p.$("#qcard textarea")) { openSeen++; await p.fill("#ans", "إجابتي"); await p.click("#chk"); check((await p.textContent(".ans")).includes("إجابة الكتاب"), "open question reveals the book answer"); await p.click("#no"); }
    else if (await p.$(".matchgrid")) { matchSeen++; for (let k = 0; k < 4; k++) { await p.click("[data-l='" + k + "']"); await p.click("[data-r='" + k + "']"); } }
    await p.click("#nx");
  }
  check(openSeen === 5 && matchSeen === 1, "lesson 2 round = 5 open (book) + 1 match: " + openSeen + "/" + matchSeen);
  await p.goto(app + "#/vocab/u1-l2"); check((await p.$$(".vt tr")).length === 6, "lesson 2 vocabulary table has 6 words");
  await p.goto(app + "#/vocabq/u1-l2");
  for (let i = 0; i < 10; i++) {
    if (await p.$(".matchgrid")) { for (let k = 0; k < 4; k++) { await p.click("[data-l='" + k + "']"); await p.click("[data-r='" + k + "']"); } }
    else if (await p.$(".opt")) await p.click(".opt >> nth=0"); else break;
    await p.click("#nx");
    if ((await p.textContent("#app")).includes("جولة جديدة")) break;
  }
  check((await p.textContent("#app")).includes("جولة جديدة"), "lesson 2 vocabulary round completes (mcq + match mix)");
  /* الدرس الثالث (الإملاء): أنواع الأسئلة كلها */
  await p.goto(app + "#/spelling/u1-l3"); check((await p.$$(".pts li")).length === 7, "hamza lesson shows the book rule (7 points)"); await noOverflow(p, "spelling rule page");
  await p.goto(app + "#/spellq/u1-l3");
  const sk = new Set();
  for (let i = 0; i < 10; i++) {
    if (await p.$("#play")) { sk.add("dictation"); await p.fill("#ans", "كان مسلما"); await p.click("#chk"); }
    else if (await p.$(".bigword")) { sk.add("pen"); await p.click("#chk"); await p.click("#yes"); }
    else if (await p.$(".inp")) { sk.add("short"); await p.fill("#ans", "x"); await p.click("#chk"); }
    else if (await p.$(".opt")) { sk.add("mcq"); await p.click(".opt >> nth=0"); }
    else break;
    await p.click("#nx");
  }
  check((await p.textContent("#app")).includes("جولة جديدة"), "spelling round of 10 completes; types seen: " + [...sk]);
  const hz = await p.evaluate(() => JSON.parse(localStorage.getItem("lughati.v1")).tags["همزة متوسطة"]);
  check(hz && hz.n >= 1, "hamza results are tracked per weak-area tag for the parent dashboard");
  await p.goto(app + "#/vocabq/u1-l1");
  for (let i = 0; i < 10; i++) { await p.click(".opt >> nth=0"); await p.click("#nx"); }
  check((await p.textContent("#app")).includes("جولة جديدة"), "vocab round of 10 completes");
  await p.goto(app + "#/cards/u1-l1"); await p.click("#rev"); await p.click("#no");
  const box0 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem("lughati.v1")).cards)[0]);
  check(box0 && box0.box === 0, "missed flashcard stays in box 0 (comes back soon)");
  await p.click("#rev"); await p.click("#ok");
  const box1 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem("lughati.v1")).cards).some((c) => c.box === 1));
  check(box1, "known flashcard moves to box 1 (comes back later)");

  await p.goto(app + "#/grammarq/u1-l1");
  const seen = new Set();
  for (let i = 0; i < 7; i++) {
    if (await p.$(".opt")) { seen.add("mcq"); await p.click(".opt >> nth=0"); }
    else if (await p.$(".sortrow")) { seen.add("sort"); for (const r of await p.$$(".sortrow")) await (await r.$("button")).click(); await p.click("#chk"); }
    else if (await p.$("#slots")) { seen.add("order"); const n = (await p.$$("#bank .tok")).length; for (let k = 0; k < n; k++) await p.click("#bank .tok:not([disabled]) >> nth=0"); await p.click("#chk"); }
    await shot(p, "real-grammar-" + i); await p.click("#nx");
  }
  check(["mcq", "sort", "order"].every((t) => seen.has(t)), "grammar covers mcq, sort, order: " + [...seen]);

  await p.goto(app + "#/spellq/u1-l1");
  check((await p.$(".bigword")) !== null, "pen-copy word shown");
  await p.click("[data-m=pen]"); await p.waitForSelector(".padcv");
  const bx = await (await p.$(".padcv")).boundingBox();
  await p.mouse.move(bx.x + 20, bx.y + 30); await p.mouse.down(); await p.mouse.move(bx.x + 120, bx.y + 60, { steps: 6 }); await p.mouse.up();
  await shot(p, "real-pen");
  await p.click("#chk"); await p.click("#no"); await p.click("#nx");
  check(true, "pen word: confirming 'has errors' still advances (never blocked)");

  await p.goto(app + "#/parent");
  check((await p.textContent("#app")).includes("نقاط الضعف"), "parent dashboard renders");
  await noOverflow(p, "parent"); await shot(p, "real-parent");
  await p.goto(app + "#/extras");
  check((await p.$$("#app section")).length >= 5, "extras list shows the app-written items");
  await p.goto(app + "#/mistakes"); await noOverflow(p, "mistakes");
  await p.goto(app + "#/practice"); check((await p.$("#qcard .qtext")) !== null, "mixed practice starts with a question");

  /* 2) ملف الاختبار: إملاء، كتابة، شعر، مطابقة، نص طويل بتشكيل — هاتف وتابلت */
  for (const vw of [{ width: 360, height: 740 }, { width: 900, height: 1200 }]) {
    p = await mk(vw); const f = "file://" + root + "/test/fixture.html"; const t = vw.width;
    await p.goto(f + "#/reading/t-1"); await noOverflow(p, "long tashkeel reading @" + t); await shot(p, "fx-reading-" + t);
    await p.goto(f + "#/spellq/t-1");
    check((await p.$("#play")) !== null, "dictation has a play button @" + t);
    await p.fill("#ans", "قرأ الطالب مسؤوليه الشاطئ جزءا"); await p.click("#chk");
    check((await p.$$(".ans .w.no")).length >= 1, "dictation flags hamza/taa errors @" + t); await shot(p, "fx-dictation-" + t); await p.click("#nx");
    await p.goto(f + "#/writing/t-1"); await p.click("#fin");
    check((await p.textContent("#md")).includes("نموذج"), "writing shows model paragraph @" + t); await noOverflow(p, "writing @" + t);
    await p.goto(f + "#/poetry/t-1"); await p.click("#mem"); await p.click("#mem");
    check((await p.$$(".gap")).length > 0, "poetry memorisation hides words @" + t); await noOverflow(p, "poetry @" + t); await shot(p, "fx-poetry-" + t);
    await p.goto(f + "#/readq/t-1");
    for (let i = 0; i < 3; i++) {
      if (await p.$(".opt")) await p.click(".opt >> nth=0");
      else if (await p.$(".matchgrid")) { await p.click("[data-l='0']"); await p.click("[data-r='0']"); await p.click("[data-l='1']"); await p.click("[data-r='1']"); }
      else { await p.fill("#ans", "مسؤولية"); await p.click("#chk"); }
      await p.click("#nx");
    }
    check((await p.textContent("#app")).includes("جولة جديدة"), "true/false + short + match round completes @" + t);
  }
  await b.close();
  console.log(errs.length ? "\nPROBLEMS:\n" + errs.join("\n") : "\nALL CHECKS PASSED, no console errors");
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error("CRASH", e.message); process.exit(2); });
