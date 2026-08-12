from __future__ import annotations

import html
import json
import re
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = "https://domian-161.ru"
TODAY = date(2026, 8, 11)
OUTPUT_DATA = ROOT / "_private" / "construction-projects.json"
PROJECTS_DIR = ROOT / "construction" / "projects"
BUILDERS_DIR = ROOT / "construction" / "builders"


BUILDERS = {
    "domanstroy": {
        "name": "ДоманСтрой",
        "short": "Типовые и индивидуальные дома с несколькими уровнями комплектации.",
        "about": "Компания указывает работу с 2014 года и более 200 построенных домов. В материалах подтверждены строительство в радиусе около 250 км от Ростова-на-Дону, типовые и индивидуальные проекты, срок 6–9 месяцев и гарантия 5 лет на выполненные работы.",
        "geography": "Ростовская область и север Краснодарского края — окончательная возможность строительства зависит от адреса участка.",
        "directions": ["Типовые проекты", "Адаптация проекта", "Индивидуальное проектирование", "Строительство под ключ"],
        "packages": ["Старт", "Стандарт", "Комфорт", "Премиум"],
        "warranty": "5 лет на выполненные работы — по материалам компании; условия фиксируются в договоре.",
    },
    "soyuz": {
        "name": "Союз Застройщиков",
        "short": "Каталог кирпичных домов 69,9–142,2 м² в комплектации White Box.",
        "about": "В ростовском каталоге представлены одно- и двухэтажные дома с изолированными спальнями, кухней-гостиной и комплектацией White Box. Материалы содержат подробные планировки и конструктив, но цены требуют обязательной актуализации.",
        "geography": "Ростов-на-Дону и Ростовская область — географию по конкретному участку необходимо подтвердить.",
        "directions": ["Типовые проекты", "Строительство на участке клиента", "White Box", "Ипотечная сделка"],
        "packages": ["White Box"],
        "warranty": "5 лет гарантийного обслуживания — по каталогу компании; условия уточняются в договоре.",
    },
    "eqvita": {
        "name": "Эквита",
        "short": "Индивидуальная современная архитектура и проектирование под участок.",
        "about": "В архитектурной презентации компания сообщает о работе с 2006 года и показывает индивидуальные дома современной архитектуры. Каждый проект требует отдельной проработки состава, материалов и бюджета.",
        "geography": "Желаемая локация согласуется индивидуально с учётом участка и бюджета.",
        "directions": ["Индивидуальная архитектура", "Проектирование под участок", "Современные дома", "Строительство по индивидуальному ТЗ"],
        "packages": ["Индивидуальная комплектация"],
        "warranty": "Сроки и гарантии в презентации не детализированы и должны быть закреплены в договоре.",
    },
}


DOMANSTROY_ROWS = [
    {
        "code": "DS-80", "slug": "domanstroy-ds-80", "area": 80, "bedrooms": 3, "bathrooms": 2,
        "kitchen": "кухня-гостиная 23,2 м²", "extras": "котельная 5,38 м²",
        "description": "Компактный одноэтажный дом с тремя спальнями и двумя санузлами. Общая зона площадью 23,2 м² отделена от приватной части, а инженерное оборудование вынесено в отдельную котельную.",
        "family": "Подойдёт семье с одним или двумя детьми, которой важны три отдельные комнаты при умеренной общей площади.",
    },
    {
        "code": "DS-85(5)", "slug": "domanstroy-ds-85-5", "area": 85, "bedrooms": 3, "bathrooms": 2,
        "kitchen": "кухня-гостиная 24,47 м²", "extras": "котельная 5,24 м²", "price": 4590000,
        "description": "Отдельный вариант проекта 85 м² с тремя спальнями 9,88, 9,6 и 11,15 м². Два санузла и котельная формируют функциональную техническую зону, не занимая общую кухню-гостиную.",
        "family": "Практичный вариант для семьи из трёх–пяти человек, которой нужны две детские или отдельный кабинет.",
    },
    {
        "code": "DS-85", "slug": "domanstroy-ds-85", "area": 85, "bedrooms": 3, "bathrooms": 1,
        "kitchen": "кухня-гостиная 21,04 м²", "extras": "котельная 5,38 м²", "price": 4590000,
        "description": "Самостоятельная планировка 85 м²: три спальни 13,12, 12,17 и 12,25 м² заметно крупнее, чем в варианте DS-85(5). В доме предусмотрены санузел 5,65 м² и отдельная котельная.",
        "family": "Подойдёт семье, которой важнее размер спален и спокойная приватная зона, чем второй санузел.",
    },
    {
        "code": "DS-115", "slug": "domanstroy-ds-115", "area": 115, "bedrooms": 3, "bathrooms": 2,
        "kitchen": "отдельная кухня 19,77 м² и гостиная 19,73 м²", "extras": "котельная 5,17 м²",
        "description": "Планировка с раздельными кухней и гостиной, тремя спальнями и двумя санузлами. Формат подходит тем, кто не хочет объединять приготовление еды и зону семейного отдыха.",
        "family": "Для семьи из четырёх–пяти человек, которая часто принимает гостей и ценит отдельную гостиную.",
    },
    {
        "code": "DS-116", "slug": "domanstroy-ds-116", "area": 116, "bedrooms": 3, "bathrooms": 2,
        "kitchen": "кухня-гостиная 33,01 м²", "extras": "гардеробная 6,02 м² и котельная 5,25 м²", "price": 6032000,
        "description": "Одноэтажный дом с большой общей зоной 33,01 м², тремя спальнями правильной формы и отдельной гардеробной. Два санузла рассчитаны на повседневный ритм семьи.",
        "family": "Для семьи с детьми, которой нужны большая общая комната, системное хранение и два санузла.",
    },
    {
        "code": "DS-128", "slug": "domanstroy-ds-128", "area": 128, "bedrooms": 3, "bathrooms": 2,
        "kitchen": "кухня-гостиная 39,27 м²", "extras": "гардеробная 4,63 м² и котельная 6,95 м²",
        "description": "Проект с самой большой общей зоной среди представленных домов «ДоманСтрой». Три спальни, два санузла, гардеробная и котельная дают простор без второго этажа.",
        "family": "Для семьи, которая регулярно собирается в общей зоне и хочет сохранить все жилые помещения на одном уровне.",
    },
    {
        "code": "DS-130", "slug": "domanstroy-ds-130", "area": 130, "bedrooms": 3, "bathrooms": 2,
        "kitchen": "кухня-гостиная 33,58 м²", "extras": "гардеробная 5,89 м² и котельная 7,79 м²", "price": 6760000,
        "description": "Одноэтажный дом с тремя спальнями от 14,95 до 16,8 м². Вместительные гардеробная и котельная уменьшают потребность в шкафах и хранении в жилых комнатах.",
        "family": "Подойдёт семье из четырёх–пяти человек, которая ценит крупные спальни и отдельные хозяйственные помещения.",
    },
]


