/* الشاشات والتوجيه */
(function () {
  "use strict";
  const L = window.LUGHATI, { $, esc, num, shuffle } = L, S = L.state;
  const app = $("#app"); L.initCurrent();
  const SKILLS = { reading: "فهم المقروء", vocab: "المفردات", grammar: "النحو والصرف", spelling: "الإملاء", writing: "التعبير", poetry: "الشعر", listening: "الاستماع", speaking: "التحدث" };
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const lessonById = (id) => L.lessons().find((l) => l.id === id);
  const has = (l, k) => {
    if (k === "reading") return !!(l.reading && l.reading.paragraphs && l.reading.paragraphs.length);
    if (k === "vocab") return !!(l.vocab && l.vocab.length);
    if (k === "grammar") return !!(l.grammar && ((l.grammar.exercises || []).length || (l.grammar.rule || []).length));
    if (k === "spelling") return !!(l.spelling && ((l.spelling.exercises || []).length || (l.spelling.dictation || []).length || (l.spelling.pen || []).length || (l.spelling.rule || []).length));
    if (k === "activity") return !!(l.activity && ((l.activity.rule || []).length || (l.activity.questions || []).length));
    if (k === "writing") return !!l.writing; if (k === "poetry") return !!l.poetry; return false;
  };
  const back = (id) => '<a class="back" href="#/lesson/' + id + '">‹ الدرس</a>';
  const srcNote = (s) => (s ? '<div class="srcnote">المصدر: ' + esc(s) + "</div>" : "");
  const ruleCard = (title, rule) => (rule && rule.length ? '<section class="card"><h3>' + esc(title) + '</h3><ul class="pts">' + rule.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul></section>" : "");

  /* ---------- الرئيسية ---------- */
  function home() {
    const all = L.lessons(), cur = all[Math.min(S.current, all.length - 1)];
    const wk = S.weeks[L.weekKey()] || 0, st = L.streak();
    const due = L.unlocked().flatMap((l) => (l.vocab || []).map((v) => L.cardKey(l.id, v.w))).filter(L.cardDue).length;
    app.innerHTML =
      '<section class="card hero"><h2>أهلًا يا ' + esc(S.name) + " 👋</h2>" +
      '<div class="stats"><div><b>' + num(st) + '</b>أيام متتالية 🔥</div><div><b>' + num(wk) + "/" + num(S.goal) + '</b>هدف الأسبوع</div><div><b>' + num(S.mistakes.length) + "</b>أخطاء للمراجعة</div></div>" +
      '<div class="progress"><i style="width:' + Math.min(100, pct(wk, S.goal)) + '%"></i></div>' +
      (cur ? '<p><a class="btn" href="#/lesson/' + cur.id + '">تابعي: ' + esc(cur.title) + "</a></p>" : "") +
      '<p class="row"><a class="btn alt" href="#/practice">تدريب مختلط</a>' + (due ? '<a class="btn alt" href="#/cards">بطاقات اليوم (' + num(due) + ")</a>" : "") + (S.mistakes.length ? '<a class="btn alt" href="#/mistakes">مراجعة الأخطاء</a>' : "") + "</p></section>" +
      L.units.map((u) => '<section class="card"><h3>الوحدة ' + num(u.id) + ": " + esc(u.title) + "</h3>" +
        ((L.guides || {})[u.id] ? '<details class="guide"><summary>دليل الوحدة (ما سأتعلمه)</summary><p class="muted">أتوقع بمشيئة الله بعد دراستي هذه الوحدة أن أكون قادرة على:</p><ol class="pts">' + L.guides[u.id].goals.map((g) => "<li>" + esc(g) + "</li>").join("") + "</ol>" + (L.guides[u.id].texts ? "<p><b>نصوص الوحدة:</b> " + L.guides[u.id].texts.map(esc).join("، ") + "</p>" : "") + (L.guides[u.id].task ? "<p><b>الإنجاز:</b> " + esc(L.guides[u.id].task) + "</p>" : "") + srcNote(L.guides[u.id].src) + "</details>" : "") +
        u.lessons.map((l) => { const idx = all.findIndex((x) => x.id === l.id), lock = idx > S.current;
          return '<a class="lrow' + (lock ? " lock" : "") + '" href="' + (lock ? "#/" : "#/lesson/" + l.id) + '"><span>' + (lock ? "🔒" : S.done[l.id] ? "✅" : "📖") + "</span><span>" + esc(l.title) + '</span><small>ص ' + esc(l.page || "") + "</small></a>"; }).join("") + "</section>").join("") +
      '<p class="note">المحتوى من كتاب لغتي ثاني متوسط (ف١) عبر النسخة المحلولة في موقع كتبي. ولي الأمر يحدد الدرس الحالي من «ولي الأمر».</p>';
  }

  /* ---------- الدرس ---------- */
  function lesson(id) {
    const l = lessonById(id); if (!l) return home();
    const mod = (k, ico, name, hint) => '<a class="mod' + (has(l, k) ? "" : " off") + '" href="' + (has(l, k) ? "#/" + k + "/" + id : "#/lesson/" + id) + '"><span class="ico">' + ico + "</span><b>" + name + "</b><small>" + (has(l, k) ? hint : "لم يُضف بعد من الكتاب") + "</small></a>";
    app.innerHTML = '<a class="back" href="#/">‹ الدروس</a><h2>' + esc(l.title) + '</h2><p class="muted">الوحدة ' + num(l.unit.id) + " · ص " + esc(l.page || "") + '</p><div class="mods">' +
      mod("reading", "📖", "القراءة", "نص + أسئلة") + mod("vocab", "🔤", "المفردات", "بطاقات وتدريب") + mod("grammar", "✏️", "النحو والصرف", "قاعدة وتمارين") +
      mod("spelling", "🔊", "الإملاء", "إملاء وكتابة") + mod("writing", "📝", "التعبير", "مهمة ونموذج") + mod("poetry", "🎼", "الشعر", "قراءة وحفظ") +
      (has(l, "activity") ? mod("activity", l.activity.icon || "🎧", l.activity.name || "نشاط", "معلومات وأسئلة") : "") + "</div>" +
      '<p><button class="btn alt" id="dn">' + (S.done[id] ? "إلغاء إنجاز الدرس" : "✓ أنهيت هذا الدرس") + "</button></p>";
    $("#dn").onclick = () => { S.done[id] = !S.done[id]; L.save(); lesson(id); };
  }

  /* ---------- القراءة ---------- */
  function reading(id) {
    const l = lessonById(id), r = l.reading;
    const wrap = (p) => esc(p).split(/(\s+)/).map((w) => (/^\s+$/.test(w) || !w ? w : '<span class="w" data-w="' + w + '">' + w + "</span>")).join("");
    app.innerHTML = back(id) + "<h2>" + esc(r.title) + '</h2><p class="muted">اضغطي أي كلمة لتسمعيها.</p><section class="card text" id="txt">' + r.paragraphs.map((p) => "<p>" + wrap(p) + "</p>").join("") + "</section>" +
      '<p><button class="btn" id="all">🔊 قراءة النص كاملًا</button> <button class="btn alt" id="stop">⏹</button></p><p class="muted" id="nv" hidden>لا يوجد صوت عربي على هذا الجهاز. ثبّتي «محرك Google لتحويل النص إلى كلام» وحمّلي الصوت العربي من إعدادات الجهاز.</p>' +
      (r.credit ? '<div class="srcnote">' + esc(r.credit) + "</div>" : "") + srcNote(r.src) +
      ((r.questions || []).length ? '<p><a class="btn" href="#/readq/' + id + '">أسئلة الفهم (' + num(r.questions.length) + ")</a></p>" : "");
    const warn = () => { if (!L.tts.hasArabic()) $("#nv").hidden = false; };
    $("#txt").onclick = (e) => { const s = e.target.closest(".w"); if (!s) return; document.querySelectorAll(".w.hl").forEach((x) => x.classList.remove("hl")); s.classList.add("hl");
      if (!L.tts.say(s.dataset.w.replace(/[«»،.؛:؟!]/g, ""), { rate: 0.7 })) $("#nv").hidden = false; else warn(); };
    $("#all").onclick = () => { if (!L.tts.say(r.paragraphs.join(" "), { rate: 0.8 })) $("#nv").hidden = false; else warn(); };
    $("#stop").onclick = () => L.tts.stop();
  }
  function round(id, sec, title) {
    const l = lessonById(id), pool = L.buildPool([l]).filter((q) => q.sec === sec);
    app.innerHTML = back(id) + '<div id="rd"></div>';
    L.runRound($("#rd"), pool, { title, onFinish: () => {} });
  }

  /* ---------- المفردات ---------- */
  function vocab(id) {
    const l = lessonById(id);
    app.innerHTML = back(id) + "<h2>المفردات</h2>" + '<p class="row"><a class="btn" href="#/vocabq/' + id + '">تدريب على المفردات</a><a class="btn alt" href="#/cards/' + id + '">بطاقات المراجعة</a></p>' +
      '<section class="card"><table class="vt">' + l.vocab.map((v) => "<tr><th>" + esc(v.w) + "</th><td>" + esc(v.m) + "</td></tr>").join("") + "</table>" + srcNote(l.vocab[0].src) + "</section>";
  }
  function cards(id) {
    const ls = id ? [lessonById(id)] : L.unlocked();
    const deck = shuffle(ls.flatMap((l) => (l.vocab || []).map((v) => Object.assign({ lid: l.id }, v))).filter((v) => L.cardDue(L.cardKey(v.lid, v.w))));
    app.innerHTML = (id ? back(id) : '<a class="back" href="#/">‹ الرئيسية</a>') + '<div id="cd"></div>';
    let n = 0; const total = deck.length;
    const show = () => {
      if (!deck.length) { $("#cd").innerHTML = '<section class="card center"><h3>' + (total ? "أنهيتِ بطاقات اليوم 🎉" : "لا توجد بطاقات مستحقة الآن") + '</h3><p class="muted">الكلمات التي أخطأتِ فيها تعود بعد قليل، والتي عرفتِها تعود بعد أيام.</p><a class="btn" href="#/">الرئيسية</a></section>'; if (total) L.markPractice(); return; }
      const c = deck[0];
      $("#cd").innerHTML = '<p class="muted">متبقٍ ' + num(deck.length) + '</p><section class="card flash"><div class="bigword">' + esc(c.w) + '</div><p><button class="btn alt" id="sp">🔊</button></p><div id="back" hidden><p class="mean">' + esc(c.m) + '</p><p class="row"><button class="btn" id="ok">عرفتها ✓</button><button class="btn alt" id="no">لم أعرفها</button></p></div><button class="btn" id="rev">إظهار المعنى</button></section>';
      $("#sp").onclick = () => L.tts.say(c.w); $("#rev").onclick = () => { $("#back").hidden = false; $("#rev").hidden = true; };
      const rate = (ok) => { L.cardRate(L.cardKey(c.lid, c.w), ok); L.record("vocab", "مفردات", ok); deck.shift(); if (!ok) deck.push(c); n++; show(); };
      $("#ok").onclick = () => rate(true); $("#no").onclick = () => rate(false);
    };
    show();
  }

  /* ---------- نشاط (استماع / تحدث / مشروع): بطاقات معلومات من الكتاب + أسئلة ---------- */
  function activity(id) {
    const l = lessonById(id), a = l.activity;
    app.innerHTML = back(id) + "<h2>" + esc(a.title || a.name) + "</h2>" + (a.note ? '<p class="muted">' + esc(a.note) + "</p>" : "") +
      (a.cards || []).map((c) => ruleCard(c.title, c.points)).join("") + ruleCard(a.title || a.name, a.rule) + srcNote(a.src) +
      ((a.questions || []).length ? '<p><a class="btn" href="#/activityq/' + id + '">أسئلة (' + num(a.questions.length) + ")</a></p>" : "");
  }

  /* ---------- النحو والصرف ---------- */
  function grammar(id) {
    const l = lessonById(id), g = l.grammar;
    app.innerHTML = back(id) + "<h2>" + esc(g.title || "النحو والصرف") + "</h2>" + (g.rule && g.rule.length ? ruleCard("القاعدة من الكتاب", g.rule) : '<p class="muted">قاعدة هذا الدرس تأتي في درسها لاحقًا في الكتاب.</p>') +
      ((g.exercises || []).length ? '<p><a class="btn" href="#/grammarq/' + id + '">تمارين (' + num(g.exercises.length) + ")</a></p>" : "");
  }

  /* ---------- الإملاء ---------- */
  function spelling(id) {
    const l = lessonById(id), s = l.spelling, pen = s.pen || [];
    app.innerHTML = back(id) + "<h2>" + esc(s.title || "الإملاء") + "</h2>" + ruleCard("القاعدة من الكتاب", s.rule) +
      ((s.dictation || []).length ? '<p><a class="btn" href="#/spellq/' + id + '">إملاء (' + num(s.dictation.length) + ")</a></p>" : "") +
      (pen.length ? '<section class="card"><h3>أكتب الكلمات بخط الرقعة</h3><p class="muted">انظري إلى الكلمة ثم اكتبيها بالقلم أو بالإصبع.</p><div class="chipsrow">' + pen.map((p) => '<span class="tok">' + esc(p.text) + "</span>").join("") + '</div><p><a class="btn" href="#/spellq/' + id + '">ابدئي</a></p></section>' : "");
  }

  /* ---------- التعبير ---------- */
  const CHECK = ["مقدمة واضحة", "نقاط رئيسة مرتبة", "خاتمة", "إملاء سليم (همزات، تاء مربوطة، ألف لينة)", "علامات الترقيم"];
  function writing(id) {
    const l = lessonById(id), w = l.writing;
    app.innerHTML = back(id) + "<h2>" + esc(w.title || "التعبير") + "</h2>" + (w.cards || []).map((c) => ruleCard(c.title, c.points)).join("") + "<section class=\"card\"><h3>المهمة</h3><p>" + esc(w.task) + "</p>" + srcNote(w.src) + '</section><section class="card"><textarea class="inp" id="wt" rows="6" placeholder="اكتبي هنا… أو استخدمي القلم"></textarea><div id="ph"></div></section>' +
      '<section class="card"><h3>قائمة المراجعة</h3>' + (w.checklist || CHECK).map((c, i) => '<label class="ck"><input type="checkbox" data-i="' + i + '"> ' + esc(c) + "</label>").join("") + '</section><p><button class="btn" id="fin">أنهيت — أرِني النموذج</button></p><div id="md"></div>';
    L.pad($("#ph"), { height: 220 });
    $("#fin").onclick = () => { const cks = [...app.querySelectorAll(".ck input")]; const ok = cks.filter((c) => c.checked).length;
      L.record("writing", "تعبير", ok >= Math.ceil(cks.length * 0.8)); S.writing[id] = { d: L.today(), ok, n: cks.length }; L.markPractice(); L.save();
      $("#md").innerHTML = '<section class="card"><h3>نموذج</h3>' + (w.model ? (Array.isArray(w.model) ? w.model : [w.model]).map((m) => "<p>" + esc(m) + "</p>").join("") + srcNote(w.modelSrc || w.src) : '<p class="muted">لا يوجد نموذج في الكتاب لهذه المهمة.</p>') + "<p>قيّمتِ نفسك: " + num(ok) + " من " + num(cks.length) + "</p></section>"; };
  }

  /* ---------- الشعر ---------- */
  function poetry(id) {
    const l = lessonById(id), p = l.poetry; let hide = 0;
    app.innerHTML = back(id) + "<h2>" + esc(p.title) + '</h2><section class="card poem" id="pm"></section><p class="row"><button class="btn" id="rd">🔊 قراءة بيتًا بيتًا</button><button class="btn alt" id="mem">حفظ: أخفِ كلمات أكثر</button><button class="btn alt" id="shw">إظهار الكل</button></p>' +
      ((p.meanings || []).length ? '<section class="card"><h3>معاني الكلمات</h3><table class="vt">' + p.meanings.map((m) => "<tr><th>" + esc(m.w) + "</th><td>" + esc(m.m) + "</td></tr>").join("") + "</table></section>" : "") +
      ruleCard("ملاحظات", p.notes) + srcNote(p.src) + ((p.questions || []).length ? '<p><a class="btn" href="#/poetryq/' + id + '">أسئلة النص (' + num(p.questions.length) + ")</a></p>" : "");
    const lines = p.lines.map((x) => (Array.isArray(x) ? x.join("   ") : x));
    const seeds = lines.map((ln) => shuffle(ln.split(/\s+/).map((w, i) => i)));
    const draw = (hl) => { $("#pm").innerHTML = lines.map((ln, li) => '<div class="pl' + (hl === li ? " hl" : "") + '">' + ln.split(/\s+/).map((w, i) => { const hidden = seeds[li].indexOf(i) < Math.round(hide * seeds[li].length); return hidden ? '<span class="gap">＿＿</span>' : esc(w); }).join(" ") + "</div>").join(""); };
    $("#rd").onclick = () => { let i = 0; const nx = () => { if (i >= lines.length) { draw(-1); return; } draw(i); L.tts.say(lines[i++], { rate: 0.8, onend: nx }); }; nx(); };
    $("#mem").onclick = () => { hide = Math.min(1, hide + 0.25); draw(-1); if (hide >= 1) L.record("poetry", "حفظ", true); }; $("#shw").onclick = () => { hide = 0; draw(-1); }; draw(-1);
  }

  /* ---------- تدريب مختلط ومراجعة الأخطاء ---------- */
  function practice() { app.innerHTML = '<a class="back" href="#/">‹ الرئيسية</a><div id="rd"></div>'; L.runRound($("#rd"), L.buildPool(L.unlocked()), { title: "تدريب مختلط" }); }
  function mistakes() { const ids = new Set(S.mistakes.map((m) => m.id)); const pool = L.buildPool(L.lessons()).filter((q) => ids.has(q.id));
    app.innerHTML = '<a class="back" href="#/">‹ الرئيسية</a><div id="rd"></div>'; L.runRound($("#rd"), pool, { title: "مراجعة الأخطاء" }); }

  /* ---------- ولي الأمر ---------- */
  function parent() {
    const all = L.lessons(), skills = Object.keys(SKILLS), tags = Object.entries(S.tags).filter(([, v]) => v.n >= 3).map(([k, v]) => [k, pct(v.c, v.n), v.n]).sort((a, b) => a[1] - b[1]);
    const weak = tags.filter((t) => t[1] < 75).slice(0, 3);
    const extras = L.buildPool(all).filter((q) => /مضاف/.test(q.src || "")).length;
    const bar = (label, v, n) => '<div class="bar"><span>' + esc(label) + '</span><div class="progress"><i style="width:' + v + '%"></i></div><b>' + (n ? num(v) + "٪" : "—") + "</b></div>";
    app.innerHTML = '<a class="back" href="#/">‹ الرئيسية</a><h2>ولي الأمر</h2>' +
      '<section class="card"><h3>الدرس الحالي</h3><p class="muted">التدريب يغطي الدروس حتى هذا الدرس فقط.</p><select id="cur" class="inp">' + all.map((l, i) => '<option value="' + i + '"' + (i === S.current ? " selected" : "") + ">الوحدة " + num(l.unit.id) + " — " + esc(l.title) + "</option>").join("") + '</select><label class="muted">اسم الطالبة <input id="nm" class="inp" value="' + esc(S.name) + '"></label><label class="muted">هدف الأسبوع (جولات) <input id="gl" class="inp" type="number" min="1" max="30" value="' + S.goal + '"></label></section>' +
      '<section class="card"><h3>المهارات</h3>' + skills.map((k) => { const a = S.skills[k] || { c: 0, n: 0 }; return bar(SKILLS[k], pct(a.c, a.n), a.n); }).join("") + "</section>" +
      '<section class="card"><h3>نقاط الضعف</h3>' + (tags.length ? tags.slice(0, 8).map((t) => bar(t[0], t[1], t[2])).join("") : '<p class="muted">تظهر هنا بعد حل بعض الأسئلة.</p>') + "</section>" +
      '<section class="card"><h3>اقتراح</h3>' + (weak.length ? "<ul>" + weak.map((t) => "<li>تدرّبي على «" + esc(t[0]) + "» (" + num(t[1]) + "٪)</li>").join("") + '</ul><a class="btn" href="#/mistakes">ابدئي بمراجعة الأخطاء</a>' : '<p class="muted">لا توجد نقاط ضعف واضحة بعد. استمري في التدريب المختلط.</p>') + "</section>" +
      '<section class="card"><h3>للمراجعة</h3><p class="muted">عدد الأسئلة التي كتبها التطبيق ولم تُنقل حرفيًا من الكتاب: ' + num(extras) + '. تحمل علامة «المصدر: مضاف».</p><a class="btn alt" href="#/extras">عرضها</a></section>' +
      '<p><button class="btn alt" id="rs">مسح كل التقدم</button></p>';
    $("#cur").onchange = (e) => { S.current = +e.target.value; L.save(); }; $("#nm").onchange = (e) => { S.name = e.target.value.trim() || "سارة"; L.save(); }; $("#gl").onchange = (e) => { S.goal = Math.max(1, +e.target.value || 5); L.save(); };
    $("#rs").onclick = () => { if (confirm("مسح كل التقدم والنتائج؟")) { L.reset(); parent(); } };
  }
  function extrasView() {
    const list = L.buildPool(L.lessons()).filter((q) => /مضاف/.test(q.src || ""));
    app.innerHTML = '<a class="back" href="#/parent">‹ ولي الأمر</a><h2>أسئلة مضافة للمراجعة</h2><p class="muted">كتبها التطبيق من نص الكتاب. تحققي من صحتها.</p>' + list.map((q) => '<section class="card"><b>' + esc(q.q) + "</b><br>" + (q.o ? "الإجابة: " + esc(q.o[q.a]) + "<br>" : "") + '<span class="muted">' + esc(q.why || "") + "</span></section>").join("");
  }

  /* ---------- التوجيه ---------- */
  const routes = { "": home, lesson, reading, vocab, grammar, spelling, writing, poetry, activity, cards, activityq: (id) => round(id, "activity", "أسئلة"), poetryq: (id) => round(id, "poetry", "أسئلة النص"), practice, mistakes, parent, extras: extrasView,
    readq: (id) => round(id, "reading", "أسئلة الفهم"), vocabq: (id) => round(id, "vocab", "المفردات"), grammarq: (id) => round(id, "grammar", "النحو"),
    spellq: (id) => round(id, "spelling", "الإملاء") };
  function route() {
    const [, name, id] = (location.hash || "#/").replace(/^#\/?/, "#/").split("/"); L.tts.stop();
    const fn = routes[name || ""] || home; try { fn(id); } catch (e) { app.innerHTML = '<section class="card"><p>تعذّر عرض هذه الشاشة.</p><a class="btn" href="#/">الرئيسية</a></section>'; console.error(e); }
    const grp = { practice: "practice", mistakes: "practice", cards: "cards", parent: "parent", extras: "parent" }[name] || "";
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#/" + grp));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route); route();
})();
