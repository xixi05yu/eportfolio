/* Tiffany Yu — GLD ePortfolio interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav: scrolled state, progress bar, mobile menu ---------- */
  const nav = $(".nav");
  const progress = $(".progress");
  const toTop = $(".to-top");
  const onScroll = () => {
    const y = window.scrollY;
    nav && nav.classList.toggle("scrolled", y > 10);
    const h = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    toTop && toTop.classList.toggle("show", y > 700);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop && toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    $$("a", links).forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach(el => io.observe(el));

  /* ---------- animated counters ---------- */
  const cio = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "";
      const start = performance.now(), dur = 1400;
      const tick = t => {
        const p = Math.min(1, (t - start) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = v + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      reduceMotion ? (el.textContent = end + suffix) : requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$("[data-count]").forEach(el => cio.observe(el));

  /* ---------- cursor spotlight (pointer devices only) ---------- */
  const spot = $(".spotlight");
  if (spot && matchMedia("(pointer: fine)").matches && !reduceMotion) {
    addEventListener("pointermove", e => {
      spot.style.opacity = 1;
      spot.style.left = e.clientX + "px";
      spot.style.top = e.clientY + "px";
    }, { passive: true });
  }

  /* ---------- typed role line ---------- */
  const typed = $("#typed");
  if (typed) {
    const words = JSON.parse(typed.dataset.words);
    if (reduceMotion) { typed.textContent = words[0]; }
    else {
      let wi = 0, ci = 0, del = false;
      const step = () => {
        const w = words[wi];
        typed.textContent = w.slice(0, ci);
        if (!del && ci < w.length) { ci++; setTimeout(step, 55); }
        else if (!del) { del = true; setTimeout(step, 1900); }
        else if (ci > 0) { ci--; setTimeout(step, 28); }
        else { del = false; wi = (wi + 1) % words.length; setTimeout(step, 300); }
      };
      step();
    }
  }

  /* ---------- hero graph canvas: a living graph that "prunes" weak edges ---------- */
  const canvas = $("#graph-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let W, H, DPR, nodes = [], pruned = [], mouse = { x: -999, y: -999 };
    const COLORS = ["#2f6bff", "#7b4dff", "#00b8f0"];
    const resize = () => {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round(Math.min(90, Math.max(34, (W * H) / 16000)));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 2.2 + 1.6, c: COLORS[(Math.random() * 3) | 0]
      }));
    };
    resize();
    addEventListener("resize", resize);
    canvas.parentElement.addEventListener("pointermove", e => {
      const b = canvas.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top;
    });
    canvas.parentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });

    const LINK = 130;
    let last = 0;
    const draw = t => {
      ctx.clearRect(0, 0, W, H);
      for (const p of nodes) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(80, 90, 200, ${(1 - d / LINK) * .28})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        // cursor links
        const a = nodes[i], dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < 180) {
          ctx.strokeStyle = `rgba(123, 77, 255, ${(1 - dm / 180) * .55})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      // every ~900ms flag a random edge as "pruned"
      if (t - last > 900) {
        last = t;
        const i = (Math.random() * nodes.length) | 0;
        let best = -1, bd = LINK;
        nodes.forEach((b, j) => { if (j !== i) { const d = Math.hypot(nodes[i].x - b.x, nodes[i].y - b.y); if (d < bd) { bd = d; best = j; } } });
        if (best >= 0) pruned.push({ a: nodes[i], b: nodes[best], life: 1 });
      }
      pruned = pruned.filter(e => (e.life -= .012) > 0);
      for (const e of pruned) {
        const mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2;
        ctx.strokeStyle = `rgba(255, 77, 157, ${e.life * .9})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
        ctx.setLineDash([]);
        const s = 5 * e.life + 2;
        ctx.strokeStyle = `rgba(255, 77, 157, ${e.life})`;
        ctx.beginPath(); ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s); ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s); ctx.stroke();
      }
      // nodes
      for (const p of nodes) {
        ctx.fillStyle = p.c;
        ctx.globalAlpha = .85;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = .12;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (!reduceMotion) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  /* ---------- slideshow ---------- */
  $$(".slideshow").forEach(ss => {
    const slides = $$(".slide", ss);
    const thumbsWrap = ss.parentElement.querySelector(".thumbs");
    const counter = $(".ss-counter", ss);
    const bar = $(".ss-progress", ss);
    const playBtn = $(".ss-play", ss);
    const DUR = 5200;
    let i = 0, timer = null, playing = !reduceMotion, startT = 0, raf;

    // lazy-load: set real src when needed
    const load = k => { const img = $("img", slides[k]); if (img && img.dataset.src) { img.src = img.dataset.src; img.removeAttribute("data-src"); } };

    if (thumbsWrap) {
      slides.forEach((s, k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Show photo " + (k + 1));
        const src = ($("img", s).dataset.src || $("img", s).src);
        b.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
        b.addEventListener("click", () => go(k, true));
        thumbsWrap.appendChild(b);
      });
    }
    const go = (k, user) => {
      slides[i].classList.remove("active");
      i = (k + slides.length) % slides.length;
      load(i); load((i + 1) % slides.length);
      slides[i].classList.add("active");
      if (counter) counter.textContent = `${String(i + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      if (thumbsWrap) {
        $$("button", thumbsWrap).forEach((b, k2) => b.classList.toggle("active", k2 === i));
        const act = thumbsWrap.children[i];
        act && thumbsWrap.scrollTo({ left: act.offsetLeft - thumbsWrap.clientWidth / 2 + act.clientWidth / 2, behavior: "smooth" });
      }
      restart();
    };
    const restart = () => {
      clearTimeout(timer); cancelAnimationFrame(raf);
      if (bar) bar.style.width = "0";
      if (!playing) return;
      startT = performance.now();
      const anim = t => { if (bar) bar.style.width = Math.min(100, ((t - startT) / DUR) * 100) + "%"; raf = requestAnimationFrame(anim); };
      raf = requestAnimationFrame(anim);
      timer = setTimeout(() => go(i + 1), DUR);
    };
    const setPlaying = p => {
      playing = p;
      if (playBtn) {
        playBtn.innerHTML = p
          ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        playBtn.setAttribute("aria-label", p ? "Pause slideshow" : "Play slideshow");
      }
      restart();
    };
    $(".ss-prev", ss).addEventListener("click", () => go(i - 1, true));
    $(".ss-next", ss).addEventListener("click", () => go(i + 1, true));
    playBtn && playBtn.addEventListener("click", () => setPlaying(!playing));
    ss.addEventListener("mouseenter", () => { if (playing) { clearTimeout(timer); cancelAnimationFrame(raf); } });
    ss.addEventListener("mouseleave", () => restart());
    ss.tabIndex = 0;
    ss.addEventListener("keydown", e => { if (e.key === "ArrowLeft") go(i - 1, true); if (e.key === "ArrowRight") go(i + 1, true); });
    let sx = null;
    ss.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
    ss.addEventListener("touchend", e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1), true);
      sx = null;
    });
    setPlaying(playing);
    go(0);
  });

  /* ---------- lightbox for posters / artifacts ---------- */
  const lb = $(".lightbox");
  if (lb) {
    const stage = $(".lb-stage", lb), title = $(".lb-title", lb), dl = $(".lb-download", lb), open = $(".lb-open", lb);
    const show = el => {
      const src = el.dataset.src, type = el.dataset.type || "img";
      title.textContent = el.dataset.title || "";
      dl.href = el.dataset.download || src;
      open.href = el.dataset.download || src;
      stage.classList.toggle("pages", type === "pages");
      stage.scrollTop = 0;
      if (type === "pages") {
        const n = +el.dataset.pages;
        stage.innerHTML = Array.from({ length: n }, (_, k) =>
          `<img src="${src}-${String(k + 1).padStart(2, "0")}.jpg" alt="${el.dataset.title || "Document"}, page ${k + 1} of ${n}"${k > 1 ? ' loading="lazy"' : ""}>`).join("");
        $$("img", stage).slice(0, 2).forEach(im => im.addEventListener("load", () => { stage.scrollTop = 0; }, { once: true }));
      } else {
        stage.innerHTML = `<img src="${src}" alt="${el.dataset.title || ""}">`;
        const img = $("img", stage);
        img.addEventListener("click", () => img.classList.toggle("zoomed"));
      }
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
      $(".lb-close", lb).focus();
    };
    const hide = () => { lb.classList.remove("open"); stage.innerHTML = ""; document.body.style.overflow = ""; };
    $$("[data-lightbox]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); show(el); }));
    $(".lb-close", lb).addEventListener("click", hide);
    lb.addEventListener("click", e => { if (e.target === lb) hide(); });
    addEventListener("keydown", e => { if (e.key === "Escape" && lb.classList.contains("open")) hide(); });
  }

  /* ---------- table of contents scroll-spy ---------- */
  const tocLinks = $$(".toc a");
  if (tocLinks.length) {
    const map = tocLinks.map(a => [a, document.getElementById(a.getAttribute("href").slice(1))]).filter(x => x[1]);
    const spy = () => {
      let cur = map[0];
      for (const m of map) if (m[1].getBoundingClientRect().top < innerHeight * .3) cur = m;
      tocLinks.forEach(a => a.classList.toggle("active", a === cur[0]));
    };
    addEventListener("scroll", spy, { passive: true }); spy();
  }

  /* ---------- research filters ---------- */
  const filters = $(".filters");
  if (filters) {
    $$("button", filters).forEach(b => b.addEventListener("click", () => {
      $$("button", filters).forEach(x => x.classList.toggle("active", x === b));
      const f = b.dataset.filter;
      $$(".poster").forEach(p => p.classList.toggle("hide", f !== "all" && !p.dataset.tags.includes(f)));
    }));
  }

  /* footer year */
  $$(".year").forEach(el => (el.textContent = new Date().getFullYear()));
})();