SOYUZ_ROWS = [
    ("69-9", 69.9, 1, 2, 1, 4644226, "Компактная кухня-гостиная 34,86 м² занимает почти половину дома; две спальни расположены по разные стороны холла."),
    ("75", 75, 1, 2, 1, 4827450, "Два варианта зеркальной планировки с двумя крупными спальнями и кухней-гостиной около 19,9 м²."),
    ("83-8", 83.8, 1, 2, 1, 5316356, "Две спальни по 16,3 м², кухня-гостиная около 33 м² и отдельная котельная 5,4 м²."),
    ("84", 84, 1, 3, 1, 5451525, "Вытянутая планировка с тремя спальнями, кухней-гостиной 28,9 м², бойлерной и ванной комнатой."),
    ("85", 85, 1, 3, 1, 5392485, "Два варианта расположения кухни-гостиной; три спальни и отдельная котельная собраны вокруг центрального холла."),
    ("90", 90, 1, 2, 1, 5612940, "Две спальни, санузел и котельная формируют отдельный блок, а общая зона может быть организована в двух вариантах."),
    ("99", 99, 1, 3, 1, 6014516, "Три спальни по 13,1–13,5 м² и кухня-гостиная около 33,2 м²; предусмотрены зеркальные варианты входной группы."),
    ("105", 105, 1, 3, 2, 6491940, "Три спальни, два санузла и кухня-гостиная 36,44 м². Планировка представлена в двух зеркальных вариантах."),
    ("107", 107, 1, 3, 2, 6443005, "Раздельные кухня и гостиная, мастер-спальня, гардероб и два санузла создают более приватный сценарий проживания."),
    ("109", 109, 1, 3, 2, 6563435, "Мастер-спальня, две дополнительные спальни, гардероб и два санузла; кухня и гостиная разделены."),
    ("111-1", 111.1, 1, 3, 2, 7143841, "Новый одноэтажный проект с тремя спальнями, двумя санузлами и центральной кухней-гостиной 35,8 м²."),
    ("114-2", 114.2, 1, 3, 2, 8485174, "Три крупные спальни, два санузла, кухня-гостиная 34,6 м² и отдельная бойлерная."),
    ("124", 124, 1, 3, 2, 7399948, "Три спальни, включая мастер-спальню, два санузла, гардеробы и кухня-гостиная 42,4 м²."),
    ("137", 137, 2, 3, 2, 8470436, "Двухэтажный дом: общая зона и технические помещения на первом этаже, три спальни и санузел на втором."),
    ("142-2", 142.2, 2, 3, 2, 9785777, "Двухэтажный дом с террасой 25,9 м², раздельными кухней и гостиной, тремя спальнями и балконом."),
]


EQVITA_ROWS = [
    {
        "slug": "eqvita-01", "title": "Индивидуальный проект Эквита №1", "area": 337, "floors": 2,
        "description": "Современный двухэтажный дом со встроенным гаражом на два автомобиля. В презентации указаны жилая площадь 107,8 м², общая площадь с террасой и крыльцом 337 м² и площадь застройки 237,1 м².",
        "family": "Для семьи, которой нужны крупные общие пространства, гараж и индивидуальная адаптация помещений второго этажа.", "sourcePage": 5,
    },
    {
        "slug": "eqvita-02", "title": "Индивидуальный проект Эквита №2", "area": 416.6, "floors": 2,
        "description": "Индивидуальный дом 2009 года с бассейном и сложной геометрией участка. Подтверждены отапливаемая площадь 350,6 м² и общая площадь 416,6 м².",
        "family": "Для большой семьи, которой нужен индивидуальный дом с бассейном и расширенными зонами отдыха.", "sourcePage": 7,
    },
    {
        "slug": "eqvita-03", "title": "Индивидуальный проект Эквита №3 — ТИП-О-1", "area": 217, "floors": 1,
        "description": "Одноэтажный проект ТИП-О-1: отапливаемая площадь 187 м², неотапливаемая летняя кухня 15 м² и терраса 30 м². Общая площадь вместе с террасами — 217 м².",
        "family": "Для семьи, которая хочет разместить жилые комнаты, кабинет и просторную общую зону на одном уровне.", "sourcePage": 9,
    },
    {
        "slug": "eqvita-04", "title": "Индивидуальный проект Эквита №4 — ТИП-О-3", "area": 161, "floors": 1, "bedrooms": 2, "bathrooms": 2,
        "description": "Одноэтажный проект ТИП-О-3 с отапливаемой площадью 149 м² и террасой 24 м². В плане различимы две спальни, кабинет, два санузла и объединённая кухня-гостиная.",
        "family": "Для пары или семьи с ребёнком, которой нужен кабинет и просторная одноэтажная планировка.", "sourcePage": 11,
    },
]


SOYUZ_INCLUDED = [
    "Ленточный фундамент глубиной 90–100 см",
    "Монолитная армированная плита пола толщиной 150 мм",
    "Фасадный кирпич и стены из газобетона либо утеплённого кирпича",
    "Металлочерепица 0,45 мм и утепление кровли",
    "Окна с наружной ламинацией и металлическая утеплённая дверь",
    "Разводка коммуникаций, тёплый пол, штукатурка под маяк и стяжка",
]


DOMAN_INCLUDED = [
    "Фундамент по выбранному конструктиву",
    "Стены и межкомнатные перегородки",
    "Кровля с утеплением и огнезащитной обработкой",
    "Окна и металлическая входная дверь",
    "Точный состав инженерии и отделки — по выбранной комплектации",
]


def public_media(slug: str, name: str) -> str:
    return f"assets/images/construction/{slug}/{name}.webp"


