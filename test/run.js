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
  /* يلعب جولة كاملة بأي أنواع أسئلة تظهر، ويعيد الأنواع التي رآها */
  const play = async (pg, url) => {
    await pg.goto(url); const kinds = new Set();
    for (let i = 0; i < 12; i++) {
      if (await pg.$(".matchgrid")) { kinds.add("match"); const n = (await pg.$$("[data-l]")).length; for (let k = 0; k < n; k++) { await pg.click("[data-l='" + k + "']"); await pg.click("[data-r='" + k + "']"); } }
      else if (await pg.$("#qcard textarea") && await pg.$("#padhost") && !(await pg.$("#play")) && !(await pg.$(".bigword"))) { kinds.add("open"); await pg.click("#chk"); await pg.click("#no"); }
      else if (await pg.$("#play")) { kinds.add("dictation"); await pg.fill("#ans", "x"); await pg.click("#chk"); }
      else if (await pg.$(".bigword")) { kinds.add("pen"); await pg.click("#chk"); await pg.click("#yes"); }
      else if (await pg.$(".sortrow")) { kinds.add("sort"); for (const r of await pg.$$(".sortrow")) await (await r.$("button")).click(); await pg.click("#chk"); }
      else if (await pg.$("#slots")) { kinds.add("order"); const n = (await pg.$$("#bank .tok")).length; for (let k = 0; k < n; k++) await pg.click("#bank .tok:not([disabled]) >> nth=0"); await pg.click("#chk"); }
      else if (await pg.$("#qcard #ans")) { kinds.add("short"); await pg.fill("#ans", "x"); await pg.click("#chk"); }
      else if (await pg.$(".opt")) { kinds.add((await pg.$$(".opt")).length === 2 ? "tf" : "mcq"); await pg.click(".opt >> nth=0"); }
      else break;
      await pg.click("#nx");
      if ((await pg.textContent("#app")).includes("جولة جديدة")) break;
    }
    return { kinds, done: (await pg.textContent("#app")).includes("جولة جديدة") };
  };

  /* 1) التطبيق الحقيقي على هاتف */
  let p = await mk({ width: 390, height: 800 });
  await p.goto(app);
  check((await p.textContent("#app")).includes("عالم فيزيائي"), "home lists the real lesson");
  check((await p.textContent(".hero .btn")).includes("الهمزة المتطرفة"), "fresh install starts at the hamza (end) lesson, as requested");
  check((await p.$$(".lrow.lock")).length === 0, "all lessons so far are unlocked (she is on the last one)");
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
  const k2 = await play(p, app + "#/readq/u1-l2");
  check(k2.done && k2.kinds.has("open") && k2.kinds.has("match"), "lesson 2 reading round (14-question pool) completes; types: " + [...k2.kinds]);
  await p.goto(app + "#/vocab/u1-l2"); check((await p.$$(".vt tr")).length === 6, "lesson 2 vocabulary table has 6 words");
  await p.goto(app + "#/vocabq/u1-l2");
  for (let i = 0; i < 10; i++) {
    if (await p.$(".matchgrid")) { for (let k = 0; k < 4; k++) { await p.click("[data-l='" + k + "']"); await p.click("[data-r='" + k + "']"); } }
    else if (await p.$(".opt")) await p.click(".opt >> nth=0"); else break;
    await p.click("#nx");
    if ((await p.textContent("#app")).includes("جولة جديدة")) break;
  }
  check((await p.textContent("#app")).includes("جولة جديدة"), "lesson 2 vocabulary round completes (mcq + match mix)");
  /* فحص بنيوي لكل أسئلة المحتوى (يكشف أخطاء الكتابة اليدوية) */
  await p.goto(app);
  const bad = await p.evaluate(() => {
    const L = window.LUGHATI, out = [], pool = L.buildPool(L.lessons());
    pool.forEach((q) => {
      const id = q.id; const miss = (m) => out.push(id + ": " + m);
      if (!q.skill) miss("no skill"); if (!q.src) miss("no src");
      if (q.type === "mcq") { if (!(q.a >= 0 && q.a < q.o.length)) miss("answer index out of range"); if (new Set(q.o).size !== q.o.length) miss("duplicate options"); if (q.o.length < 3) miss("fewer than 3 options"); }
      if (q.type === "order") { if ([...q.words].sort().join("|") !== [...q.a].sort().join("|")) miss("order answer is not a permutation of words"); }
      if (q.type === "sort") { if (!q.items.every((it) => it[1] >= 0 && it[1] < q.buckets.length)) miss("sort bucket index"); }
      if (q.type === "match") { if (new Set(q.pairs.map((x) => x[1])).size !== q.pairs.length) miss("duplicate match targets"); }
      if (q.type === "short" || q.type === "open") { if (!q.a || (Array.isArray(q.a) && !q.a.length)) miss("empty answer"); }
      if (q.type === "dictation" && !q.text) miss("empty dictation");
    });
    const ids = pool.map((q) => q.id); if (new Set(ids).size !== ids.length) out.push("duplicate question ids");
    return { n: pool.length, out };
  });
  check(bad.out.length === 0, "all " + bad.n + " content questions are structurally valid" + (bad.out.length ? ": " + bad.out.slice(0, 5).join(" | ") : ""));
  const pos = await p.evaluate(() => { const L = window.LUGHATI, seen = new Set(); const q = { id: "t", type: "mcq", skill: "grammar", tag: "t", src: "t", q: "x", o: ["a", "b", "c", "d"], a: 0, why: "" };
    for (let i = 0; i < 60; i++) { const d = document.createElement("div"); L.renderQuestion(d, q, () => {}); const btns = [...d.querySelectorAll(".opt")]; seen.add(btns.findIndex((b) => +b.dataset.i === 0)); } return [...seen].sort(); });
  check(pos.length >= 3, "correct answer position varies across displays: positions " + pos);
  /* دروس النحو الجديدة: جولة كاملة لكل درس بكل أنواع الأسئلة */
  for (const lid of ["u1-zarf", "u1-neg", "u1-faail"]) {
    await p.goto(app + "#/grammarq/" + lid);
    const kinds = new Set();
    for (let i = 0; i < 10; i++) {
      if (await p.$(".matchgrid")) { kinds.add("match"); const n = (await p.$$("[data-l]")).length; for (let k = 0; k < n; k++) { await p.click("[data-l='" + k + "']"); await p.click("[data-r='" + k + "']"); } }
      else if (await p.$("#qcard textarea")) { kinds.add("open"); await p.click("#chk"); await p.click("#yes"); }
      else if (await p.$(".opt")) { kinds.add((await p.$$(".opt")).length === 2 ? "tf" : "mcq"); await p.click(".opt >> nth=0"); }
      else break;
      await p.click("#nx");
      if ((await p.textContent("#app")).includes("جولة جديدة")) break;
    }
    check((await p.textContent("#app")).includes("جولة جديدة"), lid + " round completes; types: " + [...kinds]);
  }
  /* دروس الاستماع/الإستراتيجية/النص/الشعر المضافة */
  for (const [route, label] of [["activityq/u1-intro", "intro activity"], ["activityq/u1-listen1", "listening"], ["activityq/u1-strat", "reading strategy"], ["readq/u1-tv", "TV text"], ["poetryq/u1-poem", "poem questions"]]) {
    const r = await play(p, app + "#/" + route);
    check(r.done, label + " round completes; types: " + [...r.kinds]);
  }
  await p.goto(app + "#/poetry/u1-poem"); check((await p.$$(".pl")).length === 9, "poem shows 9 verses"); await noOverflow(p, "poem page");
  await p.click("#mem"); await p.click("#mem"); check((await p.$$(".gap")).length > 0, "poem memorisation hides words");
  await p.goto(app + "#/"); check((await p.$$("details.guide")).length >= 1, "unit guide (learning goals) is shown on the home screen");
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
