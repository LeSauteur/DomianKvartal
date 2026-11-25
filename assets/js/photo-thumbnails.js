(function () {
  'use strict';

  window.domianPhotoThumbnails = function (photos, onSelect) {
    if (photos.length < 2) return null;

    const element = document.createElement('div');
    element.className = 'photo-thumbnails';
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', 'Миниатюры фотографий');
    const size = Math.min(3, photos.length);
    const buttons = Array.from({ length: size }, () => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo-thumbnails__button';
      const image = document.createElement('img');
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      button.append(image);
      button.addEventListener('click', () => onSelect(Number(button.dataset.index)));
      element.append(button);
      return button;
    });

    function select(index) {
      const first = Math.max(0, index - size + 1);
      buttons.forEach((button, offset) => {
        const number = first + offset;
        if (button.dataset.index !== String(number)) {
          button.dataset.index = String(number);
          button.setAttribute('aria-label', `Показать фото ${number + 1}`);
          button.firstElementChild.src = photos[number];
        }
        button.setAttribute('aria-pressed', String(number === index));
      });
    }

    select(0);
    return { element, select };
  };
}());