def build_projects() -> list[dict]:
    projects: list[dict] = []
    for row in DOMANSTROY_ROWS:
        price = row.get("price")
        projects.append({
            "id": row["code"].lower().replace("(", "-").replace(")", ""),
            "slug": row["slug"], "builderId": "domanstroy", "builder": "ДоманСтрой",
            "title": f"Проект {row['code']}", "code": row["code"], "area": row["area"], "floors": 1,
            "bedrooms": row["bedrooms"], "bathrooms": row["bathrooms"], "material": "Газобетон / кирпич",
            "materialKeys": ["gazobeton", "brick"], "projectType": "typical", "price": price,
            "priceStatus": "dated-confirmed" if price else "request", "priceDate": "май 2026" if price else None,
            "pricePackage": "Старт" if price else "Уточняется по актуальной смете",
            "description": row["description"], "family": row["family"],
            "scenario": f"В центре повседневной жизни — {row['kitchen']}. {row['extras'].capitalize()} отделяет бытовые и инженерные задачи от жилых комнат.",
            "features": ["1 этаж", f"{row['bedrooms']} спальни", f"{row['bathrooms']} санузла" if row['bathrooms'] > 1 else "1 санузел", row["kitchen"], row["extras"]],
            "included": DOMAN_INCLUDED, "clarify": ["Посадку дома на участок и геологию", "Подключение внешних сетей", "Состав отделки и инженерии", "Адаптацию проекта и смету"],
            "mainImage": public_media(row["slug"], "facade"),
            "gallery": [public_media(row["slug"], "facade"), public_media(row["slug"], "facade-2")],
            "floorPlans": [public_media(row["slug"], "plan")], "imageKind": "Рендер проекта",
            "sourceDocument": "Партнерская программа ДоманСтрой_ (1).pdf", "sourcePage": 4,
            "factSource": "Архив и официальный каталог застройщика, указанный в PDF",
        })

    for slug_part, area, floors, bedrooms, bathrooms, price, detail in SOYUZ_ROWS:
        slug = f"soyuz-{slug_part}"
        projects.append({
            "id": slug, "slug": slug, "builderId": "soyuz", "builder": "Союз Застройщиков",
            "title": f"Проект дома {str(area).replace('.', ',')} м²", "code": f"СЗ-{str(area).replace('.', ',')}",
            "area": area, "floors": floors, "bedrooms": bedrooms, "bathrooms": bathrooms,
            "material": "Кирпич / газобетон", "materialKeys": ["brick", "gazobeton"], "projectType": "typical",
            "price": price, "priceStatus": "partner-outdated", "priceDate": "2023", "pricePackage": "White Box",
            "description": f"Типовой дом площадью {str(area).replace('.', ',')} м² в комплектации White Box. {detail}",
            "scenario": "Кухня-гостиная формирует общее пространство, а изолированные спальни позволяют разделить активную и приватную части дома.",
            "family": f"Для семьи из {max(3, bedrooms)}–{bedrooms + 2} человек, которой нужны {bedrooms} отдельные спальни" + (" и два санузла." if bathrooms == 2 else "."),
            "features": [f"{floors} этаж" if floors == 1 else f"{floors} этажа", f"{bedrooms} спальни", f"{bathrooms} санузла" if bathrooms == 2 else "1 санузел", "Кухня-гостиная", "White Box"],
            "included": SOYUZ_INCLUDED, "clarify": ["Актуальную смету на дату обращения", "Посадку проекта на участок", "Внешние коммуникации", "Чистовую отделку и оборудование"],
            "mainImage": public_media(slug, "facade"), "gallery": [public_media(slug, "facade"), public_media(slug, "facade-2")],
            "floorPlans": [public_media(slug, "plan")], "imageKind": "Рендер проекта",
            "sourceDocument": "Ростов (1) (1).pdf", "sourcePage": 1, "factSource": "Каталог компании, подготовленный в 2023 году",
        })

    for index, row in enumerate(EQVITA_ROWS, start=1):
        projects.append({
            "id": f"eqvita-{index:02d}", "slug": row["slug"], "builderId": "eqvita", "builder": "Эквита",
            "title": row["title"], "code": f"EQ-{index:02d}", "area": row["area"], "floors": row["floors"],
            "bedrooms": row.get("bedrooms"), "bathrooms": row.get("bathrooms"), "material": None, "materialKeys": [],
            "projectType": "individual", "price": None, "priceStatus": "individual", "priceDate": None, "pricePackage": "Индивидуальная комплектация",
            "description": row["description"], "scenario": "Планировочное решение адаптируется к участку, ориентации по сторонам света и составу семьи; окончательный набор помещений подтверждается проектной документацией.",
            "family": row["family"], "features": [f"{str(row['area']).replace('.', ',')} м²", f"{row['floors']} этаж" if row['floors'] == 1 else f"{row['floors']} этажа", "Индивидуальный проект"],
            "included": ["Архитектурное решение", "Планировочная проработка", "Набор фасадных визуализаций", "Состав строительства — по индивидуальному договору"],
            "clarify": ["Рабочую документацию", "Материалы и конструктив", "Состав инженерии и отделки", "Срок, гарантию и индивидуальную стоимость"],
            "mainImage": public_media(row["slug"], "facade"), "gallery": [public_media(row["slug"], "facade"), public_media(row["slug"], "facade-2")],
            "floorPlans": [public_media(row["slug"], "plan")], "imageKind": "Архитектурный рендер",
            "sourceDocument": "архитектура (1).pdf", "sourcePage": row["sourcePage"], "factSource": "Архитектурная презентация компании",
        })
    return projects


PROJECTS = build_projects()


def esc(value: object) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def area_text(value: float | int) -> str:
    number = f"{value:g}".replace(".", ",")
    return f"{number} м²"


def rubles(value: int | None) -> str:
    return f"{value:,}".replace(",", " ") + " ₽" if value else ""


def price_text(project: dict) -> str:
    if project["priceStatus"] == "individual":
        return "Индивидуальный расчёт"
    if project["price"]:
        return f"от {rubles(project['price'])}"
    return "Стоимость по запросу"


def price_note(project: dict) -> str:
    if project["priceStatus"] == "partner-outdated":
        return "Ориентир по материалам партнёра 2023 года — актуальность необходимо уточнить."
    if project["priceStatus"] == "dated-confirmed":
        return f"Комплектация «{project['pricePackage']}», таблица от {project['priceDate']}. Запросите актуальный расчёт."
    if project["priceStatus"] == "individual":
        return "Цена формируется после согласования архитектуры, участка и комплектации."
    return "В архиве нет однозначной цены для этой площади — требуется индивидуальная смета."


def price_version(project: dict) -> str:
    if project.get("priceDate"):
        return project["priceDate"]
    if project["priceStatus"] == "individual":
        return "индивидуальный расчёт"
    return "по запросу"


def relative(path: str, prefix: str) -> str:
    return prefix + path


def picture(project: dict, name: str, alt: str, prefix: str, eager: bool = False) -> str:
    path = project["mainImage"] if name == "facade" else public_media(project["slug"], name)
    mobile = path.replace(".webp", "-640.webp")
    loading = "eager" if eager else "lazy"
    priority = ' fetchpriority="high"' if eager else ""
    return (
        f'<picture><source media="(max-width: 640px)" srcset="{esc(relative(mobile, prefix))}">'
        f'<img src="{esc(relative(path, prefix))}" alt="{esc(alt)}" loading="{loading}" width="1200" height="800"{priority}></picture>'
    )


