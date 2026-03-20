/**
 * UI Blocks - JavaScript для интерактивности блоков
 * Версия: 1.0.0
 * 
 * Функционал:
 * - Горизонтальный скроллер с drag + инерцией
 * - Кнопки влево/вправо
 * - Поддержка wheel для горизонтального скролла
 */

(function() {
  'use strict';

  var _initialized = false;

  /**
   * Улучшение скроллера: drag + inertia + wheel
   */
  function enhanceScroller(track) {
    if (!track) return;
    if (track.__enhanced) return;
    track.__enhanced = true;

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    var raf = 0;
    var target = track.scrollLeft;

    /**
     * Плавная анимация скролла
     */
    function animateTo(x) {
      target = clamp(x, 0, Math.max(0, track.scrollWidth - track.clientWidth));
      if (raf) return;

      var last = performance.now();
      raf = requestAnimationFrame(function tick(now) {
        var dt = Math.min(32, now - last);
        last = now;

        var cur = track.scrollLeft;
        var k = 1 - Math.pow(0.001, dt / 180);
        var next = cur + (target - cur) * k;
        track.scrollLeft = next;

        if (Math.abs(target - next) < 0.5) {
          track.scrollLeft = target;
          raf = 0;
          return;
        }
        raf = requestAnimationFrame(tick);
      });
    }

    /**
     * Wheel event → горизонтальный скролл
     */
    track.addEventListener('wheel', function(e) {
      var canScrollX = track.scrollWidth > track.clientWidth + 4;
      if (!canScrollX) return;

      var dx = e.deltaX;
      var dy = e.deltaY;
      var primary = Math.abs(dy) > Math.abs(dx) ? dy : dx;

      if (Math.abs(primary) < 1) return;

      e.preventDefault();
      animateTo(track.scrollLeft + primary * 0.9);
    }, { passive: false });

    /**
     * Drag с инерцией
     */
    var pointerDown = false;
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startLeft = 0;
    var lastX = 0;
    var lastT = 0;
    var vx = 0;
    var canDrag = true;

    function onDown(e) {
      if (e.button !== undefined && e.button !== 0) return;

      if (e.target && e.target.closest) {
        var inner = e.target.closest('a,button,select,textarea,input');
        if (inner) return;
      }

      pointerDown = true;
      dragging = false;
      canDrag = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = track.scrollLeft;
      lastX = e.clientX;
      lastT = performance.now();
      vx = 0;
    }

    function onMove(e) {
      if (!pointerDown || !canDrag) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      if (!dragging) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        dragging = true;
        track.classList.add('is-dragging');
        if (track.setPointerCapture) {
          track.setPointerCapture(e.pointerId);
        }
      }

      e.preventDefault();
      track.scrollLeft = startLeft - dx;

      var now = performance.now();
      var dt = Math.max(8, now - lastT);
      vx = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
    }

    function onUp() {
      if (!pointerDown) return;
      pointerDown = false;
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      track.__suppressClickUntil = performance.now() + 260;

      // Инерция
      var v = -vx * 1200;
      if (Math.abs(v) < 60) return;

      var decay = 0.92;
      var frame = 0;
      function inert() {
        frame++;
        v *= decay;
        if (Math.abs(v) < 25 || frame > 120) return;
        animateTo(track.scrollLeft + v / 60);
        requestAnimationFrame(inert);
      }
      requestAnimationFrame(inert);
    }

    track.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    track.__animateTo = animateTo;
  }

  /**
   * Инициализация скроллеров
   */
  function initScrollers() {
    var scrollers = document.querySelectorAll('.ub-scroller[data-ub-scroller]');

    scrollers.forEach(function(scroller) {
      var track = scroller.querySelector('[data-ub-track]');
      if (!track) return;

      enhanceScroller(track);

      var left = scroller.querySelector('.ub-scroller__btn[data-dir="left"]');
      var right = scroller.querySelector('.ub-scroller__btn[data-dir="right"]');

      // Вычисляем ширину элемента динамически (защита от разных размеров)
      var firstItem = track.children[0];
      var itemWidth = firstItem ? firstItem.getBoundingClientRect().width : 232;
      var gap = 12;
      var scrollAmount = Math.max(260, Math.floor(track.clientWidth * 0.6));

      function scrollByDir(dir) {
        if (track.__animateTo) {
          track.__animateTo(track.scrollLeft + (dir === 'left' ? -scrollAmount : scrollAmount));
        } else {
          track.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
      }

      if (left) {
        left.addEventListener('click', function() {
          scrollByDir('left');
        });
      }

      if (right) {
        right.addEventListener('click', function() {
          scrollByDir('right');
        });
      }

      // Keyboard navigation
      track.setAttribute('tabindex', '0');
      track.setAttribute('role', 'region');
      track.setAttribute('aria-label', 'Горизонтальная прокрутка');
      track.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          scrollByDir('left');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          scrollByDir('right');
        }
      });

      // Обновление при resize
      var resizeTimer = 0;
      window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
          var newItemWidth = track.children[0] ? track.children[0].getBoundingClientRect().width : itemWidth;
          itemWidth = newItemWidth;
          scrollAmount = Math.max(260, Math.floor(track.clientWidth * 0.6));
        }, 150);
      });
    });
  }

  /**
   * Инициализация chips/filter
   */
  function initChips() {
    var chipContainers = document.querySelectorAll('.ub-pills[role="tablist"]');
    
    chipContainers.forEach(function(container) {
      container.addEventListener('click', function(e) {
        var chip = e.target.closest('.ub-chip');
        if (!chip) return;

        var chips = container.querySelectorAll('.ub-chip');
        chips.forEach(function(c) {
          c.classList.remove('is-active');
        });
        chip.classList.add('is-active');
      });
    });
  }

  /**
   * Инициализация favorites (демо)
   */
  function initFavorites() {
    var FAV_KEY = 'ub_favs_v1';

    function loadFavIds() {
      try {
        var raw = localStorage.getItem(FAV_KEY);
        if (!raw) return [];
        var arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    }

    function saveFavIds(ids) {
      try {
        var clean = Array.from(new Set(ids.map(function(x) { return String(x); })));
        localStorage.setItem(FAV_KEY, JSON.stringify(clean));
      } catch (_) {}
    }

    function setFavBtn(btn, on) {
      if (!btn) return;
      btn.classList.toggle('is-on', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное');
    }

    function syncFavButtons(root) {
      var favs = new Set(loadFavIds());
      var buttons = (root || document).querySelectorAll('.ub-card[data-id] .ub-fav');
      buttons.forEach(function(btn) {
        var card = btn.closest('.ub-card');
        var id = card ? (card.getAttribute('data-id') || '') : '';
        setFavBtn(btn, id && favs.has(id));
      });
    }

    // Обработчик клика на избранное
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.ub-fav');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      var card = btn.closest('.ub-card');
      var id = card ? (card.getAttribute('data-id') || '') : '';
      if (!id) return;

      var ids = loadFavIds();
      var has = ids.indexOf(id) >= 0;
      
      if (has) {
        ids = ids.filter(function(x) { return x !== id; });
      } else {
        ids.push(id);
      }
      
      saveFavIds(ids);
      setFavBtn(btn, !has);

      // Toast уведомление (простое)
      showToast(!has ? 'Добавлено в избранное' : 'Убрано из избранного');
    });

    // Синхронизация при загрузке
    syncFavButtons();
  }

  /**
   * Простое toast уведомление
   */
  function showToast(msg) {
    if (window.domianToast) {
      window.domianToast(msg);
      return;
    }

    var existing = document.querySelector('.ub-toast');
    if (existing) {
      existing.remove();
    }

    var toast = document.createElement('div');
    toast.className = 'ub-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.classList.add('is-on');
    }, 10);

    setTimeout(function() {
      toast.classList.remove('is-on');
      setTimeout(function() {
        toast.remove();
      }, 200);
    }, 1700);
  }

  /**
   * Добавление стилей для toast
   */
  function injectToastStyles() {
    if (document.querySelector('#ub-toast-styles')) return;

    var style = document.createElement('style');
    style.id = 'ub-toast-styles';
    style.textContent = `
      .ub-toast {
        position: fixed;
        left: 50%;
        top: 14px;
        transform: translateX(-50%);
        background: rgba(17, 24, 39, 0.92);
        color: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        padding: 10px 14px;
        font-weight: 800;
        font-size: 13px;
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease, transform 160ms ease;
      }
      .ub-toast.is-on {
        opacity: 1;
        transform: translateX(-50%) translateY(4px);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Инициализация при загрузке DOM
   */
  function init() {
    if (_initialized) return;
    _initialized = true;

    initScrollers();
    initChips();
    initFavorites();
  }

  // Запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Экспорт для внешнего использования
  window.UIBlocks = window.UIBlocks || {
    init: init,
    enhanceScroller: enhanceScroller,
    showToast: showToast
  };

})();
