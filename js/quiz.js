/* محرك الأسئلة: اختيار، صح/خطأ، ترتيب، تصنيف، إجابة قصيرة، مطابقة، كتابة بالقلم */
(function () {
  "use strict";
  const L = window.LUGHATI, { $, esc, num, shuffle, norm } = L;

  /* ---------- بناء مجموعة الأسئلة من محتوى الدروس ---------- */
  L.buildPool = function (lessons) {
    const pool = [];
    const add = (q, id, extra) => { q.id = id; Object.assign(q, extra || {}); pool.push(q); };
    const allVocab = lessons.flatMap((l) => (l.vocab || []).map((v) => Object.assign({ lid: l.id }, v)));
    lessons.forEach((l) => {
      ((l.reading && l.reading.questions) || []).forEach((q, i) => add(q, l.id + ":r" + i, { sec: "reading", lid: l.id }));
      ((l.grammar && l.grammar.exercises) || []).forEach((q, i) => add(q, l.id + ":g" + i, { sec: "grammar", lid: l.id }));
      (l.vocabQ || []).forEach((q, i) => add(q, l.id + ":vq" + i, { sec: "vocab", lid: l.id }));
      ((l.spelling && l.spelling.exercises) || []).forEach((q, i) => add(q, l.id + ":s" + i, { sec: "spelling", lid: l.id }));
      ((l.spelling && l.spelling.dictation) || []).forEach((d, i) => add({ type: "dictation", skill: "spelling", tag: d.tag || "إملاء", text: d.text, src: d.src, q: "أستمع ثم أكتب الجملة" }, l.id + ":d" + i, { sec: "spelling", lid: l.id }));
      ((l.spelling && l.spelling.pen) || []).forEach((d, i) => add({ type: "pen", skill: "spelling", tag: "رسم الحروف", src: d.src, q: "أكتب الكلمة بخط الرقعة", text: d.text }, l.id + ":p" + i, { sec: "spelling", lid: l.id }));
      (l.vocab || []).forEach((v, i) => {
        const others = shuffle(allVocab.filter((x) => x.w !== v.w)).slice(0, 3);
        if (others.length >= 3) {
          const opts = shuffle([v.m].concat(others.map((x) => x.m)));
          add({ type: "mcq", skill: "vocab", tag: "مفردات", src: v.src, q: "ما معنى (" + v.w + ")؟", o: opts, a: opts.indexOf(v.m), why: v.w + ": " + v.m }, l.id + ":v" + i, { sec: "vocab", lid: l.id });
        }
      });
    });
    return pool;
  };

  /* ---------- عرض سؤال واحد ---------- */
  function renderQuestion(host, q, done) {
    let answered = false;
    const finish = (ok, extraHtml) => {
      if (answered) return; answered = true;
      L.record(q.skill, q.tag, ok); if (ok) L.clearMistake(q.id); else L.addMistake(q); L.save();
      const fb = $(".fb", host);
      fb.className = "fb " + (ok ? "good" : "bad");
      fb.innerHTML = (ok ? "✅ أحسنتِ! " : "❌ ليست صحيحة. ") + (q.why ? esc(q.why) : "") + (extraHtml || "") + '<div class="srcnote">المصدر: ' + esc(q.src || "") + "</div>" + '<p><button class="btn" id="nx">متابعة</button></p>';
      $("#nx", host).focus(); $("#nx", host).onclick = () => done(ok);
    };
    const head = '<h3 class="qtext">' + esc(q.q) + "</h3>" + (q.kind ? '<span class="pill">' + esc(q.kind) + "</span>" : "");
    host.innerHTML = head + '<div class="qbody"></div><div class="fb" aria-live="polite"></div>';
    const body = $(".qbody", host);

    if (q.type === "mcq" || q.type === "tf") {
      const opts = q.type === "tf" ? ["صح", "خطأ"] : q.o;
      const ans = q.type === "tf" ? (q.a ? 0 : 1) : q.a;
      // نخلط ترتيب الخيارات في الاختيار من متعدد حتى لا تكون الإجابة الصحيحة في موضع ثابت (صح/خطأ يبقى بترتيبه)
      const order = q.type === "tf" ? opts.map((_, i) => i) : shuffle(opts.map((_, i) => i));
      body.innerHTML = '<div class="opts">' + order.map((i) => '<button class="opt" data-i="' + i + '">' + esc(opts[i]) + "</button>").join("") + "</div>";
      body.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
        if (answered) return; const i = +b.dataset.i;
        body.querySelectorAll(".opt").forEach((x) => { x.disabled = true; if (+x.dataset.i === ans) x.classList.add("right"); });
        if (i !== ans) b.classList.add("wrong"); finish(i === ans);
      });
    } else if (q.type === "order") {
      let picked = []; const bank = shuffle(q.words.map((w, i) => ({ w, i })));
      body.innerHTML = '<div class="slots" id="slots" aria-label="إجابتي"></div><div class="chipsrow" id="bank"></div><p><button class="btn" id="chk" disabled>تحقق</button> <button class="btn alt" id="rst">إعادة</button></p>';
      const draw = () => {
        $("#slots", body).innerHTML = picked.map((p, k) => '<button class="tok on" data-k="' + k + '">' + esc(p.w) + "</button>").join("") || '<span class="muted">اضغطي الكلمات بالترتيب</span>';
        $("#bank", body).innerHTML = bank.map((b) => '<button class="tok" data-b="' + b.i + '" ' + (picked.includes(b) ? "disabled" : "") + ">" + esc(b.w) + "</button>").join("");
        $("#chk", body).disabled = picked.length !== bank.length;
      };
      body.onclick = (e) => {
        if (answered) return; const t = e.target.closest("button"); if (!t) return;
        if (t.dataset.b !== undefined) picked.push(bank.find((x) => x.i === +t.dataset.b));
        else if (t.dataset.k !== undefined) picked.splice(+t.dataset.k, 1);
        else if (t.id === "rst") picked = [];
        else if (t.id === "chk") { const ok = picked.map((p) => p.w).join(" ") === q.a.join(" "); finish(ok, ok ? "" : '<div class="ans">الصحيح: ' + esc(q.a.join(" ")) + "</div>"); return; }
        draw();
      }; draw();
    } else if (q.type === "sort") {
      const sel = q.items.map(() => -1);
      body.innerHTML = q.items.map((it, i) => '<div class="sortrow"><span>' + esc(it[0]) + "</span>" + q.buckets.map((b, k) => '<button class="tok" data-i="' + i + '" data-k="' + k + '">' + esc(b) + "</button>").join("") + "</div>").join("") + '<p><button class="btn" id="chk" disabled>تحقق</button></p>';
      body.onclick = (e) => {
        if (answered) return; const t = e.target.closest("button.tok"); if (t) { const i = +t.dataset.i; sel[i] = +t.dataset.k;
          body.querySelectorAll('[data-i="' + i + '"]').forEach((x) => x.classList.toggle("on", +x.dataset.k === sel[i])); $("#chk", body).disabled = sel.includes(-1); }
        else if (e.target.id === "chk") { const wrong = q.items.filter((it, i) => sel[i] !== it[1]); finish(wrong.length === 0, wrong.length ? '<div class="ans">أخطأتِ في: ' + wrong.map((w) => esc(w[0])).join("، ") + "</div>" : ""); }
      };
    } else if (q.type === "match") {
      let left = null; const done2 = new Set(); const rights = shuffle(q.pairs.map((p, i) => ({ r: p[1], i })));
      body.innerHTML = '<div class="matchgrid"><div>' + q.pairs.map((p, i) => '<button class="tok" data-l="' + i + '">' + esc(p[0]) + "</button>").join("") + "</div><div>" + rights.map((r) => '<button class="tok" data-r="' + r.i + '">' + esc(r.r) + "</button>").join("") + "</div></div>";
      let mistakes = 0;
      body.onclick = (e) => {
        if (answered) return; const t = e.target.closest("button"); if (!t || t.disabled) return;
        if (t.dataset.l !== undefined) { left = +t.dataset.l; body.querySelectorAll("[data-l]").forEach((x) => x.classList.toggle("on", +x.dataset.l === left)); }
        else if (left !== null) { if (+t.dataset.r === left) { t.disabled = true; $('[data-l="' + left + '"]', body).disabled = true; $('[data-l="' + left + '"]', body).classList.add("right"); t.classList.add("right"); done2.add(left); left = null; if (done2.size === q.pairs.length) finish(mistakes === 0); } else { mistakes++; t.classList.add("wrong"); setTimeout(() => t.classList.remove("wrong"), 500); } }
      };
    } else if (q.type === "short") {
      body.innerHTML = '<input class="inp" id="ans" autocomplete="off" aria-label="إجابتي"><p><button class="btn" id="chk">تحقق</button></p><div id="padhost"></div>';
      const check = () => { const v = $("#ans", body).value; const ok = (Array.isArray(q.a) ? q.a : [q.a]).some((a) => norm(a, q.strict) === norm(v, q.strict)); finish(ok, ok ? "" : '<div class="ans">الإجابة: ' + esc(Array.isArray(q.a) ? q.a[0] : q.a) + "</div>"); };
      $("#chk", body).onclick = check; $("#ans", body).onkeydown = (e) => { if (e.key === "Enter") check(); };
    } else if (q.type === "open") {
      // سؤال مفتوح من الكتاب: تكتب الطالبة (لوحة/لوحة مفاتيح) ثم ترى إجابة الكتاب وتؤكد بنفسها
      body.innerHTML = '<div class="tabs2"><button class="tok on" data-m="type">⌨️ كتابة</button><button class="tok" data-m="pen">✍️ قلم</button></div><div id="typebox"><textarea class="inp" id="ans" rows="3" aria-label="إجابتي"></textarea></div><div id="padhost" hidden></div><p><button class="btn" id="chk">أرِني إجابة الكتاب</button></p>';
      let pad = null;
      body.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { const m = b.dataset.m; body.querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x === b));
        $("#typebox", body).hidden = m !== "type"; $("#padhost", body).hidden = m !== "pen"; if (m === "pen" && !pad) pad = L.pad($("#padhost", body), { height: 160 }); });
      $("#chk", body).onclick = () => { $("#chk", body).hidden = true; const box = document.createElement("div"); box.className = "ans";
        box.innerHTML = "<div>إجابة الكتاب:</div><div><b>" + (Array.isArray(q.a) ? q.a.map(esc).join("<br>") : esc(q.a)) + '</b></div><p>قارني إجابتك بإجابة الكتاب، ثم أكّدي:</p><button class="btn" id="yes">إجابتي تؤدي المعنى</button> <button class="btn alt" id="no">تحتاج إلى تحسين</button>';
        body.appendChild(box); $("#yes", box).onclick = () => { box.remove(); finish(true); }; $("#no", box).onclick = () => { box.remove(); finish(false); }; };
    } else if (q.type === "dictation" || q.type === "pen") {
      const isDict = q.type === "dictation";
      body.innerHTML = (isDict ? '<p><button class="btn" id="play">🔊 استمعي للجملة</button> <button class="btn alt" id="slow">🐢 ببطء</button></p><p class="muted" id="novoice" hidden>لا يوجد صوت عربي على هذا الجهاز؛ اطلبي من ولي الأمر قراءة الجملة.</p>' : '<p class="bigword">' + esc(q.text) + "</p>") +
        '<div class="tabs2"><button class="tok on" data-m="type">⌨️ كتابة</button><button class="tok" data-m="pen">✍️ قلم</button></div><div id="typebox"><textarea class="inp" id="ans" rows="2" aria-label="إجابتي"></textarea></div><div id="padhost" hidden></div><p><button class="btn" id="chk">أنهيت — أرِني الصحيح</button></p>';
      if (isDict) { const say = (r) => { if (!L.tts.say(q.text, { rate: r })) $("#novoice", body).hidden = false; else if (!L.tts.hasArabic()) $("#novoice", body).hidden = false; };
        $("#play", body).onclick = () => say(0.85); $("#slow", body).onclick = () => say(0.55); }
      let pad = null;
      body.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { const m = b.dataset.m; body.querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x === b));
        $("#typebox", body).hidden = m !== "type"; $("#padhost", body).hidden = m !== "pen"; if (m === "pen" && !pad) pad = L.pad($("#padhost", body), { height: 180 }); });
      $("#chk", body).onclick = () => {
        if (answered) return; const typed = $("#ans", body).value.trim();
        $("#chk", body).hidden = true;
        if (typed) { // مقارنة كلمة بكلمة (يحافظ على الهمزات والتاء)
          const want = L.norm(q.text, true).split(" "), got = L.norm(typed, true).split(" ");
          const html = want.map((w, i) => '<span class="' + (got[i] === w ? "w ok" : "w no") + '">' + esc(w) + "</span>").join(" ");
          const ok = want.length === got.length && want.every((w, i) => w === got[i]);
          finish(ok, '<div class="ans">النص الصحيح: ' + html + "</div>");
        } else { // كتابة باليد: لا تُصحَّح آليًا، يؤكد الطالب أو الوالد
          fb(q, body, finish);
        }
      };
    }
  }
  function fb(q, body, finish) {
    const box = document.createElement("div"); box.className = "ans";
    box.innerHTML = '<div>النص الصحيح: <b class="bigword">' + esc(q.text) + '</b></div><p>قارني كتابتك بالنص، ثم أكّدي:</p><button class="btn" id="yes">كتبتها صحيحة</button> <button class="btn alt" id="no">فيها أخطاء</button>';
    body.appendChild(box); $("#yes", box).onclick = () => { box.remove(); finish(true); }; $("#no", box).onclick = () => { box.remove(); finish(false); };
  }

  /* ---------- جولة من ١٠ أسئلة + مراجعة الأخطاء ---------- */
  L.runRound = function (host, questions, opts) {
    opts = opts || {}; const size = opts.size || 10;
    const qs = shuffle(questions).slice(0, size); let i = 0, score = 0; const wrong = [];
    const next = () => {
      if (i >= qs.length) return summary();
      host.innerHTML = '<div class="progress"><i style="width:' + Math.round(i / qs.length * 100) + '%"></i></div><p class="muted">السؤال ' + num(i + 1) + " من " + num(qs.length) + (opts.title ? " · " + esc(opts.title) : "") + '</p><section class="card" id="qcard"></section>';
      renderQuestion($("#qcard", host), qs[i], (ok) => { if (ok) score++; else wrong.push(qs[i]); i++; next(); });
    };
    const summary = () => {
      L.markPractice(); if (opts.onFinish) opts.onFinish(score, qs.length);
      const p = Math.round(score / qs.length * 100);
      host.innerHTML = '<section class="card center"><div class="score">' + num(score) + " / " + num(qs.length) + "</div><p>" + (p >= 90 ? "ممتازة يا " : p >= 70 ? "جيد جدًا يا " : p >= 50 ? "جيد يا " : "لا بأس يا ") + esc(L.state.name) + (p < 50 ? "، راجعي الدرس وحاولي مرة أخرى. أنتِ قادرة." : ".") + "</p>" +
        (wrong.length ? '<p><button class="btn" id="rv">مراجعة الأخطاء (' + num(wrong.length) + ")</button></p>" : "") + '<p><button class="btn alt" id="again">جولة جديدة</button> <a class="btn alt" href="#/">الرئيسية</a></p></section>';
      const rv = $("#rv", host); if (rv) rv.onclick = () => L.runRound(host, wrong, { size: wrong.length, title: "مراجعة الأخطاء", onFinish: opts.onFinish });
      $("#again", host).onclick = () => L.runRound(host, questions, opts);
    };
    if (!qs.length) { host.innerHTML = '<section class="card"><p>لا توجد أسئلة بعد لهذا الجزء من الكتاب.</p><a class="btn alt" href="#/">رجوع</a></section>'; return; }
    next();
  };
  L.renderQuestion = renderQuestion;
})();