def header(prefix: str, current: str = "construction") -> str:
    nav = [
        ("index.html", "Главная", "home"), ("apartments.html", "Квартиры", "apartments"),
        ("houses.html", "Дома", "houses"), ("lands.html", "Участки", "lands"),
        ("newbuilds.html", "Новостройки", "newbuilds"), ("construction.html", "Строительство домов", "construction"),
        ("commercial.html", "Коммерция", "commercial"), ("team/zukhra-alieva.html", "Команда", "team"),
    ]
    links = "".join(
        f'<a href="{prefix}{href}"' + (' aria-current="page"' if key == current else "") + f'>{label}</a>'
        for href, label, key in nav
    )
    return f'''<header>
  <div class="header-inner">
    <span class="header-mobile-spacer" aria-hidden="true"></span>
    <a href="{prefix}index.html" class="logo">Домиан · офис «Квартал»</a>
    <nav aria-label="Основная навигация">{links}</nav>
    <div class="header-contacts"><a href="tel:+79536091122">+7 953 609-11-22</a><a href="https://wa.me/79536091122" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="https://t.me/httpsmealieva_rieltor" target="_blank" rel="noopener noreferrer">Telegram</a><a href="https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger>MAX</a></div>
    <button class="mobile-menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-drawer"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-drawer" id="mobile-drawer" aria-hidden="true"><div class="mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Мобильное меню"><button class="mobile-drawer__close" type="button" aria-label="Закрыть меню">×</button><div class="mobile-drawer__title">Навигация</div><nav class="mobile-drawer__nav">{links}</nav><div class="mobile-drawer__actions"><a class="mobile-drawer__call" href="tel:+79536091122">+7 953 609-11-22</a><a href="https://wa.me/79536091122" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="https://t.me/httpsmealieva_rieltor" target="_blank" rel="noopener noreferrer">Telegram</a><a href="https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4" target="_blank" rel="noopener noreferrer" data-channel="max">MAX</a></div></div></div>'''


def footer(prefix: str) -> str:
    return f'''<footer class="construction-footer"><div class="container construction-footer__grid"><div><a class="construction-footer__brand" href="{prefix}index.html">Домиан · офис «Квартал»</a><p>Подбираем участок, проект и строительную компанию, сравниваем условия и сопровождаем клиента.</p></div><nav aria-label="Навигация в подвале"><a href="{prefix}construction.html">Каталог проектов</a><a href="{prefix}lands.html">Участки</a><a href="{prefix}houses.html">Готовые дома</a><a href="{prefix}privacy.html">Политика конфиденциальности</a></nav><div><a href="tel:+79536091122">+7 953 609-11-22</a><div class="construction-footer__channels"><a href="https://wa.me/79536091122" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="https://t.me/httpsmealieva_rieltor" target="_blank" rel="noopener noreferrer">Telegram</a><a href="https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger>MAX</a></div></div></div><div class="container construction-footer__legal">© 2022–2026 АН «Домиан Квартал». Информация не является публичной офертой.</div></footer>'''


def lead_form(prefix: str, project: dict | None = None, builder: dict | None = None) -> str:
    code = project["code"] if project else ""
    name = project["title"] if project else ""
    builder_name = project["builder"] if project else (builder["name"] if builder else "")
    area = area_text(project["area"]) if project else ""
    project_url = f"{SITE}/construction/projects/{project['slug']}.html" if project else ""
    selected_price_version = price_version(project) if project else ""
    desired = area if project else ""
    source = "project_detail" if project else ("builder_page" if builder else "catalog")
    return f'''<section class="construction-lead" id="lead-form-section" aria-labelledby="construction-lead-title"><div class="container construction-lead__grid"><div><span class="section-kicker">Персональный расчёт</span><h2 id="construction-lead-title">Получите подборку проектов под ваш участок и бюджет</h2><p>Сравним подходящие планировки и комплектации. Заявка поступит специалисту «Домиан Квартал», а не напрямую строительной компании.</p><ul><li>Проверим, подходит ли проект участку</li><li>Соберём актуальные сметы</li><li>Сравним ипотеку и другие способы оплаты</li></ul></div><form id="lead-form" method="POST" data-lead-form data-source-cta="construction_form" data-object-type="construction" data-project-code="{esc(code)}" data-project-name="{esc(name)}" data-builder="{esc(builder_name)}" data-project-area="{esc(area)}" data-project-url="{esc(project_url)}" data-source-transition="{esc(source)}" data-price-version="{esc(selected_price_version)}">
<input type="checkbox" name="botcheck" style="display:none" aria-hidden="true"><input type="hidden" name="service" value="construction"><input type="hidden" name="project_code" value="{esc(code)}"><input type="hidden" name="project_name" value="{esc(name)}"><input type="hidden" name="builder" value="{esc(builder_name)}"><input type="hidden" name="project_area" value="{esc(area)}"><input type="hidden" name="project_url" value="{esc(project_url)}"><input type="hidden" name="source_transition" value="{esc(source)}"><input type="hidden" name="price_version" value="{esc(selected_price_version)}">
<div class="construction-form__project" data-selected-project {'hidden' if not project else ''}>{'Выбран проект: ' + esc(name) if project else ''}</div><div class="construction-form__grid"><div class="form-group"><label class="form-label" for="lead-area">Желаемая площадь</label><input id="lead-area" class="form-control" name="desired_area" value="{esc(desired)}" placeholder="Например, 100–120 м²"></div><div class="form-group"><label class="form-label" for="lead-plot">Участок</label><select id="lead-plot" class="form-control" name="plot_status"><option value="have">Участок уже есть</option><option value="need" selected>Нужно подобрать</option><option value="choosing">Выбираю участок</option></select></div><div class="form-group"><label class="form-label" for="lead-budget">Бюджет или способ оплаты</label><select id="lead-budget" class="form-control" name="budget_payment"><option value="" selected>Пока не определён</option><option value="cash">Собственные средства</option><option value="mortgage">Ипотека</option><option value="mixed">Комбинированная оплата</option></select></div><div class="form-group"><label class="form-label" for="lead-name">Ваше имя</label><input id="lead-name" class="form-control" type="text" name="name" autocomplete="name" minlength="2" maxlength="80" placeholder="Иван" required></div><div class="form-group construction-form__phone"><label class="form-label" for="lead-phone">Телефон</label><input id="lead-phone" class="form-control" type="tel" name="phone" autocomplete="tel" inputmode="tel" maxlength="24" placeholder="+7 999 123-45-67" required></div></div><div class="form-consent"><input id="lead-privacy-consent" type="checkbox" name="privacy_consent" value="accepted" required><label for="lead-privacy-consent">Я согласен(на) на обработку персональных данных и принимаю <a href="{prefix}privacy.html" target="_blank" rel="noopener noreferrer">политику конфиденциальности</a>.</label></div><p class="form-status" data-form-status role="status" aria-live="polite" hidden></p><button class="submit-btn" type="submit">Получить проекты и расчёт</button></form></div></section>'''


