/* ============================================================
   Manga Archive — SPA logic (hash routing, vertical reader)
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var MANIFEST_URL = "manga/manifest.json";

  /* ---------- helpers ---------- */

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function encPath(s) { return String(s).split("/").map(encodeURIComponent).join("/"); }

  // Natural sort: "Tap-2" < "Tap-10", "9.jpg" < "10.jpg"
  function naturalCompare(a, b) {
    var ax = String(a).match(/\d+|\D+/g) || [];
    var bx = String(b).match(/\d+|\D+/g) || [];
    var len = Math.max(ax.length, bx.length);
    for (var i = 0; i < len; i++) {
      var as = ax[i] || "", bs = bx[i] || "";
      var an = /^\d+$/.test(as), bn = /^\d+$/.test(bs);
      if (an && bn) { var d = parseInt(as, 10) - parseInt(bs, 10); if (d) return d; }
      else if (as !== bs) return as < bs ? -1 : 1;
    }
    return 0;
  }

  function routeTo(name /*, args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    var map = {
      home: "#/",
      guide: "#/huong-dan",
      series: function (s) { return "#/truyen/" + encodeURIComponent(s); },
      read: function (s, p) { return "#/doc/" + encodeURIComponent(s) + "/" + encodeURIComponent(p); }
    };
    return typeof map[name] === "function" ? map[name].apply(null, args) : map[name];
  }

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, "");
    var seg = h.split("/").filter(Boolean).map(decodeURIComponent);
    if (seg[0] === "truyen" && seg[1]) return { view: "series", slug: seg[1] };
    if (seg[0] === "doc" && seg[1] && seg[2]) return { view: "read", slug: seg[1], part: seg[2] };
    if (seg[0] === "huong-dan") return { view: "guide" };
    return { view: "home" };
  }

  /* ---------- data ---------- */

  var DATA = null; // manifest

  function findSeries(slug) {
    if (!DATA) return null;
    for (var i = 0; i < DATA.series.length; i++) if (DATA.series[i].slug === slug) return DATA.series[i];
    return null;
  }

  function seriesUrl(s, part) {
    var base = "manga/" + encPath(s.slug) + "/";
    return part ? base + encPath(part) + "/" : base;
  }

  function displayTitle(s) { return s.title || s.slug.replace(/[-_]+/g, " "); }

  /* ---------- view switching ---------- */

  var VIEWS = ["viewLoading", "viewError", "viewHome", "viewSeries", "viewReader", "viewGuide"];

  function show(viewId) {
    VIEWS.forEach(function (id) { el(id).hidden = id !== viewId; });
    document.body.classList.toggle("is-reading", viewId === "viewReader");
    var navKey = { viewHome: "home", viewGuide: "guide" }[viewId];
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (navKey && a.getAttribute("data-nav") === navKey) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }

  /* ============================================================
     HOME
     ============================================================ */

  function renderHome() {
    var grid = el("seriesGrid");
    var series = (DATA.series || []).slice().sort(function (a, b) { return naturalCompare(a.slug, b.slug); });

    var totalParts = 0, totalPages = 0;
    series.forEach(function (s) {
      totalParts += s.parts.length;
      s.parts.forEach(function (p) { totalPages += p.pages.length; });
    });

    el("heroKicker").textContent = CFG.kicker || "KHO TRUYỆN TRANH";
    el("heroTitle").innerHTML = esc(CFG.heroTitle || "Đọc manga\ntheo cách của bạn.").replace(/\n/g, "<br>");
    el("heroSub").textContent = CFG.heroSub ||
      ("Bộ sưu tập truyện tranh cá nhân — đọc cuộn dọc, tự động sắp xếp trang theo tên file, không cần cài đặt hay cơ sở dữ liệu.");
    el("heroStats").innerHTML =
      "<span><b>" + series.length + "</b> truyện</span>" +
      "<span><b>" + totalParts + "</b> tập</span>" +
      "<span><b>" + totalPages + "</b> trang</span>";

    if (!series.length) {
      grid.innerHTML = "";
      return;
    }

    grid.innerHTML = series.map(function (s, i) {
      var pages = 0; s.parts.forEach(function (p) { pages += p.pages.length; });
      var cover = s.cover ? "manga/" + encPath(s.slug) + "/" + encPath(s.cover)
        : (s.parts[0] && s.parts[0].pages[0] ? seriesUrl(s, s.parts[0].name) + encPath(s.parts[0].pages[0]) : "");
      var lastPart = s.parts.length ? s.parts[s.parts.length - 1].name : "";
      return (
        '<a class="series-card" href="' + routeTo("series", s.slug) + '" aria-label="' + esc(displayTitle(s)) + '">' +
          '<span class="series-index">' + String(i + 1).padStart(2, "0") + "</span>" +
          (cover ? '<img class="series-cover" src="' + cover + '" alt="" loading="lazy">' : '<div class="series-cover"></div>') +
          '<div class="series-meta">' +
            "<h3>" + esc(displayTitle(s)) + "</h3>" +
            "<p>" + s.parts.length + " tập · " + pages + " trang" + (lastPart ? " · mới: " + esc(lastPart) : "") + "</p>" +
          "</div>" +
        "</a>"
      );
    }).join("");
  }

  /* ============================================================
     SERIES DETAIL
     ============================================================ */

  function renderSeries(slug) {
    var s = findSeries(slug);
    if (!s) { location.hash = routeTo("home"); return; }
    el("crumbSeries").textContent = displayTitle(s);

    var head = el("seriesHead");
    var cover = s.cover ? "manga/" + encPath(s.slug) + "/" + encPath(s.cover)
      : (s.parts[0] && s.parts[0].pages[0] ? seriesUrl(s, s.parts[0].name) + encPath(s.parts[0].pages[0]) : "");
    var pages = 0; s.parts.forEach(function (p) { pages += p.pages.length; });

    head.innerHTML =
      (cover ? '<img class="series-cover-lg" src="' + cover + '" alt="Bìa truyện">' : '<div class="series-cover-lg"></div>') +
      '<div class="series-info">' +
        "<h1>" + esc(displayTitle(s)) + "</h1>" +
        (s.author ? '<p class="author">Tác giả: ' + esc(s.author) + "</p>" : "") +
        (s.description ? '<p class="desc">' + esc(s.description) + "</p>" : "") +
        '<div class="series-tags">' +
          '<span class="tag">' + s.parts.length + " tập</span>" +
          '<span class="tag">' + pages + " trang</span>" +
          (s.status ? '<span class="tag">' + esc(s.status) + "</span>" : "") +
        "</div>" +
      "</div>";

    var list = el("partList");
    var parts = s.parts.slice().sort(function (a, b) { return naturalCompare(a.name, b.name); });
    el("seriesEmpty").hidden = parts.length > 0;

    list.innerHTML = parts.map(function (p, i) {
      var thumb = p.pages[0] ? seriesUrl(s, p.name) + encPath(p.pages[0]) : "";
      return (
        '<li><a class="part-row" href="' + routeTo("read", s.slug, p.name) + '">' +
          '<span class="part-num">' + String(i + 1).padStart(2, "0") + "</span>" +
          (thumb ? '<img class="part-thumb" src="' + thumb + '" alt="" loading="lazy">' : '<span class="part-thumb"></span>') +
          "<span><span class=\"part-name\">" + esc(p.label || p.name) + "</span>" +
          '<span class="part-sub">' + p.pages.length + " trang</span></span>" +
          '<span class="part-go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        "</a></li>"
      );
    }).join("");
  }

  /* ============================================================
     READER — vertical scroll
     ============================================================ */

  var reader = {
    observer: null,
    imgs: [],
    slug: null,
    part: null,
    fit: localStorage.getItem("ma.fit") || "width"
  };

  function renderReader(slug, partName) {
    var s = findSeries(slug);
    if (!s) { location.hash = routeTo("home"); return; }
    var parts = s.parts.slice().sort(function (a, b) { return naturalCompare(a.name, b.name); });
    var idx = -1;
    for (var i = 0; i < parts.length; i++) if (parts[i].name === partName) { idx = i; break; }
    if (idx < 0) { location.hash = routeTo("series", slug); return; }

    var part = parts[idx];
    reader.slug = slug; reader.part = partName;

    document.title = displayTitle(s) + " — " + (part.label || part.name) + " — " + (CFG.siteName || "Manga Archive");
    el("readerBack").href = routeTo("series", slug);
    el("readerSeriesTitle").textContent = displayTitle(s);
    el("readerPartName").textContent = part.label || part.name;

    var stage = el("readerStage");
    stage.setAttribute("data-fit", reader.fit);

    var base = seriesUrl(s, part.name);
    stage.innerHTML = part.pages.map(function (p, i) {
      return '<img class="page-img" data-i="' + i + '" data-src="' + base + encPath(p) + '" alt="Trang ' + (i + 1) + '">';
    }).join("");

    reader.imgs = Array.prototype.slice.call(stage.querySelectorAll(".page-img"));

    // Lazy-load + fade-in
    if (reader.observer) reader.observer.disconnect();
    var seen = new Set();
    var visible = new Set();
    reader.visible = visible;
    reader.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var img = en.target;
        var i = parseInt(img.getAttribute("data-i"), 10);
        if (en.isIntersecting && !seen.has(img)) {
          seen.add(img);
          img.src = img.getAttribute("data-src");
          img.removeAttribute("data-src");
        }
        if (en.isIntersecting) visible.add(i); else visible.delete(i);
      });
      if (visible.size) {
        reader.current = Math.min.apply(null, Array.from(visible)) + 1;
        updateReaderHUD(part);
      }
    }, { rootMargin: "25% 0px 25% 0px", threshold: 0.01 });
    reader.imgs.forEach(function (img) {
      img.addEventListener("load", function () { img.classList.add("is-loaded"); });
      img.addEventListener("error", function () {
        img.classList.add("is-loaded", "is-error");
        img.alt = "Không tải được: " + (img.src.split("/").pop() || "");
      });
      reader.observer.observe(img);
    });

    reader.current = 1;
    updateReaderHUD(part);

    // Preload neighbors for snappy scrolling
    preloadRange(0, 2);

    // Prev / next part links
    var nav = el("readerNav");
    var html = "";
    if (idx > 0) {
      var prev = parts[idx - 1];
      html += '<a href="' + routeTo("read", slug, prev.name) + '">← Tập trước: ' + esc(prev.label || prev.name) + "</a>";
    }
    html += '<a href="' + routeTo("series", slug) + '">Danh sách tập</a>';
    if (idx < parts.length - 1) {
      var next = parts[idx + 1];
      html += '<a href="' + routeTo("read", slug, next.name) + '">Tập tiếp: ' + esc(next.label || next.name) + " →</a>";
    }
    nav.innerHTML = html;

    // Start reading from top
    window.scrollTo(0, 0);
  }

  function preloadRange(from, to) {
    reader.imgs.forEach(function (img, i) {
      if (i >= from && i <= to && !img.src && img.getAttribute("data-src")) {
        var pre = new Image();
        pre.src = img.getAttribute("data-src");
      }
    });
  }

  function updateReaderHUD(part) {
    el("readerPageIndicator").textContent = reader.current + " / " + part.pages.length;
  }

  // Scroll-driven: overall progress + preload ahead
  var scrollTick = false;
  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      var bar = el("readProgress");
      if (el("viewReader").hidden) { bar.classList.remove("is-active"); return; }
      bar.classList.add("is-active");
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      el("readProgressFill").style.width = pct + "%";
      // keep 2 pages preloaded ahead of current
      preloadRange(reader.current, reader.current + 2);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  // Fit toggle
  el("btnFit").addEventListener("click", function () {
    reader.fit = reader.fit === "width" ? "fit" : "width";
    localStorage.setItem("ma.fit", reader.fit);
    el("readerStage").setAttribute("data-fit", reader.fit);
  });
  el("btnTop").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  // Keyboard: arrows / pageup-down scroll, Home/End
  document.addEventListener("keydown", function (e) {
    if (el("viewReader").hidden) return;
    var step = window.innerHeight * 0.9;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { window.scrollBy({ top: step, behavior: "smooth" }); e.preventDefault(); }
    else if (e.key === "ArrowUp" || e.key === "PageUp") { window.scrollBy({ top: -step, behavior: "smooth" }); e.preventDefault(); }
    else if (e.key === "Home") { window.scrollTo({ top: 0, behavior: "smooth" }); e.preventDefault(); }
    else if (e.key === "End") { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }); e.preventDefault(); }
  });

  /* ============================================================
     ROUTER + BOOT
     ============================================================ */

  function applyBrand() {
    var name = CFG.siteName || "Manga Archive";
    document.title = name + " — Kho truyện tranh";
    el("brandName").textContent = name;
    el("footerBrand").textContent = name;
    var m = document.querySelector('meta[name="description"]');
    if (m && CFG.heroSub) m.setAttribute("content", CFG.heroSub);
  }

  function router() {
    var r = parseHash();
    if (!DATA) { show("viewLoading"); return; }
    if (r.view === "guide") { show("viewGuide"); document.title = "Thêm truyện — " + (CFG.siteName || "Manga Archive"); }
    else if (r.view === "series") { renderSeries(r.slug); show("viewSeries"); }
    else if (r.view === "read") { renderReader(r.slug, r.part); show("viewReader"); }
    else { renderHome(); show("viewHome"); document.title = (CFG.siteName || "Manga Archive") + " — Kho truyện tranh"; }
    onScroll();
  }

  function boot() {
    applyBrand();
    show("viewLoading");
    fetch(MANIFEST_URL, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        DATA = json;
        var totalParts = 0;
        (DATA.series || []).forEach(function (s) {
          s.parts.sort(function (a, b) { return naturalCompare(a.name, b.name); });
          s.parts.forEach(function (p) { p.pages.sort(naturalCompare); totalParts++; });
        });
        el("footerCount").textContent = DATA.series.length + " truyện · " + totalParts + " tập";
        router();
      })
      .catch(function (err) {
        DATA = { series: [] };
        el("errorDetail").textContent = "Không đọc được manga/manifest.json (" + err.message + "). Chạy tools/build_manifest.py hoặc push lên GitHub để Action tự tạo.";
        show("viewError");
      });
  }

  window.addEventListener("hashchange", router);
  boot();
})();
