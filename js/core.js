/* الأساس: التخزين، التكرار المتباعد، النطق، لوحة الكتابة اليدوية */
(function () {
  "use strict";
  const L = (window.LUGHATI = window.LUGHATI || { units: [] });

  /* إضافة دروس إلى وحدة (تُنشأ إن لم تكن موجودة) من ملفات المحتوى */
  L.addLessons = (id, title, lessons) => { let u = L.units.find((x) => x.id === id); if (!u) { u = { id, title, lessons: [] }; L.units.push(u); } u.lessons.push(...lessons); };

  /* ---------- أدوات ---------- */
  L.$ = (s, r) => (r || document).querySelector(s);
  L.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  L.num = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  L.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  L.today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  L.weekKey = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); return d.toISOString().slice(0, 10); }; // الأسبوع يبدأ السبت

  /* تطبيع النص: strict=يحافظ على الهمزات والتاء المربوطة (للإملاء) */
  L.norm = (s, strict) => {
    s = String(s).replace(/[ً-ٰٟـ]/g, "").replace(/[«»"'،,.؟?!؛:\-–()]/g, " ").replace(/\s+/g, " ").trim();
    if (!strict) s = s.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
    return s;
  };

  /* ---------- التخزين ---------- */
  const KEY = "lughati.v1";
  const blank = () => ({ name: "سارة", current: 0, goal: 5, days: {}, weeks: {}, skills: {}, tags: {}, mistakes: [], cards: {}, writing: {}, done: {} });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = blank(); }
  L.state = S;
  L.save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* غير متاح */ } };
  L.reset = () => { Object.keys(S).forEach((k) => delete S[k]); Object.assign(S, blank()); L.save(); };

  /* ---------- الدروس بالترتيب ---------- */
  L.lessons = () => L.units.flatMap((u) => u.lessons.map((l) => Object.assign({ unit: u }, l)));
  L.unlocked = () => L.lessons().slice(0, S.current + 1);

  /* ---------- تسجيل النتائج ---------- */
  L.record = (skill, tag, ok) => {
    const a = (S.skills[skill] = S.skills[skill] || { c: 0, n: 0 }); a.n++; if (ok) a.c++;
    if (tag) { const t = (S.tags[tag] = S.tags[tag] || { c: 0, n: 0 }); t.n++; if (ok) t.c++; }
  };
  L.markPractice = () => {
    const d = L.today(); S.days[d] = (S.days[d] || 0) + 1;
    const w = L.weekKey(); S.weeks[w] = (S.weeks[w] || 0) + 1; L.save();
  };
  L.streak = () => { let n = 0; const d = new Date(); if (!S.days[L.today()]) d.setDate(d.getDate() - 1);
    for (;;) { const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); if (S.days[k]) { n++; d.setDate(d.getDate() - 1); } else break; } return n; };
  L.addMistake = (q) => { if (!S.mistakes.some((m) => m.id === q.id)) S.mistakes.push({ id: q.id }); };
  L.clearMistake = (id) => { S.mistakes = S.mistakes.filter((m) => m.id !== id); };

  /* ---------- التكرار المتباعد (صناديق لايتنر) ---------- */
  const GAP = [0, 1, 2, 4, 8, 16]; // أيام
  const DAY = 864e5;
  L.cardKey = (lid, w) => lid + "|" + w;
  L.cardDue = (key) => { const c = S.cards[key]; return !c || c.due <= Date.now(); };
  L.cardRate = (key, ok) => {
    const c = S.cards[key] || { box: 0 };
    c.box = ok ? Math.min(c.box + 1, GAP.length - 1) : 0;
    c.due = Date.now() + (ok ? GAP[c.box] * DAY : 60e3); // الخطأ يعود بعد دقيقة داخل الجلسة
    S.cards[key] = c; L.save();
  };

  /* ---------- النطق (TTS) ---------- */
  L.tts = {
    ok: "speechSynthesis" in window,
    voice() { const v = (speechSynthesis.getVoices() || []).filter((x) => /^ar/i.test(x.lang)); return v[0] || null; },
    hasArabic() { return this.ok && !!this.voice(); },
    say(text, o) {
      if (!this.ok) return false;
      o = o || {}; speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = "ar-SA"; const v = this.voice(); if (v) u.voice = v;
      u.rate = o.rate || 0.85; if (o.onend) u.onend = o.onend; speechSynthesis.speak(u); return true;
    },
    stop() { if (this.ok) speechSynthesis.cancel(); },
  };
  if (L.tts.ok) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; }

  /* ---------- لوحة الكتابة اليدوية (قلم/لمس) ---------- */
  L.pad = function (host, opts) {
    opts = opts || {};
    host.innerHTML = '<div class="padbar"><button type="button" data-a="pen" class="on">✏️ قلم</button><button type="button" data-a="eraser">🧽 ممحاة</button><button type="button" data-a="undo">↩︎ تراجع</button><button type="button" data-a="clear">🗑️ مسح</button></div><canvas class="padcv" aria-label="لوحة الكتابة"></canvas>';
    const cv = host.querySelector("canvas"), ctx = cv.getContext("2d");
    const h = opts.height || 200; let dpr = window.devicePixelRatio || 1;
    function size() { const w = host.clientWidth || 300; cv.style.height = h + "px"; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); redraw(); }
    let strokes = [], cur = null, mode = "pen", penSeen = false;
    const lineCol = () => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#111";
    function drawStroke(s) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over"; ctx.strokeStyle = lineCol();
      for (let i = 1; i < s.p.length; i++) { const a = s.p[i - 1], b = s.p[i]; ctx.lineWidth = s.erase ? 18 : 1.2 + b[2] * 3.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      if (s.p.length === 1) { ctx.beginPath(); ctx.arc(s.p[0][0], s.p[0][1], s.erase ? 9 : 1.5, 0, 7); ctx.fillStyle = s.erase ? "#000" : lineCol(); ctx.fill(); }
    }
    function redraw() { ctx.clearRect(0, 0, cv.width, cv.height); strokes.forEach(drawStroke); }
    const pt = (e) => { const r = cv.getBoundingClientRect(); const pr = e.pointerType === "pen" ? (e.pressure || 0.5) : 0.5; return [e.clientX - r.left, e.clientY - r.top, pr]; };
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "pen") penSeen = true;
      if (e.pointerType === "touch" && penSeen) return;          // رفض الكف عند استخدام القلم
      if (e.pointerType === "touch" && e.width > 40 && e.height > 40) return; // كف كبير
      cv.setPointerCapture(e.pointerId);
      const erase = mode === "eraser" || (e.pointerType === "pen" && (e.buttons & 32 || e.button === 5)); // زر ممحاة القلم
      cur = { erase, p: [pt(e)] }; strokes.push(cur); drawStroke(cur); e.preventDefault();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const before = cur.p.length; evs.forEach((x) => cur.p.push(pt(x)));
      const part = { erase: cur.erase, p: cur.p.slice(Math.max(0, before - 1)) }; drawStroke(part); e.preventDefault();
    });
    const end = () => { if (cur) { cur = null; opts.onChange && opts.onChange(strokes.length > 0); } };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    host.querySelector(".padbar").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; const a = b.dataset.a;
      if (a === "pen" || a === "eraser") { mode = a; host.querySelectorAll("[data-a=pen],[data-a=eraser]").forEach((x) => x.classList.toggle("on", x === b)); }
      if (a === "undo") { strokes.pop(); redraw(); opts.onChange && opts.onChange(strokes.length > 0); }
      if (a === "clear") { strokes = []; redraw(); opts.onChange && opts.onChange(false); }
    });
    setTimeout(size, 0); window.addEventListener("resize", size);
    return { empty: () => strokes.length === 0, clear() { strokes = []; redraw(); }, strokes: () => strokes };
  };
})();