def project_card(project: dict, prefix: str = "", compact: bool = False) -> str:
    url = f"{prefix}construction/projects/{project['slug']}.html"
    details = [area_text(project["area"])]
    if project.get("floors"):
        details.append(f"{project['floors']} этаж" if project["floors"] == 1 else f"{project['floors']} этажа")
    if project.get("bedrooms"):
        details.append(f"{project['bedrooms']} спальни")
    if project.get("bathrooms"):
        details.append(f"{project['bathrooms']} санузла" if project["bathrooms"] > 1 else "1 санузел")
    material = project.get("material") or "Материал по проекту"
    data = f'''data-project-card data-builder="{project['builderId']}" data-area="{project['area']}" data-floors="{project.get('floors') or ''}" data-bedrooms="{project.get('bedrooms') or ''}" data-materials="{' '.join(project.get('materialKeys', []))}" data-price="{project.get('price') or ''}" data-project-type="{project['projectType']}"'''
    quote_data = f'''data-project-quote data-lead-type="construction" data-source-cta="construction_project_quote" data-object-id="{esc(project['id'])}" data-object-type="construction" data-object-title="{esc(project['title'])}" data-object-price="{esc(price_text(project))}" data-object-url="{esc(url)}" data-project-code="{esc(project['code'])}" data-project-name="{esc(project['title'])}" data-builder="{esc(project['builder'])}" data-project-area="{esc(area_text(project['area']))}" data-project-url="{esc(url)}" data-source-transition="catalog_card" data-price-version="{esc(price_version(project))}"'''
    compact_class = " is-compact" if compact else ""
    return f'''<article class="construction-card{compact_class}" {data}><a class="construction-card__media" href="{url}" data-project-open>{picture(project, 'facade', project['title'] + ' — фасад', prefix)}<span>{esc(project['imageKind'])}</span></a><div class="construction-card__body"><p class="construction-card__builder">{esc(project['builder'])}</p><h3><a href="{url}" data-project-open>{esc(project['title'])}</a></h3><p class="construction-card__facts">{' · '.join(details)}</p><p class="construction-card__material">{esc(material)}</p><div class="construction-card__price"><strong>{esc(price_text(project))}</strong><small>{esc(price_note(project))}</small></div><div class="construction-card__actions"><a class="btn secondary" href="{url}" data-project-open>Смотреть проект</a><a class="btn" href="#lead-form-section" {quote_data}>Получить расчёт</a></div></div></article>'''


