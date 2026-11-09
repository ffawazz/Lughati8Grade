(function () {
  "use strict";

  /* ---------- التخزين المحلي (آمن عند المنع) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } },
  };
  let done = store.get("lugati.done", {});       // {lessonId:true}
  let scores = store.get("lugati.scores", []);   // [{d, s, n, topic}]
  const saveDone = () => store.set("lugati.done", done);
  let who = store.get("lugati.name", "سوسو");

  /* ---------- أدوات ---------- */
  const $app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b class=\"k\">$1</b>");
  const byId = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
  const num = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const unitOf = (l) => UNITS.find((u) => l.w >= u.weeks[0] && l.w <= u.weeks[1]) || UNITS[UNITS.length - 1];
  const doneCount = (arr) => arr.filter((l) => done[l.id]).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const badge = (t) => `<span class="badge" style="background:${TYPES[t].c}">${TYPES[t].n}</span>`;

  /* ---------- الصفحة الرئيسية ---------- */
  let filterType = "all", query = "";

  function lessonRow(l) {
    return `<a class="lesson ${done[l.id] ? "done" : ""}" href="#/lesson/${l.id}">
      <span class="dot" style="background:${TYPES[l.type].c}"></span>
      <span class="t"><b>${esc(l.title)}</b><small>${TYPES[l.type].n} · الأسبوع ${num(l.w)}</small></span>
      <span class="tick">✓</span></a>`;
  }

  function viewHome() {
    const total = LESSONS.length, d = doneCount(LESSONS);
    const next = LESSONS.find((l) => !done[l.id]);
    const best = scores.length ? Math.max(...scores.map((s) => pct(s.s, s.n))) : null;
    const types = Object.keys(TYPES);
    const matches = (l) => (filterType === "all" || l.type === filterType) && (!query || l.title.includes(query));
    const units = UNITS.map((u) => {
      const ls = LESSONS.filter((l) => unitOf(l) === u);
      const shown = ls.filter(matches);
      if (!shown.length) return "";
      const open = query || filterType !== "all" || (next && unitOf(next) === u) ? "open" : "";
      return `<details class="unit" ${open}><summary><span>${esc(u.name)}</span><span class="muted">${num(doneCount(ls))}/${num(ls.length)}</span></summary>${shown.map(lessonRow).join("")}</details>`;
    }).join("");
    $app.innerHTML = `
      <section class="card">
        <h2>أهلًا يا ${esc(who)} 🌸 <button class="chip" id="nameBtn" style="font-size:.75rem">تغيير الاسم</button></h2>
        <p class="muted" style="margin:0">خطوة صغيرة كل يوم تصنع فرقًا كبيرًا في لغتي 💪</p>
        <div class="progress" role="progressbar" aria-valuenow="${pct(d, total)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct(d, total)}%"></i></div>
        <div class="stat"><div><b>${num(d)}</b>درس منجز</div><div><b>${num(total - d)}</b>متبقٍّ</div><div><b>${best === null ? "–" : num(best) + "٪"}</b>أفضل نتيجة</div></div>
        ${next ? `<p class="row" style="margin:12px 0 0"><a class="btn" href="#/lesson/${next.id}">تابع: ${esc(next.title)}</a></p>` : `<p style="margin:10px 0 0">🎉 أنهيت جميع الدروس!</p>`}
      </section>
      <input class="search" id="q" type="search" placeholder="ابحث عن درس…" value="${esc(query)}" aria-label="بحث">
      <div class="chips" role="group" aria-label="تصفية حسب النوع">
        <button class="chip ${filterType === "all" ? "on" : ""}" data-t="all">الكل</button>
        ${types.map((t) => `<button class="chip ${filterType === t ? "on" : ""}" data-t="${t}">${TYPES[t].n}</button>`).join("")}
      </div>
      ${units || `<p class="muted">لا توجد نتائج.</p>`}`;
    document.getElementById("nameBtn").onclick = () => { const n = prompt("اكتبي الاسم:", who); if (n && n.trim()) { who = n.trim().slice(0, 20); store.set("lugati.name", who); viewHome(); } };
    const q = document.getElementById("q");
    q.addEventListener("input", () => { query = q.value.trim(); const pos = q.selectionStart; viewHome(); const n = document.getElementById("q"); n.focus(); n.setSelectionRange(pos, pos); });
    $app.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { filterType = c.dataset.t; viewHome(); }));
  }

  /* ---------- صفحة الدرس ---------- */
  function viewLesson(id) {
    const l = byId[id];
    if (!l) return viewHome();
    const r = l.rev ? REVIEW[l.rev] : null;
    const qs = l.rev ? QUIZ.filter((q) => q.rev === l.rev) : [];
    const idx = LESSONS.indexOf(l);
    const nav = (x, label) => x ? `<a class="btn alt" href="#/lesson/${x.id}">${label}</a>` : "";
    const body = r ? `
      <div class="card"><h2>${esc(r.title)}</h2>
        <ul class="pts">${r.points.map((p) => `<li class="${p.startsWith("•") ? "sub" : ""}">${md(p)}</li>`).join("")}</ul>
        ${r.examples.length ? `<h3>أمثلة</h3>${r.examples.map((e) => `<div class="ex">${md(e)}</div>`).join("")}` : ""}
        ${r.tip ? `<div class="tip">💡 ${md(r.tip)}</div>` : ""}
      </div>` : `
      <div class="card"><p>هذا الدرس ${TYPES[l.type].n === "مراجعة" ? "للمراجعة" : "يُدرس من الكتاب مباشرة"}. افتح صفحة الدرس في كتاب لغتي وأجب عن تدريباته، ثم راجع حلها وملخصها من قسم المصادر.</p>
        <p class="row"><a class="btn alt" href="#/resources">فتح المصادر</a></p></div>`;
    $app.innerHTML = `
      <a class="back" href="#/">‹ كل الدروس</a>
      <div class="row" style="margin-bottom:6px">${badge(l.type)}<span class="muted">${esc(unitOf(l).name)} · الأسبوع ${num(l.w)}</span></div>
      <h2 style="margin-top:0">${esc(l.title)}</h2>
      ${body}
      ${qs.length ? `<p><a class="btn" href="#/quiz/${l.rev}">🎯 اختبر نفسك في هذا الدرس (${num(qs.length)} أسئلة)</a></p>` : ""}
      <p class="row"><button class="btn ${done[l.id] ? "alt" : ""}" id="doneBtn">${done[l.id] ? "إلغاء الإنجاز" : "✓ تم إنجاز الدرس"}</button></p>
      <div class="row" style="justify-content:space-between">${nav(LESSONS[idx - 1], "› السابق")}${nav(LESSONS[idx + 1], "التالي ‹")}</div>`;
    document.getElementById("doneBtn").onclick = () => { if (done[l.id]) delete done[l.id]; else done[l.id] = true; saveDone(); viewLesson(id); };
  }

  /* ---------- الأسابيع ---------- */
  function viewWeeks() {
    $app.innerHTML = `<h2>توزيع المنهج (١٧ أسبوعًا)</h2>` + WEEKS.map(([w, d]) => {
      const ls = LESSONS.filter((l) => l.w === w);
      return `<section class="card"><div class="week"><span class="n">الأسبوع ${num(w)}</span><span class="d">${d} هـ</span></div>
        <ul>${ls.map((l) => `<li class="${done[l.id] ? "done" : ""}"><a href="#/lesson/${l.id}">${esc(l.title)}</a></li>`).join("")}</ul></section>`;
    }).join("") + `<section class="card"><b>إجازة الخريف:</b> ٦/١٠ – ٦/١٨ هـ (بين الأسبوعين ١٣ و١٤).<br><b>الأسبوع ١٨</b> (٧/١٨ – ٧/٢٢): اختبارات شفهية وعملية. <b>الأسبوع ١٩</b> (٧/٢٥ – ٧/٢٩): الاختبارات النهائية.</section>
      <p class="note">التواريخ بالتقويم الهجري (١٤٤٨/١٤٤٩ هـ) كما وردت في توزيع المنهج، وقد تتغير حسب تقويم وزارة التعليم.</p>`;
  }

  /* ---------- الاختبار ---------- */
  let run = null;
  function viewQuizMenu() {
    const keys = [...new Set(QUIZ.map((q) => q.rev))];
    const last = scores.slice(-3).reverse();
    $app.innerHTML = `
      <h2>اختبر نفسك</h2>
      <section class="card"><p>${num(QUIZ.length)} سؤالًا في القواعد والإملاء والكتابة. اختر موضوعًا أو اختبارًا شاملًا.</p>
        <p class="row"><a class="btn" href="#/quiz/all">اختبار شامل (١٠ أسئلة)</a></p></section>
      <section class="card"><h3>حسب الدرس</h3><div class="chips" style="flex-wrap:wrap;overflow:visible">
        ${keys.map((k) => `<a class="chip" style="text-decoration:none" href="#/quiz/${k}">${esc(REVIEW[k].title)} (${num(QUIZ.filter((q) => q.rev === k).length)})</a>`).join("")}</div></section>
      ${last.length ? `<section class="card"><h3>آخر النتائج</h3>${last.map((s) => `<div class="row" style="justify-content:space-between"><span>${esc(s.topic)}</span><b>${num(s.s)}/${num(s.n)}</b></div>`).join("")}</section>` : ""}`;
  }

  function startQuiz(topic) {
    const pool = topic === "all" ? QUIZ : QUIZ.filter((q) => q.rev === topic);
    if (!pool.length) return viewQuizMenu();
    run = { topic, name: topic === "all" ? "اختبار شامل" : REVIEW[topic].title, qs: shuffle(pool).slice(0, 10), i: 0, s: 0, wrong: [] };
    viewQuestion();
  }

  function viewQuestion() {
    const q = run.qs[run.i];
    // نخلط الخيارات مع الحفاظ على الإجابة الصحيحة
    const order = shuffle(q.o.map((_, k) => k));
    $app.innerHTML = `
      <a class="back" href="#/quiz">‹ إنهاء الاختبار</a>
      <div class="progress"><i style="width:${pct(run.i, run.qs.length)}%"></i></div>
      <p class="muted">السؤال ${num(run.i + 1)} من ${num(run.qs.length)} · ${esc(run.name)}</p>
      <section class="card"><h3>${esc(q.q)}</h3>
        <div class="opts">${order.map((k) => `<button class="opt" data-k="${k}">${esc(q.o[k])}</button>`).join("")}</div>
        <div id="fb"></div></section>`;
    $app.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
      const k = +b.dataset.k, ok = k === q.a;
      $app.querySelectorAll(".opt").forEach((x) => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add("right"); });
      if (!ok) { b.classList.add("wrong"); run.wrong.push(q); } else run.s++;
      const last = run.i === run.qs.length - 1;
      document.getElementById("fb").innerHTML = `<div class="explain">${ok ? "✅ إجابة صحيحة. " : "❌ إجابة خاطئة. "}${esc(q.e)}</div>
        <p><button class="btn" id="nx">${last ? "عرض النتيجة" : "السؤال التالي"}</button></p>`;
      const nx = document.getElementById("nx"); nx.focus();
      nx.onclick = () => { run.i++; last ? viewResult() : viewQuestion(); };
    }));
  }

  function viewResult() {
    scores.push({ d: Date.now(), s: run.s, n: run.qs.length, topic: run.name });
    scores = scores.slice(-30); store.set("lugati.scores", scores);
    const p = pct(run.s, run.qs.length);
    const msg = p >= 90 ? `ممتازة يا ${who}! 🌟` : p >= 70 ? `جيد جدًا يا ${who} 👏` : p >= 50 ? `جيد يا ${who}، راجعي الأخطاء 💪` : `لا بأس يا ${who}، راجعي الدرس وأعيدي المحاولة، أنتِ قادرة 📖`;
    const keys = [...new Set(run.wrong.map((q) => q.rev))];
    $app.innerHTML = `<section class="card"><div class="score">${num(run.s)} / ${num(run.qs.length)}</div><p style="text-align:center">${msg}</p>
      ${keys.length ? `<h3>راجع هذه الدروس:</h3>${keys.map((k) => { const l = LESSONS.find((x) => x.rev === k); return l ? `<p><a href="#/lesson/${l.id}">${esc(REVIEW[k].title)}</a></p>` : ""; }).join("")}` : ""}
      <p class="row"><button class="btn" id="again">إعادة الاختبار</button><a class="btn alt" href="#/quiz">القائمة</a></p></section>`;
    document.getElementById("again").onclick = () => startQuiz(run.topic);
  }

  /* ---------- المصادر ---------- */
  function viewResources() {
    $app.innerHTML = `<h2>المصادر</h2>
      <section class="card res">${RESOURCES.map((r) => `<a class="r" href="${esc(r.u)}" target="_blank" rel="noopener"><span class="ic">${r.i}</span><span>${esc(r.t)}</span></a>`).join("")}</section>
      <p class="note">هيكل الدروس والتوزيع مأخوذ من صفحة مادة لغتي (ثاني متوسط – الفصل الأول) في موقع كتبي:
      <a href="${SOURCE}" target="_blank" rel="noopener">${SOURCE}</a>.
      الملخص والاختبارات وأوراق العمل أعمال أصحابها (ومنها ملخص أ. ذاكر الشمري)، وهي مرتبطة هنا بروابطها الأصلية ولم تُنسخ في التطبيق. شروح القواعد والأسئلة داخل التطبيق مكتوبة للمراجعة السريعة، فتأكد دائمًا من الكتاب المدرسي.</p>
      <p class="row"><button class="btn alt" id="reset">مسح التقدم والنتائج</button></p>`;
    document.getElementById("reset").onclick = () => { if (confirm("هل تريد مسح تقدمك ونتائجك؟")) { done = {}; scores = []; saveDone(); store.set("lugati.scores", []); viewResources(); } };
  }

  /* ---------- التوجيه ---------- */
  function route() {
    const [, a, b] = (location.hash || "#/").split("/");
    const tab = a === "weeks" ? "weeks" : a === "quiz" ? "quiz" : a === "resources" ? "resources" : "home";
    document.querySelectorAll(".tabs a").forEach((x) => x.classList.toggle("on", x.dataset.tab === tab));
    if (a === "lesson") viewLesson(b);
    else if (a === "weeks") viewWeeks();
    else if (a === "quiz") (b ? startQuiz(b) : viewQuizMenu());
    else if (a === "resources") viewResources();
    else viewHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ---------- الوضع الليلي ---------- */
  const root = document.documentElement;
  const savedTheme = store.get("lugati.theme", null);
  if (savedTheme) root.dataset.theme = savedTheme;
  document.getElementById("themeBtn").onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark"; store.set("lugati.theme", root.dataset.theme);
  };

  /* ---------- العمل دون اتصال ---------- */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});

  route();
})();
