(function () {
    const DATA_URL = 'output/showcase/aksay-secondary.json';
    const cache = new Map();

    function text(value, fallback = '') {
        return value == null || value === '' ? fallback : String(value);
    }

    function byType(items, type) {
        if (!type || type === 'all') return items;
        return items.filter((item) => item.type === type);
    }

    function pickItems(items, container) {
        const type = container.dataset.type || 'all';
        const limit = Number.parseInt(container.dataset.limit || '', 10);
        const mix = container.dataset.mix;

        if (mix === '2-2') {
            return [
                ...items.filter((item) => item.type === 'apartment').slice(0, 2),
                ...items.filter((item) => item.type === 'house').slice(0, 2)
            ];
        }

        const filtered = byType(items, type);
        return Number.isFinite(limit) && limit > 0 ? filtered.slice(0, limit) : filtered;
    }

    async function loadShowcase(name) {
        if (cache.has(name)) return cache.get(name);

        const promise = fetch(DATA_URL, { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) throw new Error('Showcase data request failed');
                return response.json();
            });

        cache.set(name, promise);
        return promise;
    }

    function createMeta(item) {
        const values = [
            item.area,
            item.rooms ? `${item.rooms} комн.` : '',
            item.landArea || '',
            item.floor || ''
        ].filter(Boolean);

        const meta = document.createElement('div');
        meta.className = 'showcase-card__meta property-card__chars';
        values.slice(0, 4).forEach((value) => {
            const span = document.createElement('span');
            span.className = 'property-card__char';
            span.textContent = value;
            meta.appendChild(span);
        });
        return meta;
    }

    function createFeatures(item) {
        const list = document.createElement('ul');
        list.className = 'showcase-card__features';
        (item.features || []).slice(0, 4).forEach((feature) => {
            const li = document.createElement('li');
            li.textContent = feature;
            list.appendChild(li);
        });
        return list;
    }

    function createCard(item, container) {
        const fallback = text(item.fallbackImage, text(item.image));
        const article = document.createElement('article');
        article.className = 'showcase-card new-object-card property-card';
        article.dataset.type = item.type || '';

        const imageWrap = document.createElement('div');
        imageWrap.className = 'showcase-card__image-wrap property-card__gallery';

        const img = document.createElement('img');
        img.className = 'showcase-card__image property-card__gallery-image';
        img.src = text(item.image, fallback);
        img.alt = `${text(item.title, 'Объект недвижимости в Аксае')}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => {
            if (fallback && img.src.indexOf(fallback) === -1) img.src = fallback;
        }, { once: true });

        imageWrap.append(img);

        const body = document.createElement('div');
        body.className = 'showcase-card__body new-object-card__content property-card__body';

        const category = document.createElement('span');
        category.className = 'showcase-card__category new-object-card__type property-card__meta';
        category.textContent = text(item.categoryLabel, 'Вторичная недвижимость в Аксае');

        const title = document.createElement('h3');
        title.className = 'showcase-card__title property-card__title';
        title.textContent = text(item.title, 'Лучший объект в Аксае');

        const location = document.createElement('p');
        location.className = 'showcase-card__location';
        location.textContent = text(item.location);

        const price = document.createElement('div');
        price.className = 'showcase-card__price new-object-card__price property-card__price';
        const rawPrice = text(item.price);
        const normalizedPrice = rawPrice.replace(/^\s*от\s+/i, '').trim();
        price.textContent = normalizedPrice;

        const desc = document.createElement('p');
        desc.className = 'showcase-card__description';
        desc.textContent = text(item.shortDescription);

        const details = document.createElement('details');
        details.className = 'showcase-card__details';

        const summary = document.createElement('summary');
        summary.className = 'showcase-card__summary';
        summary.textContent = 'Показать детали';

        const detailsContent = document.createElement('div');
        detailsContent.className = 'showcase-card__details-content';
        detailsContent.append(desc, createFeatures(item));
        details.append(summary, detailsContent);

        const appointmentCta = document.createElement('a');
        appointmentCta.className = 'btn property-card__cta showcase-card__cta';
        appointmentCta.href = container.dataset.ctaHref || ({
            apartment: 'apartments.html',
            house: 'houses.html',
            land: 'lands.html',
            newbuild: 'newbuilds.html'
        }[item.type] || 'showcase-aksay-secondary.html');
        appointmentCta.textContent = 'Подробнее';

        const phoneCta = document.createElement('a');
        phoneCta.className = 'btn property-card__phone showcase-card__phone';
        phoneCta.href = 'tel:+79536091122';
        phoneCta.textContent = 'Позвонить';

        const ctaGroup = document.createElement('div');
        ctaGroup.className = 'showcase-card__actions';
        ctaGroup.append(appointmentCta, phoneCta);

        body.append(category, title, location, price, createMeta(item), details, ctaGroup);
        article.append(imageWrap, body);
        return article;
    }

    function render(container, items) {
        const selected = pickItems(items, container);
        container.replaceChildren();

        if (!selected.length) {
            const empty = document.createElement('p');
            empty.className = 'showcase-state';
            empty.textContent = 'Объекты по этому типу появятся позже.';
            container.appendChild(empty);
            return;
        }

        selected.forEach((item) => container.appendChild(createCard(item, container)));
    }

    function setupFilters(items) {
        document.querySelectorAll('[data-showcase-filter]').forEach((button) => {
            button.addEventListener('click', () => {
                const type = button.dataset.showcaseFilter || 'all';
                document.querySelectorAll('[data-showcase-filter]').forEach((item) => {
                    item.classList.toggle('is-active', item === button);
                    item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
                });
                document.querySelectorAll('[data-showcase="aksay-secondary"][data-filterable="true"]').forEach((container) => {
                    container.dataset.type = type;
                    render(container, items);
                });
            });
        });
    }

    async function init() {
        const containers = [...document.querySelectorAll('[data-showcase="aksay-secondary"]')];
        if (!containers.length) return;

        try {
            const items = await loadShowcase('aksay-secondary');
            containers.forEach((container) => render(container, items));
            setupFilters(items);
        } catch (error) {
            containers.forEach((container) => {
                const message = document.createElement('p');
                message.className = 'showcase-state';
                message.textContent = 'Не удалось загрузить список объектов. Попробуйте обновить страницу.';
                container.replaceChildren(message);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