def document_head(title: str, description: str, canonical: str, image_url: str, prefix: str, schema: dict | list[dict]) -> str:
    return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(canonical)}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="{esc(canonical)}"><meta property="og:image" content="{esc(image_url)}"><link rel="icon" href="{prefix}assets/hero/hero.jpg" type="image/jpeg"><link rel="stylesheet" href="{prefix}assets/css/main.css"><link rel="stylesheet" href="{prefix}assets/css/visual-premium.css"><link rel="stylesheet" href="{prefix}assets/css/construction.css"><script type="application/ld+json">{json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')}</script></head>'''


def scripts(prefix: str, catalog: bool = False, detail: bool = False) -> str:
    extra = f'<script src="{prefix}assets/js/construction-catalog.js" defer></script>' if catalog or detail else ""
    return f'''<script src="{prefix}assets/js/lead-config.js" defer></script><script src="{prefix}assets/js/main.js" defer></script><script src="{prefix}assets/js/form-handler.js" defer></script>{extra}'''


def catalog_page() -> str:
    canonical = f"{SITE}/construction.html"
    schema = {
        "@context": "https://schema.org", "@type": "ItemList", "name": "Проекты домов под ключ",
        "numberOfItems": len(PROJECTS), "itemListElement": [
            {"@type": "ListItem", "position": index, "url": f"{SITE}/construction/projects/{project['slug']}.html", "name": project["title"]}
            for index, project in enumerate(PROJECTS, start=1)
        ],
    }
    cards = "".join(project_card(project) for project in PROJECTS)
    builder_cards = "".join(
        f'''<article class="builder-card"><span>{len([p for p in PROJECTS if p['builderId'] == key])} проектов</span><h3>{esc(builder['name'])}</h3><p>{esc(builder['short'])}</p><p>{esc(builder['geography'])}</p><a class="btn secondary" href="construction/builders/{key}.html">О компании и проектах</a></article>'''
        for key, builder in BUILDERS.items()
    )
    title = "Строительство домов под ключ в Ростове-на-Дону и Аксае | Домиан Квартал"
    description = "26 проектов домов от трёх строительных компаний: фасады, планировки, площади, комплектации и цены с датами. Подбор проекта под участок и бюджет."
    head = document_head(title, description, canonical, f"{SITE}/{PROJECTS[4]['mainImage']}", "", schema)
    return f'''{head}<body class="construction-page construction-catalog-page">{header("")}
<main><section class="construction-hero"><div class="container construction-hero__grid"><div><span class="section-kicker">26 проектов · 3 строительные компании</span><h1>Строительство домов под ключ в Ростове-на-Дону, Аксае и Ростовской области</h1><p>Подберём проект под участок и бюджет, сравним комплектации застройщиков, поможем с ипотекой и сопроводим сделку.</p><div class="construction-hero__actions"><a class="btn" href="#construction-projects">Подобрать проекты</a><a class="btn secondary" href="#lead-form-section" data-lead-type="construction" data-source-cta="construction_hero_quote">Рассчитать стоимость</a></div><dl><div><dt>26</dt><dd>проверенных проектов</dd></div><div><dt>69,9–416,6 м²</dt><dd>диапазон площадей</dd></div><div><dt>1–2</dt><dd>этажа</dd></div></dl></div><div class="construction-hero__media">{picture(PROJECTS[4], 'facade', 'Проект одноэтажного дома 116 м²', '', True)}<span>Проект DS-116 · «ДоманСтрой»</span></div></div></section>
<section class="construction-filter" id="construction-projects"><div class="container"><div class="section-heading"><span class="section-kicker">Полный каталог</span><h2>Подберите проект по параметрам</h2><p>Неизвестные характеристики не выдуманы: при включении соответствующего фильтра такие проекты исключаются, но без фильтров видны все 26 карточек.</p></div><form class="construction-filter__controls" data-project-filters><label>Компания<select name="builder"><option value="">Все компании</option><option value="domanstroy">ДоманСтрой</option><option value="soyuz">Союз Застройщиков</option><option value="eqvita">Эквита</option></select></label><label>Площадь<select name="area"><option value="">Любая</option><option value="0-90">до 90 м²</option><option value="90-120">90–120 м²</option><option value="120-160">120–160 м²</option><option value="160-999">от 160 м²</option></select></label><label>Этажность<select name="floors"><option value="">Любая</option><option value="1">1 этаж</option><option value="2">2 этажа</option></select></label><label>Спальни<select name="bedrooms"><option value="">Любое число</option><option value="2">2</option><option value="3">3</option></select></label><label>Материал стен<select name="material"><option value="">Любой</option><option value="brick">Кирпич</option><option value="gazobeton">Газобетон</option></select></label><label>Стоимость<select name="price"><option value="">Любая / по запросу</option><option value="0-6000000">до 6 млн ₽</option><option value="6000000-8000000">6–8 млн ₽</option><option value="8000000-999999999">от 8 млн ₽</option></select></label><label>Тип проекта<select name="projectType"><option value="">Любой</option><option value="typical">Типовой</option><option value="individual">Индивидуальный</option></select></label><button type="reset" class="construction-filter__reset">Сбросить</button></form><div class="construction-filter__status" role="status" aria-live="polite"><strong data-project-count>26</strong> проектов</div><noscript><p class="construction-noscript">JavaScript отключён — все проекты показаны без фильтрации.</p></noscript><div class="construction-grid" data-project-grid>{cards}</div><p class="construction-empty" data-project-empty hidden>По выбранным параметрам проектов не найдено. Сбросьте один из фильтров или оставьте заявку — проверим индивидуальные варианты.</p></div></section>
<section class="construction-section construction-builders"><div class="container"><div class="section-heading"><span class="section-kicker">Партнёрские компании</span><h2>Сравните подходы к строительству</h2><p>«Домиан Квартал» не строит дома: мы подбираем проект и партнёрскую компанию, сравниваем предложения и сопровождаем клиента.</p></div><div class="builder-grid">{builder_cards}</div><div class="construction-table-wrap"><table><caption>Что подтверждено в приложенных материалах</caption><thead><tr><th>Компания</th><th>Формат</th><th>Комплектации</th><th>География</th><th>Цена</th></tr></thead><tbody><tr><th>ДоманСтрой</th><td>Типовые и индивидуальные проекты</td><td>Старт, Стандарт, Комфорт, Премиум</td><td>Ростовская область, север Краснодарского края</td><td>Точные строки таблицы за май 2026 — для совпадающих площадей</td></tr><tr><th>Союз Застройщиков</th><td>Типовые дома 69,9–142,2 м²</td><td>White Box</td><td>Уточняется по участку</td><td>Ориентиры из каталога 2023 года</td></tr><tr><th>Эквита</th><td>Индивидуальная современная архитектура</td><td>Индивидуально</td><td>По согласованию</td><td>Индивидуальный расчёт</td></tr></tbody></table></div></div></section>
<section class="construction-section construction-packages"><div class="container"><div class="section-heading"><span class="section-kicker">Комплектации</span><h2>Сравнивайте не только цену, но и состав работ</h2></div><div class="package-grid"><article><span>ДоманСтрой</span><h3>Старт</h3><p>Фундамент, стены, кровля, окна и входная дверь. Конструктив и точные материалы фиксируются в смете.</p></article><article><span>ДоманСтрой</span><h3>Комфорт</h3><p>К базовому конструктиву добавляются фасадный кирпич, электрика, сантехника, тёплый пол, радиаторы, котёл, штукатурка и стяжка.</p></article><article><span>ДоманСтрой</span><h3>Премиум</h3><p>Расширенный конструктив, двухкамерные окна, мягкая кровля и более полный состав инженерной подготовки.</p></article><article><span>Союз Застройщиков</span><h3>White Box</h3><p>Коробка с фасадом, кровлей, окнами и дверью; разводка коммуникаций, отопление, штукатурка под маяк и стяжка пола.</p></article></div><p class="construction-disclaimer">Названия комплектаций не гарантируют одинаковый состав у разных компаний. Сравнивайте спецификации построчно в актуальных сметах.</p></div></section>
<section class="construction-section construction-stages"><div class="container"><div class="section-heading"><span class="section-kicker">Реальная стройка</span><h2>Путь от участка до готового дома</h2><p>Фотографии строительных этапов извлечены из приложенных материалов «ДоманСтрой».</p></div><ol><li><strong>01</strong><span>Проверка участка и посадка проекта</span></li><li><img src="assets/images/construction/stages/foundation.webp" alt="Устройство фундамента дома" loading="lazy"><div><strong>02</strong><span>Фундамент и вводы коммуникаций</span></div></li><li><img src="assets/images/construction/stages/walls.webp" alt="Возведение кирпичных стен дома" loading="lazy"><div><strong>03</strong><span>Коробка, проёмы и перекрытия</span></div></li><li><img src="assets/images/construction/stages/roof.webp" alt="Дом после монтажа кровли" loading="lazy"><div><strong>04</strong><span>Кровля и закрытие контура</span></div></li><li><img src="assets/images/construction/stages/interior.webp" alt="Внутренние инженерные и отделочные работы" loading="lazy"><div><strong>05</strong><span>Инженерия и отделка по комплектации</span></div></li><li><img src="assets/images/construction/stages/finished.webp" alt="Готовый одноэтажный кирпичный дом" loading="lazy"><div><strong>06</strong><span>Приёмка и передача дома</span></div></li></ol></div></section>
<section class="construction-section construction-payment" id="construction-mortgage"><div class="container construction-payment__grid"><div><span class="section-kicker">Оплата и ипотека</span><h2>Рассчитаем сценарий финансирования отдельно от рекламных обещаний</h2><p>В материалах компаний упоминаются ипотека, наличный расчёт и частичный первоначальный взнос. Ставки и платежи из старых презентаций не публикуем: программа проверяется заново по дате обращения и составу семьи.</p></div><ul><li>Собственные средства</li><li>Ипотека на строительство</li><li>Комбинированная оплата</li><li>Материнский капитал — при соответствии условиям</li></ul><a class="btn" href="#lead-form-section" data-lead-type="construction" data-source-cta="construction_mortgage">Рассчитать ипотеку на строительство</a></div></section>
<section class="construction-section construction-roles"><div class="container"><div class="section-heading"><span class="section-kicker">Кто за что отвечает</span><h2>Понятные роли до подписания договора</h2></div><div class="roles-grid"><article><span>Домиан Квартал</span><h3>Подбор и сопровождение</h3><p>Помогаем выбрать участок, проект и строительную компанию, сравниваем условия, организуем ипотечный и сделочный маршрут.</p></article><article><span>Строительная компания</span><h3>Проект и строительство</h3><p>Отвечает за проектную документацию, смету, сроки, материалы, стройку, гарантии и сдачу результата по договору.</p></article><article><span>Клиент</span><h3>Исходные данные и решения</h3><p>Предоставляет документы по участку, согласует бюджет, проект, комплектацию и принимает этапы работ.</p></article></div></div></section>
<section class="construction-section construction-help"><div class="container"><div class="section-heading"><span class="section-kicker">Наша помощь</span><h2>Сведём три разных предложения к одному формату</h2></div><div class="help-grid"><article><strong>01</strong><h3>Проверим участок</h3><p>Назначение земли, ограничения, подъезд, коммуникации и посадка дома.</p><a href="guides/chto-proverit-pered-pokupkoy-uchastka-v-aksaye.html">12 шагов проверки участка →</a></article><article><strong>02</strong><h3>Сравним сметы</h3><p>Разделим конструктив, инженерию, отделку и то, что оплачивается отдельно.</p></article><article><strong>03</strong><h3>Проверим договор</h3><p>Сроки, цена, гарантии, порядок приёмки и ответственность сторон.</p></article><article><strong>04</strong><h3>Сопроводим расчёты</h3><p>Ипотека или собственные средства — без подмены рекламным ежемесячным платежом.</p></article></div></div></section>
<section class="construction-section construction-faq"><div class="container"><div class="section-heading"><span class="section-kicker">Вопросы и ответы</span><h2>Что важно уточнить до выбора проекта</h2></div><div class="faq-list"><details><summary>Цена в карточке окончательная?</summary><p>Нет. Для «Союза Застройщиков» это ориентир из каталога 2023 года, для совпадающих площадей «ДоманСтрой» — строка таблицы мая 2026. Финальная смета зависит от участка, комплектации и даты расчёта.</p></details><details><summary>Можно ли изменить планировку?</summary><p>Возможность зависит от конструктивной схемы. «ДоманСтрой» указывает адаптацию типовых и работу с индивидуальными проектами; «Эквита» специализируется на индивидуальной архитектуре.</p></details><details><summary>Если участка ещё нет?</summary><p>Подберём участок параллельно с проектом, чтобы заранее проверить пятно застройки, подъезд и стоимость коммуникаций.</p></details><details><summary>Кто будет строить дом?</summary><p>Строительство выполняет компания, указанная в карточке проекта. «Домиан Квартал» помогает выбрать и сравнить партнёров и сопровождает клиента.</p></details><details><summary>Можно ли использовать ипотеку?</summary><p>Да, если клиент и объект соответствуют актуальной программе банка. Ставку и платёж проверяем на дату обращения.</p></details></div></div></section>
{lead_form("")}</main>{footer("")}{scripts("", catalog=True)}</body></html>'''


def similar_projects(project: dict) -> list[dict]:
    pool = [p for p in PROJECTS if p["slug"] != project["slug"]]
    return sorted(pool, key=lambda p: (p["builderId"] != project["builderId"], abs(float(p["area"]) - float(project["area"]))))[:3]


def project_page(project: dict) -> str:
    prefix = "../../"
    canonical = f"{SITE}/construction/projects/{project['slug']}.html"
    region = "Ростове-на-Дону и Ростовской области"
    page_title = f"{project['title']}, {area_text(project['area'])} — цена и планировка | Домиан Квартал"
    meta = f"{project['title']} от {project['builder']}: {area_text(project['area'])}, планировка, фасады, комплектация и {price_text(project).lower()}. Подбор проекта под участок в Ростовской области."
    breadcrumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Главная", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Строительство домов", "item": f"{SITE}/construction.html"},
        {"@type": "ListItem", "position": 3, "name": project["title"], "item": canonical},
    ]}
    service = {"@context": "https://schema.org", "@type": "Service", "name": f"Строительство по проекту {project['title']}", "description": project["description"], "areaServed": "Ростовская область", "url": canonical, "image": [f"{SITE}/{image}" for image in project["gallery"]]}
    head = document_head(page_title, meta, canonical, f"{SITE}/{project['mainImage']}", prefix, [breadcrumbs, service])
    facts = [
        ("Площадь", area_text(project["area"])), ("Этажность", f"{project['floors']} этаж" if project["floors"] == 1 else f"{project['floors']} этажа"),
        ("Спальни", project.get("bedrooms") or "уточняется"), ("Санузлы", project.get("bathrooms") or "уточняется"),
        ("Стены", project.get("material") or "уточняются"), ("Тип", "типовой" if project["projectType"] == "typical" else "индивидуальный"),
    ]
    fact_html = "".join(f"<div><dt>{esc(label)}</dt><dd>{esc(value)}</dd></div>" for label, value in facts)
    features = "".join(f"<li>{esc(value)}</li>" for value in project["features"])
    included = "".join(f"<li>{esc(value)}</li>" for value in project["included"])
    clarify = "".join(f"<li>{esc(value)}</li>" for value in project["clarify"])
    gallery = "".join(
        f'''<figure>{picture(project, 'facade' if index == 1 else f'facade-{index}', f"{project['title']} — вариант фасада {index}", prefix, index == 1)}<figcaption>{esc(project['imageKind'])}: вариант фасада {index}</figcaption></figure>'''
        for index, _ in enumerate(project["gallery"], start=1)
    )
    similar = "".join(project_card(item, prefix, compact=True) for item in similar_projects(project))
    quote_data = f'''data-project-quote data-lead-type="construction" data-source-cta="construction_project_detail_quote" data-object-id="{esc(project['id'])}" data-object-type="construction" data-object-title="{esc(project['title'])}" data-object-price="{esc(price_text(project))}" data-object-url="{esc(canonical)}" data-project-code="{esc(project['code'])}" data-project-name="{esc(project['title'])}" data-builder="{esc(project['builder'])}" data-project-area="{esc(area_text(project['area']))}" data-project-url="{esc(canonical)}" data-source-transition="project_detail" data-price-version="{esc(price_version(project))}"'''
    return f'''{head}<body class="construction-page construction-detail-page" data-project-detail data-project-id="{esc(project['id'])}" data-builder="{esc(project['builderId'])}">{header(prefix)}<main><nav class="container construction-breadcrumbs" aria-label="Хлебные крошки"><a href="{prefix}index.html">Главная</a><span>→</span><a href="{prefix}construction.html">Строительство домов</a><span>→</span><span>{esc(project['title'])}</span></nav><section class="project-hero"><div class="container project-hero__grid"><div class="project-hero__media">{picture(project, 'facade', project['title'] + ' — фасад', prefix, True)}<span>{esc(project['imageKind'])}</span></div><div class="project-hero__content"><p class="project-hero__builder"><a href="../builders/{project['builderId']}.html">{esc(project['builder'])}</a></p><h1>{esc(project['title'])}, {esc(area_text(project['area']))} — проект дома в {region}</h1><p class="project-hero__lead">{esc(project['description'])}</p><div class="project-hero__price"><strong>{esc(price_text(project))}</strong><span>{esc(price_note(project))}</span></div><div class="project-hero__actions"><a class="btn" href="#lead-form-section" {quote_data}>Получить расчёт проекта</a><a class="btn secondary" href="tel:+79536091122">Позвонить</a></div><p class="project-hero__disclaimer">Окончательная стоимость определяется после проверки участка, комплектации и актуальной сметы. Не является публичной офертой.</p></div></div></section><section class="project-facts"><div class="container"><dl>{fact_html}</dl></div></section><section class="construction-section project-gallery"><div class="container"><div class="section-heading"><span class="section-kicker">Фасады</span><h2>Архитектура проекта</h2><p>Изображения извлечены из материалов строительной компании; рендер не является фотографией построенного объекта.</p></div><div class="project-gallery__grid">{gallery}</div></div></section><section class="construction-section project-plan"><div class="container project-plan__grid"><div><span class="section-kicker">Планировка</span><h2>Как организовано пространство</h2><p>{esc(project['scenario'])}</p><ul>{features}</ul></div><figure>{picture(project, 'plan', f"Планировка {project['title']} площадью {area_text(project['area'])}", prefix)}<figcaption>Планировка из материалов строительной компании. Рабочие размеры и привязки уточняются в проектной документации.</figcaption></figure></div></section><section class="construction-section project-living"><div class="container project-living__grid"><article><span class="section-kicker">Сценарий проживания</span><h2>Дом для повседневной жизни</h2><p>{esc(project['scenario'])}</p></article><article><span class="section-kicker">Для кого</span><h2>Какой семье подойдёт</h2><p>{esc(project['family'])}</p></article></div></section><section class="construction-section project-builder"><div class="container project-builder__grid"><div><span class="section-kicker">Строительная компания</span><h2>{esc(project['builder'])}</h2><p>{esc(BUILDERS[project['builderId']]['about'])}</p><p>{esc(BUILDERS[project['builderId']]['geography'])}</p><a class="btn secondary" href="../builders/{project['builderId']}.html">Все проекты компании</a></div><dl><div><dt>Комплектация</dt><dd>{esc(project['pricePackage'])}</dd></div><div><dt>Гарантия</dt><dd>{esc(BUILDERS[project['builderId']]['warranty'])}</dd></div><div><dt>Источник характеристик</dt><dd>{esc(project['factSource'])}</dd></div></dl></div></section><section class="construction-section project-package"><div class="container"><div class="section-heading"><span class="section-kicker">Состав предложения</span><h2>Что входит и что уточнить отдельно</h2></div><div class="project-package__grid"><article><h3>Подтверждено материалами</h3><ul>{included}</ul></article><article><h3>Нужно уточнить в актуальной смете</h3><ul>{clarify}</ul></article></div><div class="project-price-note"><strong>{esc(price_text(project))}</strong><p>{esc(price_note(project))}</p><p>Дата и версия цены указаны явно; скрытые или непроверенные цены в структурированные данные не добавлены.</p></div></div></section>{lead_form(prefix, project=project)}<section class="construction-section project-similar"><div class="container"><div class="section-heading"><span class="section-kicker">Похожие варианты</span><h2>Сравните с соседними площадями</h2></div><div class="construction-grid is-similar">{similar}</div><a class="project-similar__all" href="{prefix}construction.html#construction-projects">Смотреть все 26 проектов →</a></div></section></main>{footer(prefix)}{scripts(prefix, detail=True)}</body></html>'''


