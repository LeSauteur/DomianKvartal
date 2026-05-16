(function() {
  'use strict';

  function initAccordion() {
    var accordions = document.querySelectorAll('.ui-blocks-wrapper .ub-accordion');
    if (!accordions.length) return;

    accordions.forEach(function(accordion) {
      var triggers = accordion.querySelectorAll('.ub-accordion__trigger');
      triggers.forEach(function(trigger) {
        trigger.addEventListener('click', function() {
          var item = trigger.closest('.ub-accordion__item');
          if (!item) return;

          var isOpen = item.classList.contains('is-open');
          accordion.querySelectorAll('.ub-accordion__item').forEach(function(other) {
            if (other === item) return;
            other.classList.remove('is-open');
            var otherTrigger = other.querySelector('.ub-accordion__trigger');
            if (otherTrigger) {
              otherTrigger.setAttribute('aria-expanded', 'false');
            }
          });

          item.classList.toggle('is-open', !isOpen);
          trigger.setAttribute('aria-expanded', String(!isOpen));
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordion);
  } else {
    initAccordion();
  }
})();
