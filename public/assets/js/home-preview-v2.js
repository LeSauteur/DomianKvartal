(function () {
  "use strict";

  function initPreview() {
    var page = document.body;

    if (!page || !page.classList.contains("home-preview-v2")) {
      return;
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var localReducedMotionQa = (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
      new URLSearchParams(location.search).get("preview-reduced-motion") === "1";
    var header = document.querySelector("header");
    var headerFrame = 0;

    function motionIsReduced() {
      return reduceMotion.matches || localReducedMotionQa;
    }

    if (localReducedMotionQa) {
      page.classList.add("preview-motion-reduced");
    }

    function syncHeader() {
      headerFrame = 0;

      if (!header) {
        return;
      }

      var menuOpen = page.classList.contains("drawer-open");
      var compact = window.scrollY > 36 && !menuOpen;

      page.classList.toggle("preview-header-compact", compact);
      header.dataset.previewState = compact ? "compact" : menuOpen ? "menu-open" : "open";
    }

    function scheduleHeaderSync() {
      if (headerFrame) {
        return;
      }

      headerFrame = window.requestAnimationFrame(syncHeader);
    }

    syncHeader();
    window.addEventListener("scroll", scheduleHeaderSync, { passive: true });

    var bodyClassObserver = new MutationObserver(function () {
      scheduleHeaderSync();
    });

    bodyClassObserver.observe(page, {
      attributes: true,
      attributeFilter: ["class"]
    });

    var groupSelectors = [
      ".stage12-categories__grid",
      ".stage12-workspace__grid",
      ".stage12-mini-grid",
      ".ub-scroller__track",
      ".ub-cards",
      ".benefits",
      ".reviews",
      ".certificates-grid",
      ".faq-grid",
      ".partners-grid"
    ];

    var standaloneSelector = [
      ".stage12-featured",
      ".ub-section__head",
      ".home-seller__card",
      ".trust-yandex-place__card",
      ".brand-principle__inner",
      ".photo-block",
      ".about",
      ".leadership",
      ".contact-grid",
      ".form-container",
      ".footer-cta-content"
    ].join(",");

    var groups = [];
    var standaloneTargets = [];

    groupSelectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (group) {
        var children = Array.prototype.slice.call(group.children).filter(function (child) {
          return child.nodeType === 1;
        });

        if (!children.length) {
          return;
        }

        children.forEach(function (child, index) {
          child.classList.add("preview-reveal");
          child.style.setProperty("--preview-delay", Math.min(index, 4) * 65 + "ms");
        });

        group.dataset.previewRevealGroup = "true";
        groups.push(group);
      });
    });

    document.querySelectorAll(standaloneSelector).forEach(function (target) {
      if (target.classList.contains("preview-reveal")) {
        return;
      }

      target.classList.add("preview-reveal");
      standaloneTargets.push(target);
    });

    function revealTarget(target) {
      if (target.dataset.previewRevealGroup === "true") {
        Array.prototype.forEach.call(target.children, function (child) {
          if (child.classList.contains("preview-reveal")) {
            child.classList.add("is-revealed");
          }
        });
      } else {
        target.classList.add("is-revealed");
      }
    }

    var observerTargets = groups.concat(standaloneTargets);

    if (motionIsReduced() || !("IntersectionObserver" in window)) {
      observerTargets.forEach(revealTarget);
      page.dataset.previewRevealState = motionIsReduced() ? "reduced" : "fallback";
      page.dataset.previewRevealObserved = "0";
      page.dataset.previewRevealPending = "0";
    } else {
      var pendingTargets = new Set();

      observerTargets.forEach(function (target) {
        var rect = target.getBoundingClientRect();
        var hidden = target.getClientRects().length === 0;
        var initiallyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

        if (hidden || initiallyVisible) {
          revealTarget(target);
        } else {
          pendingTargets.add(target);
        }
      });

      page.classList.add("preview-motion-ready");
      page.dataset.previewRevealState = pendingTargets.size ? "ready" : "complete";
      page.dataset.previewRevealObserved = String(pendingTargets.size);
      page.dataset.previewRevealPending = String(pendingTargets.size);

      var revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          revealTarget(entry.target);
          observer.unobserve(entry.target);
          pendingTargets.delete(entry.target);
        });

        page.dataset.previewRevealPending = String(pendingTargets.size);

        if (!pendingTargets.size) {
          page.dataset.previewRevealState = "complete";
          observer.disconnect();
        }
      }, {
        rootMargin: "0px 0px -7%",
        threshold: 0.08
      });

      pendingTargets.forEach(function (target) {
        revealObserver.observe(target);
      });
    }

    var hero = document.querySelector(".stage12-hero");
    var heroMark = document.querySelector(".preview-kvartal-mark");
    var featuredImage = document.querySelector(".stage12-featured__image img");
    var pointerFrame = 0;
    var pointerX = 0;
    var pointerY = 0;

    function resetParallax() {
      if (heroMark) {
        heroMark.style.setProperty("--preview-shift-x", "0px");
        heroMark.style.setProperty("--preview-shift-y", "0px");
      }

      if (featuredImage) {
        featuredImage.style.setProperty("--preview-image-x", "0px");
        featuredImage.style.setProperty("--preview-image-y", "0px");
      }
    }

    function paintParallax() {
      pointerFrame = 0;

      if (!hero || motionIsReduced() || !finePointer.matches) {
        resetParallax();
        return;
      }

      var bounds = hero.getBoundingClientRect();
      var x = (pointerX - bounds.left) / bounds.width - 0.5;
      var y = (pointerY - bounds.top) / bounds.height - 0.5;

      if (heroMark) {
        heroMark.style.setProperty("--preview-shift-x", x * 7 + "px");
        heroMark.style.setProperty("--preview-shift-y", y * 7 + "px");
      }

      if (featuredImage) {
        featuredImage.style.setProperty("--preview-image-x", x * -3 + "px");
        featuredImage.style.setProperty("--preview-image-y", y * -3 + "px");
      }
    }

    function scheduleParallax(event) {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!pointerFrame) {
        pointerFrame = window.requestAnimationFrame(paintParallax);
      }
    }

    if (hero && heroMark && featuredImage && !motionIsReduced() && finePointer.matches) {
      hero.addEventListener("pointermove", scheduleParallax, { passive: true });
      hero.addEventListener("pointerleave", resetParallax);
      page.dataset.previewPointerParallax = "enabled";
    } else {
      resetParallax();
      page.dataset.previewPointerParallax = "disabled";
    }

    window.__HOME_PREVIEW_V2__ = Object.freeze({
      version: "2",
      headerCompact: function () {
        return page.classList.contains("preview-header-compact");
      },
      pendingReveals: function () {
        return Number(page.dataset.previewRevealPending || 0);
      },
      prefersReducedMotion: function () {
        return motionIsReduced();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPreview, { once: true });
  } else {
    initPreview();
  }
})();