def builder_page(builder_id: str, builder: dict) -> str:
    prefix = "../../"
    items = [p for p in PROJECTS if p["builderId"] == builder_id]
    canonical = f"{SITE}/construction/builders/{builder_id}.html"
    title = f"{builder['name']} — проекты домов и комплектации | Домиан Квартал"
    description = f"Проекты строительной компании {builder['name']}: {len(items)} домов, площади, планировки, комплектации и условия, подтверждённые материалами компании."
    schema = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Главная", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Строительство домов", "item": f"{SITE}/construction.html"},
        {"@type": "ListItem", "position": 3, "name": builder["name"], "item": canonical},
    ]}
    cards = "".join(project_card(project, prefix) for project in items)
    directions = "".join(f"<li>{esc(value)}</li>" for value in builder["directions"])
    packages = "".join(f"<li>{esc(value)}</li>" for value in builder["packages"])
    head = document_head(title, description, canonical, f"{SITE}/{items[0]['mainImage']}", prefix, schema)
    return f'''{head}<body class="construction-page builder-detail-page">{header(prefix)}<main><nav class="container construction-breadcrumbs" aria-label="Хлебные крошки"><a href="{prefix}index.html">Главная</a><span>→</span><a href="{prefix}construction.html">Строительство домов</a><span>→</span><span>{esc(builder['name'])}</span></nav><section class="builder-hero"><div class="container builder-hero__grid"><div><span class="section-kicker">Строительная компания</span><h1>{esc(builder['name'])}: проекты домов в Ростовской области</h1><p>{esc(builder['about'])}</p><a class="btn" href="#builder-projects">Смотреть проекты</a><a class="btn secondary" href="#lead-form-section" data-lead-type="construction" data-source-cta="construction_builder_quote" data-builder="{esc(builder['name'])}">Подобрать проект этого застройщика</a></div>{picture(items[0], 'facade', f"Проект строительной компании {builder['name']}", prefix, True)}</div></section><section class="construction-section builder-about"><div class="container builder-about__grid"><article><span class="section-kicker">География</span><h2>Где работает компания</h2><p>{esc(builder['geography'])}</p></article><article><span class="section-kicker">Направления</span><h2>Что можно подобрать</h2><ul>{directions}</ul></article><article><span class="section-kicker">Комплектации</span><h2>Форматы предложения</h2><ul>{packages}</ul><p>{esc(builder['warranty'])}</p></article></div></section><section class="construction-filter" id="builder-projects"><div class="container"><div class="section-heading"><span class="section-kicker">{len(items)} проектов</span><h2>Каталог {esc(builder['name'])}</h2><p>Все карточки ведут на отдельные индексируемые страницы с планировкой и формой расчёта.</p></div><div class="construction-grid">{cards}</div></div></section>{lead_form(prefix, builder=builder)}</main>{footer(prefix)}{scripts(prefix, detail=True)}</body></html>'''


