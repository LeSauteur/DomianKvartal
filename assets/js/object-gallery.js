(function () {
  'use strict';

  const gallery = document.querySelector('.visibility-gallery');
  if (!gallery || typeof HTMLDialogElement === 'undefined') return;
  const images = [...gallery.querySelectorAll(':scope > img')];
  if (!images.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'object-photo-dialog';
  dialog.setAttribute('aria-label','Фотографии объекта');
  const stage = document.createElement('figure');
  const preview = document.createElement('img');
  const caption = document.createElement('figcaption');
  caption.setAttribute('aria-live','polite');
  stage.append(preview,caption);

  const coverStage = document.createElement('div');
  coverStage.className = 'object-photo-stage';
  const cover = images[0].cloneNode();
  cover.loading = 'eager';
  const count = document.createElement('span');
  count.className = 'object-photo-count';
  count.setAttribute('aria-live', 'polite');

  function button(label, className, handle) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = className;
    control.textContent = label;
    control.addEventListener('click',handle);
    return control;
  }
  let current = 0;
  let opener;
  let previousOverflow;
  const coverButton = button('', 'object-photo-cover', () => open(current, coverButton));
  coverButton.append(cover);
  const thumbnails = window.domianPhotoThumbnails?.(images.map(image => image.src), show);

  function show(index) {
    current = (index + images.length) % images.length;
    const image = images[current];
    const source = image.currentSrc || image.src;
    cover.src = source;
    cover.alt = image.alt;
    cover.setAttribute('width', image.getAttribute('width'));
    cover.setAttribute('height', image.getAttribute('height'));
    const label = `Фото ${current + 1} из ${images.length}`;
    coverButton.setAttribute('aria-label', `Увеличить фото ${current + 1} из ${images.length}`);
    count.textContent = label;
    if (dialog.open) {
      preview.src = source;
      preview.alt = image.alt;
      caption.textContent = label;
    }
    thumbnails?.select(current);
  }

  function open(index, trigger) {
    opener = trigger;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    show(index);
    close.focus();
  }
  const close=button('Закрыть','btn object-photo-close',()=>dialog.close());
  const previous=button('Предыдущее','btn',()=>show(current-1));
  const next=button('Следующее','btn',()=>show(current+1));
  const controls=document.createElement('div');
  controls.className='object-photo-controls';
  if (images.length>1) controls.append(previous,next);
  dialog.append(close,stage,controls);
  document.body.append(dialog);
  dialog.addEventListener('keydown',event=>{
    if (event.key!=='ArrowLeft'&&event.key!=='ArrowRight') return;
    event.preventDefault();
    show(current+(event.key==='ArrowLeft'?-1:1));
  });
  dialog.addEventListener('click',event=>{
    if (event.target===dialog) dialog.close();
  });
  dialog.addEventListener('close',()=>{
    document.body.style.overflow=previousOverflow;
    opener?.focus({preventScroll:true});
  });

  coverStage.append(coverButton);
  if (images.length > 1) {
    const back = button('‹', 'object-photo-arrow object-photo-arrow--prev', () => show(current - 1));
    const forward = button('›', 'object-photo-arrow object-photo-arrow--next', () => show(current + 1));
    back.setAttribute('aria-label', 'Предыдущее фото');
    forward.setAttribute('aria-label', 'Следующее фото');
    coverStage.append(back, forward, count);
    if (thumbnails) coverStage.append(thumbnails.element);
  }

  const allPhotos = document.createElement('details');
  allPhotos.className = 'object-photo-all';
  const summary = document.createElement('summary');
  summary.textContent = `Все фото (${images.length})`;
  const tiles = document.createElement('div');
  tiles.className = 'object-photo-list';
  for (const [index, image] of images.entries()) {
    const tile = button('', 'object-photo-tile', () => open(index, tile));
    tile.setAttribute('aria-label', `Увеличить фото ${index + 1}`);
    tile.append(image);
    tiles.append(tile);
  }
  allPhotos.append(summary, tiles);
  gallery.classList.add('object-gallery');
  gallery.replaceChildren(coverStage);
  if (images.length > 1) gallery.append(allPhotos);
  show(0);
}());