def write_json() -> None:
    OUTPUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_DATA.write_text(json.dumps({"generatedAt": TODAY.isoformat(), "projects": PROJECTS}, ensure_ascii=False, indent=2), encoding="utf-8")


def update_sitemap() -> None:
    sitemap = ROOT / "sitemap.xml"
    tree = ET.parse(sitemap)
    root = tree.getroot()
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    urls = {node.text: parent for parent in root.findall(f"{{{namespace}}}url") if (node := parent.find(f"{{{namespace}}}loc")) is not None}
    additions = [f"{SITE}/construction.html"] + [f"{SITE}/construction/builders/{key}.html" for key in BUILDERS] + [f"{SITE}/construction/projects/{project['slug']}.html" for project in PROJECTS]
    for loc in additions:
        node = urls.get(loc)
        if node is None:
            node = ET.SubElement(root, f"{{{namespace}}}url")
            ET.SubElement(node, f"{{{namespace}}}loc").text = loc
            ET.SubElement(node, f"{{{namespace}}}changefreq").text = "monthly"
            ET.SubElement(node, f"{{{namespace}}}priority").text = "0.8" if "/projects/" in loc else "0.9"
        lastmod = node.find(f"{{{namespace}}}lastmod")
        if lastmod is None:
            lastmod = ET.SubElement(node, f"{{{namespace}}}lastmod")
        lastmod.text = TODAY.isoformat()
    ET.indent(tree, space="  ")
    tree.write(sitemap, encoding="utf-8", xml_declaration=True)


def main() -> None:
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    BUILDERS_DIR.mkdir(parents=True, exist_ok=True)
    write_json()
    catalog_html = catalog_page().replace(
        "<h1>Строительство домов под ключ в Ростове-на-Дону, Аксае и Ростовской области</h1>",
        '<h1><span class="construction-hero__title-main">Строительство<br>домов под ключ</span>'
        '<span class="construction-hero__title-location">в Ростове-на-Дону, Аксае<br>и Ростовской области</span></h1>',
    )
    (ROOT / "construction.html").write_text(catalog_html, encoding="utf-8")
    for project in PROJECTS:
        (PROJECTS_DIR / f"{project['slug']}.html").write_text(project_page(project), encoding="utf-8")
    for builder_id, builder in BUILDERS.items():
        (BUILDERS_DIR / f"{builder_id}.html").write_text(builder_page(builder_id, builder), encoding="utf-8")
    update_sitemap()
    print(f"Generated {len(PROJECTS)} project pages, {len(BUILDERS)} builder pages and construction.html")


if __name__ == "__main__":
    main()
