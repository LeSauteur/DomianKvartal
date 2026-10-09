from __future__ import annotations

import html
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = "https://domian-161.ru"
TODAY = date(2026, 10, 6)
OUTPUT_DATA = ROOT / "_private" / "construction-projects.json"
PROJECTS_DIR = ROOT / "construction" / "projects"
BUILDERS_DIR = ROOT / "construction" / "builders"


BUILDERS = {
    "postroim-dom": {
        "name": "Построим Дом",
        "recordType": "built-object",
        "short": "Построенные каменные и кирпичные дома площадью 100–120 м².",
        "about": "«Построим Дом» строит дома в Ростове-на-Дону и Константиновске. Посмотрите площадь, расположение, срок строительства и особенности каждого построенного дома.",
        "geography": "Ростов-на-Дону и Ростовская область. В портфолио представлены Ростов-на-Дону и Константиновск.",
        "directions": ["Строительство домов", "Строительство по своему проекту", "Индивидуальное проектирование"],
        "packages": ["Под ключ — комплектация, указанная в карточках построенных объектов"],
        "warranty": None,
        "sourceUrl": "https://postroim-dom-rostov.ru/",
    },
    "domanstroy": {
        "name": "ДоманСтрой",
        "short": "Типовые и индивидуальные дома с несколькими уровнями комплектации.",
        "about": "Компания работает с 2014 года и построила более 200 домов. Строит в радиусе около 250 км от Ростова-на-Дону по типовым и индивидуальным проектам. Срок строительства — 6–9 месяцев, гарантия на выполненные работы — 5 лет.",
        "geography": "Ростовская область и север Краснодарского края — окончательная возможность строительства зависит от адреса участка.",
        "directions": ["Типовые проекты", "Адаптация проекта", "Индивидуальное проектирование", "Строительство под ключ"],
        "packages": ["Старт", "Стандарт", "Комфорт", "Премиум"],
        "warranty": "Гарантия на выполненные работы — 5 лет. Условия фиксируются в договоре.",
    },
    "soyuz": {
        "name": "Союз Застройщиков",
        "short": "Каталог кирпичных домов 69,9–142,2 м² в комплектации White Box.",
        "about": "Одно- и двухэтажные дома с изолированными спальнями, кухней-гостиной и комплектацией White Box. Выберите подходящую планировку и комплектацию для своей семьи.",
        "geography": "Ростов-на-Дону и Ростовская область — географию по конкретному участку необходимо подтвердить.",
        "directions": ["Типовые проекты", "Строительство на участке клиента", "White Box", "Ипотечная сделка"],
        "packages": ["White Box"],
        "warranty": "Гарантийное обслуживание — 5 лет. Условия фиксируются в договоре.",
    },
    "eqvita": {
        "name": "Эквита",
        "short": "Индивидуальная современная архитектура и проектирование под участок.",
        "about": "Компания работает с 2006 года и создаёт индивидуальные дома современной архитектуры. Состав проекта, материалы и бюджет подбираются под ваши пожелания.",
        "geography": "Желаемая локация согласуется индивидуально с учётом участка и бюджета.",
        "directions": ["Индивидуальная архитектура", "Проектирование под участок", "Современные дома", "Строительство по индивидуальному ТЗ"],
        "packages": ["Индивидуальная комплектация"],
        "warranty": "Сроки строительства и гарантии фиксируются в договоре.",
    },
}


POSTROIM_DOM_ROWS = [
    {
        "slug": "postroim-dom-konstantinovsk-110", "title": "Каменный дом 110 м2", "area": 110,
        "location": "Константиновск", "constructionDays": 180, "material": "Каменный дом", "materialKeys": [],
        "description": "Каменный дом с фасадом из кирпича. Провели все коммуникации (свет, вода). Сделали предчистовую отделку",
        "sourceRecordId": "rec3586854601",
        "sourceImage": "https://static.tildacdn.com/tild3030-3336-4637-b161-306236396536/1761971362511p9xigk7.png",
        "imageWidth": 1184, "imageHeight": 864,
    },
    {
        "slug": "postroim-dom-rostov-stone-100-120", "title": "Каменный дом 100 м2", "area": 100,
        "location": "Ростов-на-Дону", "constructionDays": 120, "material": "Каменный дом", "materialKeys": [],
        "description": "Построили каменный дом с фасадом из кирпича и необычной двухскатной кровлей. Сделали предчистовую отделку.",
        "sourceRecordId": "rec3586854701",
        "sourceImage": "https://static.tildacdn.com/tild6236-3434-4031-a436-633463616466/image_1765194405597_.png",
        "imageWidth": 1184, "imageHeight": 864,
    },
    {
        "slug": "postroim-dom-rostov-brick-110", "title": "Кирпичный дом 110 м2", "area": 110,
        "location": "Ростов-на-Дону", "constructionDays": 180, "material": "Кирпич", "materialKeys": ["brick"],
        "description": "Дом полностью из кирпича, стена толщиной в 510 мм. Необычный фасадный кирпич м300 под старину, высокий бетонный цоколь.",
        "sourceRecordId": "rec3586854801",
        "sourceImage": "https://static.tildacdn.com/tild3336-6437-4434-a161-656465623931/image_1765194513731_.png",
        "imageWidth": 1184, "imageHeight": 864,
    },
    {
        "slug": "postroim-dom-rostov-brick-100-180", "title": "Кирпичный дом 100 м2", "area": 100,
        "location": "Ростов-на-Дону", "constructionDays": 180, "bedrooms": 3, "material": "Кирпич", "materialKeys": ["brick"],
        "description": "Кирпичный дом с утеплением ППС. Три спальни, кухня гостинная и просторная терраса.",
        "sourceRecordId": "rec3586854901",
        "sourceImage": "https://static.tildacdn.com/tild6233-3062-4431-a135-336164346665/image_1765194267421_.png",
        "imageWidth": 1184, "imageHeight": 864,
    },
    {
        "slug": "postroim-dom-rostov-brick-100-90", "title": "Кирпичный дом 100 м2", "area": 100,
        "location": "Ростов-на-Дону", "constructionDays": 90, "material": "Кирпич", "materialKeys": ["brick"],
        "description": "Всего за 3 месяца построили кирпичный дом с утеплением ППС. Очень удобная планировка для вытянутого участка.",
        "sourceRecordId": "rec3586855001",
        "sourceImage": "https://static.tildacdn.com/tild6263-3531-4862-b265-623031343738/e398685cf699a072c52e.jpeg",
        "imageWidth": 1200, "imageHeight": 896,
    },
    {
        "slug": "postroim-dom-rostov-stone-120", "title": "Каменный дом 120 м2", "area": 120,
        "location": "Ростов-на-Дону", "constructionDays": 200, "material": "Каменный дом", "materialKeys": [],
        "description": "Просторный дом с кухней гостинной на 40 метров, видовым окном на лес, с цоколем под 2 метра и террасой.",
        "sourceRecordId": "rec3586855101",
        "sourceImage": "https://static.tildacdn.com/tild6163-6266-4361-b263-306339623932/f357133f84058e9a0eb2.jpeg",
        "imageWidth": 1200, "imageHeight": 896,
    },
]


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
        "description": "Современный двухэтажный дом со встроенным гаражом на два автомобиля. Жилая площадь — 107,8 м², общая площадь с террасой и крыльцом — 337 м², площадь застройки — 237,1 м².",
        "family": "Для семьи, которой нужны крупные общие пространства, гараж и индивидуальная адаптация помещений второго этажа.", "sourcePage": 5,
    },
    {
        "slug": "eqvita-02", "title": "Индивидуальный проект Эквита №2", "area": 416.6, "floors": 2,
        "description": "Индивидуальный дом 2009 года с бассейном и сложной геометрией участка. Отапливаемая площадь — 350,6 м², общая площадь — 416,6 м².",
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
            "floorPlans": [public_media(row["slug"], "plan")], "imageKind": "Визуализация проекта",
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
            "floorPlans": [public_media(slug, "plan")], "imageKind": "Визуализация проекта",
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
            "floorPlans": [public_media(row["slug"], "plan")], "imageKind": "Архитектурная визуализация",
            "sourceDocument": "архитектура (1).pdf", "sourcePage": row["sourcePage"], "factSource": "Архитектурная презентация компании",
        })
    for project in projects:
        project["recordType"] = "project"
    for row in POSTROIM_DOM_ROWS:
        projects.append({
            "id": row["slug"], "slug": row["slug"], "code": row["slug"],
            "builderId": "postroim-dom", "builder": "Построим Дом", "recordType": "built-object",
            "title": row["title"], "area": row["area"], "location": row["location"],
            "constructionDays": row["constructionDays"], "description": row["description"],
            "floors": None, "bedrooms": row.get("bedrooms"), "bathrooms": None,
            "material": row["material"], "materialKeys": row["materialKeys"], "projectType": None,
            "price": None, "priceStatus": "not-published", "priceDate": None, "pricePackage": "Под ключ",
            "scenario": None, "family": None, "features": [], "included": [], "clarify": [],
            "mainImage": public_media(row["slug"], "facade"), "gallery": [public_media(row["slug"], "facade")],
            "floorPlans": [], "imageKind": "Построенный дом",
            "imageWidth": row["imageWidth"], "imageHeight": row["imageHeight"],
            "sourceUrl": "https://postroim-dom-rostov.ru/", "sourceRecordId": row["sourceRecordId"],
            "sourceImages": [{"originalUrl": row["sourceImage"], "width": row["imageWidth"], "height": row["imageHeight"]}],
            "sourceDocument": None, "sourcePage": None,
            "factSource": "Портфолио «Наши объекты в Ростове и области» компании «Построим Дом»",
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
    if project["priceStatus"] == "not-published":
        return "Рассчитаем стоимость похожего дома."
    if project["priceStatus"] == "partner-outdated":
        return "Комплектация White Box."
    if project["priceStatus"] == "dated-confirmed":
        return f"Комплектация «{project['pricePackage']}»."
    if project["priceStatus"] == "individual":
        return "Цена формируется после согласования архитектуры, участка и комплектации."
    return ""


def price_note_markup(project: dict, tag: str) -> str:
    note = price_note(project)
    return f"<{tag}>{esc(note)}</{tag}>" if note else ""


def price_disclaimer(project: dict) -> str:
    return '<p class="price-disclaimer">Цена и наличие не являются публичной офертой</p>' if project["price"] else ""


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
    width = project.get("imageWidth", 1200) if name == "facade" else 1200
    height = project.get("imageHeight", 800) if name == "facade" else 800
    return (
        f'<picture><source media="(max-width: 640px)" srcset="{esc(relative(mobile, prefix))}">'
        f'<img src="{esc(relative(path, prefix))}" alt="{esc(alt)}" loading="{loading}" width="{width}" height="{height}"{priority}></picture>'
    )


def stage_picture(name: str, alt: str) -> str:
    sizes = {"foundation": (377, 376), "walls": (416, 353), "roof": (401, 398), "interior": (378, 377), "finished": (394, 377)}
    width, height = sizes[name]
    return f'<img src="assets/images/construction/stages/{name}.webp" alt="{esc(alt)}" loading="lazy" width="{width}" height="{height}">'


def header(prefix: str, current: str = "construction") -> str:
    # main() runs the shared synchronizer after adding all pages to the sitemap.
    return "<header></header>"


def footer(prefix: str) -> str:
    return f'''<footer class="construction-footer"><div class="container construction-footer__grid"><div><a class="construction-footer__brand" href="/">Домиан · офис «Квартал»</a><p>Подбираем участок, проект и строительную компанию, сравниваем условия и сопровождаем клиента.</p></div><nav aria-label="Навигация в подвале"><a href="{prefix}construction.html">Каталог проектов</a><a href="{prefix}lands.html">Участки</a><a href="{prefix}houses.html">Готовые дома</a><a href="/privacy.html">Политика обработки персональных данных</a><a href="/personal-data-consent.html">Согласие на обработку персональных данных</a><a href="/cookies.html">Политика cookie</a><a href="/offer.html">Пользовательское соглашение</a><a href="/details.html">Реквизиты</a></nav><div><a href="tel:+79536091122">+7 953 609-11-22</a><div class="construction-footer__channels"><a href="https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger>MAX</a><a href="https://t.me/httpsmealieva_rieltor" target="_blank" rel="noopener noreferrer">Telegram</a></div></div></div><div class="container construction-footer__legal">© 2022–2026 АН «Домиан Квартал». Информация не является публичной офертой.</div></footer>'''


def lead_form(prefix: str, project: dict | None = None, builder: dict | None = None) -> str:
    code = project["code"] if project else ""
    name = project["title"] if project else ""
    builder_name = project["builder"] if project else (builder["name"] if builder else "")
    area = area_text(project["area"]) if project else ""
    project_url = f"{SITE}/construction/projects/{project['slug']}.html" if project else ""
    selected_price_version = price_version(project) if project else ""
    desired = area if project else ""
    selection_label = "Выбран объект: " if project and project.get("recordType") == "built-object" else "Выбран проект: "
    source = "project_detail" if project else ("builder_page" if builder else "catalog")
    return f'''<section class="construction-lead" id="lead-form-section" aria-labelledby="construction-lead-title"><div class="container construction-lead__grid"><div><span class="section-kicker">Персональный расчёт</span><h2 id="construction-lead-title">Получите подборку проектов под ваш участок и бюджет</h2><p>Сравним подходящие планировки и комплектации. Заявка поступит специалисту «Домиан Квартал», а не напрямую строительной компании.</p><ul><li>Проверим, подходит ли проект участку</li><li>Соберём актуальные сметы</li><li>Сравним ипотеку и другие способы оплаты</li></ul></div><form id="lead-form" method="POST" data-lead-form data-source-cta="construction_form" data-object-type="construction" data-project-code="{esc(code)}" data-project-name="{esc(name)}" data-builder="{esc(builder_name)}" data-project-area="{esc(area)}" data-project-url="{esc(project_url)}" data-source-transition="{esc(source)}" data-price-version="{esc(selected_price_version)}">
<input type="checkbox" name="botcheck" style="display:none" aria-hidden="true"><input type="hidden" name="service" value="construction"><input type="hidden" name="project_code" value="{esc(code)}"><input type="hidden" name="project_name" value="{esc(name)}"><input type="hidden" name="builder" value="{esc(builder_name)}"><input type="hidden" name="project_area" value="{esc(area)}"><input type="hidden" name="project_url" value="{esc(project_url)}"><input type="hidden" name="source_transition" value="{esc(source)}"><input type="hidden" name="price_version" value="{esc(selected_price_version)}">
<div class="construction-form__project" data-selected-project {'hidden' if not project else ''}>{selection_label + esc(name) if project else ''}</div><div class="construction-form__grid"><div class="form-group"><label class="form-label" for="lead-area">Желаемая площадь</label><input id="lead-area" class="form-control" name="desired_area" value="{esc(desired)}" placeholder="Например, 100–120 м²"></div><div class="form-group"><label class="form-label" for="lead-plot">Участок</label><select id="lead-plot" class="form-control" name="plot_status"><option value="have">Участок уже есть</option><option value="need" selected>Нужно подобрать</option><option value="choosing">Выбираю участок</option></select></div><div class="form-group"><label class="form-label" for="lead-budget">Бюджет или способ оплаты</label><select id="lead-budget" class="form-control" name="budget_payment"><option value="" selected>Пока не определён</option><option value="cash">Собственные средства</option><option value="mortgage">Ипотека</option><option value="family_mortgage">Семейная ипотека</option><option value="mixed">Комбинированная оплата</option></select></div><div class="form-group"><label class="form-label" for="lead-name">Ваше имя</label><input id="lead-name" class="form-control" type="text" name="name" autocomplete="name" minlength="2" maxlength="80" placeholder="Иван" required></div><div class="form-group construction-form__phone"><label class="form-label" for="lead-phone">Телефон</label><input id="lead-phone" class="form-control" type="tel" name="phone" autocomplete="tel" inputmode="tel" maxlength="24" placeholder="+7 999 123-45-67" required></div></div><div class="form-consent"><input id="lead-privacy-consent" type="checkbox" name="privacy_consent" value="accepted" required><label for="lead-privacy-consent">Я даю <a href="/personal-data-consent.html" target="_blank" rel="noopener noreferrer">согласие на обработку персональных данных</a></label></div><p class="form-consent-note">Перед отправкой формы ознакомьтесь с <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Политикой обработки персональных данных</a>.</p><p class="form-status" data-form-status role="status" aria-live="polite" hidden></p><button class="submit-btn" type="submit">Получить проекты и расчёт</button></form></div></section>'''


def project_card(project: dict, prefix: str = "", compact: bool = False) -> str:
    url = f"{prefix}construction/projects/{project['slug']}.html"
    details = [area_text(project["area"])]
    if project.get("floors"):
        details.append(f"{project['floors']} этаж" if project["floors"] == 1 else f"{project['floors']} этажа")
    if project.get("bedrooms"):
        details.append(f"{project['bedrooms']} спальни")
    if project.get("bathrooms"):
        details.append(f"{project['bathrooms']} санузла" if project["bathrooms"] > 1 else "1 санузел")
    built = project.get("recordType") == "built-object"
    if built:
        details = [area_text(project["area"]), project["location"]]
    material = (f"{project['constructionDays']} дней · {project['pricePackage']}" if built else project.get("material") or "Материал по проекту")
    data = f'''data-project-card data-builder="{project['builderId']}" data-record-type="{project['recordType']}" data-area="{project['area']}" data-floors="{project.get('floors') or ''}" data-bedrooms="{project.get('bedrooms') or ''}" data-materials="{' '.join(project.get('materialKeys', []))}" data-price="{project.get('price') or ''}" data-project-type="{project['projectType'] or ''}"'''
    quote_data = f'''data-project-quote data-lead-type="construction" data-source-cta="construction_project_quote" data-object-id="{esc(project['id'])}" data-object-type="construction" data-object-title="{esc(project['title'])}" data-object-price="{esc(price_text(project))}" data-object-url="{esc(url)}" data-project-code="{esc(project['code'])}" data-project-name="{esc(project['title'])}" data-builder="{esc(project['builder'])}" data-project-area="{esc(area_text(project['area']))}" data-project-url="{esc(url)}" data-source-transition="catalog_card" data-price-version="{esc(price_version(project))}"'''
    compact_class = " is-compact" if compact else ""
    open_text = "Смотреть объект" if built else "Смотреть проект"
    return f'''<article class="construction-card{compact_class}" {data}><a class="construction-card__media" href="{url}" data-project-open>{picture(project, 'facade', project['title'] + ' — фасад', prefix)}<span>{esc(project['imageKind'])}</span></a><div class="construction-card__body"><p class="construction-card__builder">{esc(project['builder'])}</p><h3><a href="{url}" data-project-open>{esc(project['title'])}</a></h3><p class="construction-card__facts">{' · '.join(details)}</p><p class="construction-card__material">{esc(material)}</p><div class="construction-card__price"><strong>{esc(price_text(project))}</strong>{price_note_markup(project, 'small')}</div>{price_disclaimer(project)}<a class="family-mortgage__badge" href="{url}#family-mortgage">Семейная ипотека · подбор условий</a><div class="construction-card__actions"><a class="btn secondary" href="{url}" data-project-open>{open_text}</a><a class="btn" href="#lead-form-section" data-record-type="{project['recordType']}" {quote_data}>Получить расчёт</a></div></div></article>'''


def document_head(title: str, description: str, canonical: str, image_url: str, prefix: str, schema: dict | list[dict]) -> str:
    if isinstance(schema, list):
        for item in schema:
            item.pop("@context", None)
            if item.get("@type") == "Service":
                item["@id"] = canonical + "#service"
                item["provider"] = {"@id": SITE + "/#organization"}
        schema = {"@context": "https://schema.org", "@graph": schema}
    elif schema.get("@type") == "ItemList":
        service = {
            "@type": "Service", "@id": canonical + "#service", "name": "Строительство домов под ключ",
            "description": "Подбор проекта дома под участок и бюджет, сравнение комплектаций и сопровождение сделки.",
            "url": canonical, "serviceType": "Подбор проекта и сопровождение строительства дома",
            "provider": {"@id": SITE + "/#organization"},
            "areaServed": [{"@type": "City", "name": "Аксай"}, {"@type": "City", "name": "Ростов-на-Дону"}, {"@type": "AdministrativeArea", "name": "Ростовская область"}],
        }
        schema = {"@context": "https://schema.org", "@graph": [service, schema]}
    return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(canonical)}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="{esc(canonical)}"><meta property="og:image" content="{esc(image_url)}"><link rel="icon" href="{prefix}assets/hero/hero.jpg" type="image/jpeg"><link rel="stylesheet" href="{prefix}assets/css/main.css"><link rel="stylesheet" href="{prefix}assets/css/visual-premium.css"><link rel="stylesheet" href="{prefix}assets/css/construction.css?v=20261006-2"><link rel="stylesheet" href="{prefix}assets/css/family-mortgage.css"><script type="application/ld+json">{json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')}</script></head>'''


def scripts(prefix: str, catalog: bool = False, detail: bool = False) -> str:
    extra = f'<script src="{prefix}assets/js/construction-catalog.js" defer></script>' if catalog or detail else ""
    return f'''<script src="{prefix}assets/js/lead-config.js" defer></script><script src="{prefix}assets/js/main.js" defer></script><script src="{prefix}assets/js/form-handler.js" defer></script>{extra}'''


def family_mortgage_block(prefix: str = "", compact: bool = False, external: bool = False) -> str:
    target = f"{prefix}construction.html#family-mortgage" if external else "#lead-form-section"
    action = "Подобрать дом и ипотеку" if external else "Подобрать условия с брокером"
    mode = " family-mortgage--compact" if compact else ""
    return f'''<section class="family-mortgage{mode}" id="family-mortgage" aria-labelledby="family-mortgage-title"><div class="container"><div class="family-mortgage__panel"><div><span class="family-mortgage__eyebrow">Дом для семьи · помощь кредитного брокера</span><h2 class="family-mortgage__title" id="family-mortgage-title">Семейная ипотека на строительство дома</h2><p class="family-mortgage__copy">Подберём участок, проект и вариант финансирования. Кредитный брокер подаст заявки в разные банки и сравнит подходящие предложения для вашей семьи.</p></div><div class="family-mortgage__offer"><strong class="family-mortgage__rate">6%</strong><span>годовых по семейной программе*</span><span>Возможность кредита до 10 млн ₽*</span><a class="btn" href="{target}" data-lead-type="construction" data-source-cta="family_mortgage_broker" data-budget-payment="family_mortgage">{action}</a></div><p class="family-mortgage__terms">* Для нового строительства. Сумма зависит от состава семьи, программы и банка; сверх льготного лимита ставка может отличаться. Брокер уточнит требования к подрядчику и эскроу, взнос, полную стоимость кредита и срок. Решение принимает банк. Условия проверяем на дату обращения. <a href="https://minfin.gov.ru/ru/press-center/?id_4=40636-utverzhdeny_izmeneniya_v_programmu_semeinaya_ipoteka" target="_blank" rel="noopener noreferrer">О программе</a>.</p></div></div></section>'''


def catalog_page() -> str:
    canonical = f"{SITE}/construction.html"
    schema = {
        "@context": "https://schema.org", "@type": "ItemList", "name": "Проекты и построенные дома",
        "numberOfItems": len(PROJECTS), "itemListElement": [
            {"@type": "ListItem", "position": index, "url": f"{SITE}/construction/projects/{project['slug']}.html", "name": project["title"]}
            for index, project in enumerate(PROJECTS, start=1)
        ],
    }
    project_count = sum(p["recordType"] == "project" for p in PROJECTS)
    built_count = sum(p["recordType"] == "built-object" for p in PROJECTS)
    summary = f"{project_count} проектов · {built_count} построенных домов · {len(BUILDERS)} компании"
    builder_options = "".join(f'<option value="{key}">{esc(builder["name"])}</option>' for key, builder in BUILDERS.items())
    cards = "".join(project_card(project) for project in PROJECTS)
    builder_cards = "".join(
        f'''<article class="builder-card"><span>{builder_count(key)}</span><h3>{esc(builder['name'])}</h3><p>{esc(builder['short'])}</p><p>{esc(builder['geography'])}</p><a class="btn secondary" href="construction/builders/{key}.html">О компании и проектах</a></article>'''
        for key, builder in BUILDERS.items()
    )
    title = "Строительство домов под ключ в Ростове-на-Дону и Аксае | Домиан Квартал"
    description = f"{project_count} проектов и {built_count} построенных домов от {len(BUILDERS)} компаний: фотографии, площади, комплектации и подбор под участок и бюджет."
    head = document_head(title, description, canonical, f"{SITE}/{PROJECTS[4]['mainImage']}", "", schema)
    return f'''{head}<body class="construction-page construction-catalog-page">{header("")}
<main><section class="construction-hero"><div class="container construction-hero__grid"><div><span class="section-kicker">{summary}</span><h1>Строительство домов под ключ в Ростове-на-Дону, Аксае и Ростовской области</h1><p>Подберём проект под участок и бюджет, сравним комплектации застройщиков, поможем с ипотекой и сопроводим сделку.</p><div class="construction-hero__actions"><a class="btn" href="#construction-projects">Подобрать проекты</a><a class="btn secondary" href="#lead-form-section" data-lead-type="construction" data-source-cta="construction_hero_quote">Рассчитать стоимость</a></div><dl><div><dt>{project_count} + {built_count}</dt><dd>проектов и построенных домов</dd></div><div><dt>69,9–416,6 м²</dt><dd>диапазон площадей</dd></div><div><dt>1–2</dt><dd>этажа</dd></div></dl></div><div class="construction-hero__media">{picture(PROJECTS[4], 'facade', 'Проект одноэтажного дома 116 м²', '', True)}<span>Проект DS-116 · «ДоманСтрой»</span></div></div></section>
<section class="construction-filter" id="construction-projects"><div class="container"><div class="section-heading"><span class="section-kicker">Полный каталог</span><h2>Подберите дом по параметрам</h2><p>Неизвестные характеристики не выдуманы: при включении соответствующего фильтра такие проекты исключаются, но без фильтров видны все {len(PROJECTS)} карточки.</p></div><details class="construction-filter__panel" data-project-filter-panel open><summary>Фильтры подбора <span>8 параметров</span></summary><form class="construction-filter__controls" data-project-filters><label>Компания<select name="builder"><option value="">Все компании</option>{builder_options}</select></label><label>Площадь<select name="area"><option value="">Любая</option><option value="0-90">до 90 м²</option><option value="90-120">90–120 м²</option><option value="120-160">120–160 м²</option><option value="160-999">от 160 м²</option></select></label><label>Этажность<select name="floors"><option value="">Любая</option><option value="1">1 этаж</option><option value="2">2 этажа</option></select></label><label>Спальни<select name="bedrooms"><option value="">Любое число</option><option value="2">2</option><option value="3">3</option></select></label><label>Материал стен<select name="material"><option value="">Любой</option><option value="brick">Кирпич</option><option value="gazobeton">Газобетон</option></select></label><label>Стоимость<select name="price"><option value="">Любая / по запросу</option><option value="0-6000000">до 6 млн ₽</option><option value="6000000-8000000">6–8 млн ₽</option><option value="8000000-999999999">от 8 млн ₽</option></select></label><label>Вид карточки<select name="recordType"><option value="">Все варианты</option><option value="project">Проекты домов</option><option value="built-object">Построенные дома</option></select></label><label>Тип проекта<select name="projectType"><option value="">Любой</option><option value="typical">Типовой</option><option value="individual">Индивидуальный</option></select></label><button type="reset" class="construction-filter__reset">Сбросить</button></form></details><div class="construction-filter__status" role="status" aria-live="polite"><strong data-project-count>{len(PROJECTS)}</strong> вариантов</div><noscript><p class="construction-noscript">JavaScript отключён — все варианты показаны без фильтрации.</p></noscript><div class="construction-grid" data-project-grid>{cards}</div><p class="construction-empty" data-project-empty hidden>По выбранным параметрам вариантов не найдено. Сбросьте один из фильтров или оставьте заявку — проверим индивидуальные варианты.</p></div></section>
<section class="construction-section construction-builders"><div class="container"><div class="section-heading"><span class="section-kicker">Партнёрские компании</span><h2>Сравните подходы к строительству</h2><p>«Домиан Квартал» не строит дома: мы подбираем проект и партнёрскую компанию, сравниваем предложения и сопровождаем клиента.</p></div><div class="builder-grid">{builder_cards}</div><div class="construction-table-wrap"><table><thead><tr><th>Компания</th><th>Формат</th><th>Комплектации</th><th>География</th><th>Цена</th></tr></thead><tbody><tr><th>ДоманСтрой</th><td>Типовые и индивидуальные проекты</td><td>Старт, Стандарт, Комфорт, Премиум</td><td>Ростовская область, север Краснодарского края</td><td></td></tr><tr><th>Союз Застройщиков</th><td>Типовые дома 69,9–142,2 м²</td><td>White Box</td><td>Уточняется по участку</td><td></td></tr><tr><th>Эквита</th><td>Индивидуальная современная архитектура</td><td>Индивидуально</td><td>По согласованию</td><td>Индивидуальный расчёт</td></tr><tr><th>Построим Дом</th><td>Портфолио построенных домов 100–120 м²</td><td>Под ключ — по карточкам объектов</td><td>Ростов-на-Дону, Константиновск</td><td>Рассчитаем стоимость похожего дома</td></tr></tbody></table></div></div></section>
<section class="construction-section construction-packages"><div class="container"><div class="section-heading"><span class="section-kicker">Комплектации</span><h2>Сравнивайте не только цену, но и состав работ</h2></div><div class="package-grid"><article><span>ДоманСтрой</span><h3>Старт</h3><p>Фундамент, стены, кровля, окна и входная дверь. Конструктив и точные материалы фиксируются в смете.</p></article><article><span>ДоманСтрой</span><h3>Комфорт</h3><p>К базовому конструктиву добавляются фасадный кирпич, электрика, сантехника, тёплый пол, радиаторы, котёл, штукатурка и стяжка.</p></article><article><span>ДоманСтрой</span><h3>Премиум</h3><p>Расширенный конструктив, двухкамерные окна, мягкая кровля и более полный состав инженерной подготовки.</p></article><article><span>Союз Застройщиков</span><h3>White Box</h3><p>Коробка с фасадом, кровлей, окнами и дверью; разводка коммуникаций, отопление, штукатурка под маяк и стяжка пола.</p></article></div><p class="construction-disclaimer">Названия комплектаций не гарантируют одинаковый состав у разных компаний. Сравнивайте спецификации построчно в актуальных сметах.</p></div></section>
<section class="construction-section construction-stages"><div class="container"><div class="section-heading"><span class="section-kicker">Реальная стройка</span><h2>Путь от участка до готового дома</h2></div><ol><li><strong>01</strong><span>Проверка участка и посадка проекта</span></li><li>{stage_picture('foundation', 'Устройство фундамента дома')}<div><strong>02</strong><span>Фундамент и вводы коммуникаций</span></div></li><li>{stage_picture('walls', 'Возведение кирпичных стен дома')}<div><strong>03</strong><span>Коробка, проёмы и перекрытия</span></div></li><li>{stage_picture('roof', 'Дом после монтажа кровли')}<div><strong>04</strong><span>Кровля и закрытие контура</span></div></li><li>{stage_picture('interior', 'Внутренние инженерные и отделочные работы')}<div><strong>05</strong><span>Инженерия и отделка по комплектации</span></div></li><li>{stage_picture('finished', 'Готовый одноэтажный кирпичный дом')}<div><strong>06</strong><span>Приёмка и передача дома</span></div></li></ol></div></section>
<div id="construction-mortgage">{family_mortgage_block()}</div>
<section class="construction-section construction-roles"><div class="container"><div class="section-heading"><span class="section-kicker">Кто за что отвечает</span><h2>Понятные роли до подписания договора</h2></div><div class="roles-grid"><article><span>Домиан Квартал</span><h3>Подбор и сопровождение</h3><p>Помогаем выбрать участок, проект и строительную компанию, сравниваем условия, организуем ипотечный и сделочный маршрут.</p></article><article><span>Строительная компания</span><h3>Проект и строительство</h3><p>Отвечает за проектную документацию, смету, сроки, материалы, стройку, гарантии и сдачу результата по договору.</p></article><article><span>Клиент</span><p>Предоставляет документы по участку, согласует бюджет, проект, комплектацию и принимает этапы работ.</p></article></div></div></section>
<section class="construction-section construction-help"><div class="container"><div class="section-heading"><span class="section-kicker">Наша помощь</span><h2>Сведём предложения компаний к одному формату</h2></div><div class="help-grid"><article><strong>01</strong><h3>Проверим участок</h3><p>Назначение земли, ограничения, подъезд, коммуникации и посадка дома.</p><a href="guides/chto-proverit-pered-pokupkoy-uchastka-v-aksaye.html">12 шагов проверки участка →</a></article><article><strong>02</strong><h3>Сравним сметы</h3><p>Разделим конструктив, инженерию, отделку и то, что оплачивается отдельно.</p></article><article><strong>03</strong><h3>Проверим договор</h3><p>Сроки, цена, гарантии, порядок приёмки и ответственность сторон.</p></article><article><strong>04</strong><h3>Сопроводим расчёты</h3><p>Ипотека или собственные средства — без подмены рекламным ежемесячным платежом.</p></article></div></div></section>
<section class="construction-section construction-faq"><div class="container"><div class="section-heading"><span class="section-kicker">Вопросы и ответы</span><h2>Что важно уточнить до выбора проекта</h2></div><div class="faq-list"><details><summary>Цена в карточке окончательная?</summary><p>Стоимость указана для комплектации проекта. Итоговый расчёт учитывает участок, выбранные материалы и пожелания к отделке.</p></details><details><summary>Можно ли изменить планировку?</summary><p>Возможность зависит от конструктивной схемы. «ДоманСтрой» указывает адаптацию типовых и работу с индивидуальными проектами; «Эквита» специализируется на индивидуальной архитектуре.</p></details><details><summary>Если участка ещё нет?</summary><p>Подберём участок параллельно с проектом, чтобы заранее проверить пятно застройки, подъезд и стоимость коммуникаций.</p></details><details><summary>Кто будет строить дом?</summary><p>Строительство выполняет компания, указанная в карточке проекта. «Домиан Квартал» помогает выбрать и сравнить партнёров и сопровождает клиента.</p></details><details><summary>Можно ли использовать ипотеку?</summary><p>Кредитный брокер подаст заявки в разные банки и сравнит предложения, включая семейную ипотеку на новое строительство. Доступность программы, сумму, ставку и платёж проверяем для вашей семьи на дату обращения.</p></details></div></div></section>
{lead_form("")}</main>{footer("")}{scripts("", catalog=True)}</body></html>'''


def similar_projects(project: dict) -> list[dict]:
    pool = [p for p in PROJECTS if p["slug"] != project["slug"]]
    return sorted(pool, key=lambda p: (p["builderId"] != project["builderId"], abs(float(p["area"]) - float(project["area"]))))[:3]


def builder_count(builder_id: str) -> str:
    items = [p for p in PROJECTS if p["builderId"] == builder_id]
    count = len(items)
    built = BUILDERS[builder_id].get("recordType") == "built-object"
    forms = ("построенный дом", "построенных дома", "построенных домов") if built else ("проект", "проекта", "проектов")
    form = forms[2] if 11 <= count % 100 <= 14 else forms[0] if count % 10 == 1 else forms[1] if 2 <= count % 10 <= 4 else forms[2]
    return f"{count} {form}"


def built_object_page(project: dict) -> str:
    prefix = "../../"
    canonical = f"{SITE}/construction/projects/{project['slug']}.html"
    title = project["title"].replace(" м2", " м²")
    page_name = f"{title} · {project['location']} · {project['constructionDays']} дней"
    page_title = f"{page_name} | Построим Дом — Домиан Квартал"
    meta = f"Построенный объект «Построим Дом»: {title.lower()}, {project['location']}, {project['constructionDays']} дней. Фотография, комплектация и описание из портфолио компании."
    breadcrumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Главная", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Строительство домов", "item": SITE + "/construction.html"},
        {"@type": "ListItem", "position": 3, "name": "Построим Дом", "item": SITE + "/construction/builders/postroim-dom.html"},
        {"@type": "ListItem", "position": 4, "name": page_name, "item": canonical},
    ]}
    webpage = {
        "@type": "WebPage", "@id": canonical + "#webpage", "url": canonical,
        "name": page_name, "description": project["description"],
        "primaryImageOfPage": {"@type": "ImageObject", "url": SITE + "/" + project["mainImage"],
                               "width": project["imageWidth"], "height": project["imageHeight"]},
    }
    head = document_head(page_title, meta, canonical, SITE + "/" + project["mainImage"], prefix, [breadcrumbs, webpage])
    facts = [("Площадь", area_text(project["area"])), ("Местоположение", project["location"]),
             ("Срок строительства", f"{project['constructionDays']} дней"), ("Комплектация", project["pricePackage"])]
    if project.get("bedrooms") is not None:
        facts.append(("Спальни", project["bedrooms"]))
    fact_html = "".join(f"<div><dt>{esc(label)}</dt><dd>{esc(value)}</dd></div>" for label, value in facts)
    quote_data = f'''data-project-quote data-record-type="built-object" data-lead-type="construction" data-source-cta="construction_built_object_quote" data-object-id="{esc(project['id'])}" data-object-type="construction" data-object-title="{esc(project['title'])}" data-object-url="{canonical}" data-project-code="{esc(project['code'])}" data-project-name="{esc(project['title'])}" data-builder="{esc(project['builder'])}" data-project-area="{esc(area_text(project['area']))}" data-project-url="{canonical}" data-source-transition="built_object_detail" data-price-version="по запросу"'''
    similar = "".join(project_card(item, prefix, compact=True) for item in similar_projects(project))
    photo = picture(project, "facade", f"{title}, {project['location']} — фотография построенного дома", prefix, True)
    source_url = project["sourceUrl"] + "#" + project["sourceRecordId"]
    return f'''{head}<body class="construction-page construction-detail-page is-built-object" data-project-detail data-project-id="{esc(project['id'])}" data-builder="postroim-dom">{header(prefix)}
<main><nav class="container construction-breadcrumbs" aria-label="Хлебные крошки"><a href="/">Главная</a><span>→</span><a href="{prefix}construction.html">Строительство домов</a><span>→</span><a href="../builders/postroim-dom.html">Построим Дом</a><span>→</span><span>{esc(title)}</span></nav>
<section class="project-hero"><div class="container project-hero__grid"><div class="project-hero__media">{photo}<span>Построенный дом · фото компании</span></div><div class="project-hero__content"><p class="project-hero__builder"><a href="../builders/postroim-dom.html">Построим Дом</a></p><h1>{esc(title)} · {esc(project['location'])}</h1><p class="built-object__duration">Срок строительства — {project['constructionDays']} дней</p><p class="project-hero__lead">{esc(project['description'])}</p><div class="project-hero__actions"><a class="btn" href="#lead-form-section" {quote_data}>Рассчитать похожий дом</a><a class="btn secondary" href="tel:+79536091122">Позвонить</a></div><p class="project-hero__disclaimer">Построенный объект из портфолио компании. Стоимость и срок нового строительства определяются отдельно под ваш участок и комплектацию.</p></div></div></section>
{family_mortgage_block(prefix, compact=True)}<section class="project-facts"><div class="container"><dl>{fact_html}</dl><p class="project-source"><a href="{prefix}{project['mainImage']}" target="_blank" rel="noopener noreferrer">Открыть фотографию целиком</a> · <a href="{esc(source_url)}" target="_blank" rel="noopener noreferrer">Объект на сайте строительной компании</a></p></div></section>
<section class="construction-section project-builder"><div class="container project-builder__grid"><div><span class="section-kicker">Строительная компания</span><h2>Построим Дом</h2><p>{esc(BUILDERS['postroim-dom']['about'])}</p><a class="btn secondary" href="../builders/postroim-dom.html">Все построенные дома компании</a></div><dl><div><dt>Комплектация этого объекта</dt><dd>{esc(project['pricePackage'])}</dd></div><div><dt>Стоимость объекта</dt><dd>Стоимость по запросу</dd></div></dl></div></section>
{lead_form(prefix, project=project)}<section class="construction-section project-similar"><div class="container"><div class="section-heading"><span class="section-kicker">Портфолио компании</span><h2>Другие построенные дома</h2></div><div class="construction-grid is-similar">{similar}</div><a class="project-similar__all" href="{prefix}construction.html#construction-projects">Смотреть весь каталог →</a></div></section></main>{footer(prefix)}{scripts(prefix, detail=True)}</body></html>'''


def project_page(project: dict) -> str:
    if project["recordType"] == "built-object":
        return built_object_page(project)
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
        f'''<figure>{picture(project, 'facade' if index == 1 else f'facade-{index}', f"{project['title']} — вариант фасада {index}", prefix, index == 1)}<figcaption>Визуализация фасада, вариант {index}</figcaption></figure>'''
        for index, _ in enumerate(project["gallery"], start=1)
    )
    similar = "".join(project_card(item, prefix, compact=True) for item in similar_projects(project))
    quote_data = f'''data-project-quote data-lead-type="construction" data-source-cta="construction_project_detail_quote" data-object-id="{esc(project['id'])}" data-object-type="construction" data-object-title="{esc(project['title'])}" data-object-price="{esc(price_text(project))}" data-object-url="{esc(canonical)}" data-project-code="{esc(project['code'])}" data-project-name="{esc(project['title'])}" data-builder="{esc(project['builder'])}" data-project-area="{esc(area_text(project['area']))}" data-project-url="{esc(canonical)}" data-source-transition="project_detail" data-price-version="{esc(price_version(project))}"'''
    return f'''{head}<body class="construction-page construction-detail-page" data-project-detail data-project-id="{esc(project['id'])}" data-builder="{esc(project['builderId'])}">{header(prefix)}<main><nav class="container construction-breadcrumbs" aria-label="Хлебные крошки"><a href="/">Главная</a><span>→</span><a href="{prefix}construction.html">Строительство домов</a><span>→</span><span>{esc(project['title'])}</span></nav><section class="project-hero"><div class="container project-hero__grid"><div class="project-hero__media">{picture(project, 'facade', project['title'] + ' — фасад', prefix, True)}<span>{esc(project['imageKind'])}</span></div><div class="project-hero__content"><p class="project-hero__builder"><a href="../builders/{project['builderId']}.html">{esc(project['builder'])}</a></p><h1>{esc(project['title'])}, {esc(area_text(project['area']))} — проект дома в {region}</h1><p class="project-hero__lead">{esc(project['description'])}</p><div class="project-hero__price"><strong>{esc(price_text(project))}</strong>{price_note_markup(project, 'span')}</div><div class="project-hero__actions"><a class="btn" href="#lead-form-section" {quote_data}>Получить расчёт проекта</a><a class="btn secondary" href="tel:+79536091122">Позвонить</a></div><p class="project-hero__disclaimer">Окончательная стоимость определяется после проверки участка, комплектации и актуальной сметы. Не является публичной офертой.</p></div></div></section>{family_mortgage_block(prefix, compact=True)}<section class="project-facts"><div class="container"><dl>{fact_html}</dl></div></section><section class="construction-section project-gallery"><div class="container"><div class="section-heading"><span class="section-kicker">Фасады</span><h2>Архитектура проекта</h2><p>Изображения показывают визуализацию проекта, а не фотографии построенного дома.</p></div><div class="project-gallery__grid">{gallery}</div></div></section><section class="construction-section project-plan"><div class="container project-plan__grid"><div><span class="section-kicker">Планировка</span><h2>Как организовано пространство</h2><p>{esc(project['scenario'])}</p><ul>{features}</ul></div><figure>{picture(project, 'plan', f"Планировка {project['title']} площадью {area_text(project['area'])}", prefix)}<figcaption>Точные размеры — в проектной документации.</figcaption></figure></div></section><section class="construction-section project-living"><div class="container project-living__grid"><article><span class="section-kicker">Сценарий проживания</span><h2>Дом для повседневной жизни</h2><p>{esc(project['scenario'])}</p></article><article><span class="section-kicker">Для кого</span><h2>Какой семье подойдёт</h2><p>{esc(project['family'])}</p></article></div></section><section class="construction-section project-builder"><div class="container project-builder__grid"><div><span class="section-kicker">Строительная компания</span><h2>{esc(project['builder'])}</h2><p>{esc(BUILDERS[project['builderId']]['about'])}</p><p>{esc(BUILDERS[project['builderId']]['geography'])}</p><a class="btn secondary" href="../builders/{project['builderId']}.html">Все проекты компании</a></div><dl><div><dt>Комплектация</dt><dd>{esc(project['pricePackage'])}</dd></div><div><dt>Гарантия</dt><dd>{esc(BUILDERS[project['builderId']]['warranty'])}</dd></div></dl></div></section><section class="construction-section project-package"><div class="container"><div class="section-heading"><span class="section-kicker">Состав предложения</span><h2>Что входит и что уточнить отдельно</h2></div><div class="project-package__grid"><article><ul>{included}</ul></article><article><h3>Нужно уточнить в актуальной смете</h3><ul>{clarify}</ul></article></div><div class="project-price-note"><strong>{esc(price_text(project))}</strong>{price_note_markup(project, 'p')}</div></div></section>{lead_form(prefix, project=project)}<section class="construction-section project-similar"><div class="container"><div class="section-heading"><span class="section-kicker">Похожие варианты</span><h2>Сравните с соседними площадями</h2></div><div class="construction-grid is-similar">{similar}</div><a class="project-similar__all" href="{prefix}construction.html#construction-projects">Смотреть весь каталог →</a></div></section></main>{footer(prefix)}{scripts(prefix, detail=True)}</body></html>'''


def builder_page(builder_id: str, builder: dict) -> str:
    prefix = "../../"
    items = [p for p in PROJECTS if p["builderId"] == builder_id]
    built = builder.get("recordType") == "built-object"
    catalogue_label = "Построенные дома" if built else "Проекты домов"
    item_note = "Карточки содержат фотографии и фактические характеристики из портфолио компании." if built else "Все карточки ведут на отдельные индексируемые страницы с планировкой и формой расчёта."
    source_note = f'<p class="project-source"><a href="{esc(builder["sourceUrl"])}" target="_blank" rel="noopener noreferrer">Сайт застройщика</a></p>' if built else ""
    warranty_note = f'<p>{esc(builder["warranty"])}</p>' if builder.get("warranty") else ""
    canonical = f"{SITE}/construction/builders/{builder_id}.html"
    title = f"{builder['name']} — {catalogue_label.lower()} и комплектации | Домиан Квартал"
    description = f"{catalogue_label} компании {builder['name']}: {builder_count(builder_id)}, площади, комплектации и характеристики."
    schema = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Главная", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Строительство домов", "item": f"{SITE}/construction.html"},
        {"@type": "ListItem", "position": 3, "name": builder["name"], "item": canonical},
    ]}
    cards = "".join(project_card(project, prefix) for project in items)
    directions = "".join(f"<li>{esc(value)}</li>" for value in builder["directions"])
    packages = "".join(f"<li>{esc(value)}</li>" for value in builder["packages"])
    head = document_head(title, description, canonical, f"{SITE}/{items[0]['mainImage']}", prefix, schema)
    return f'''{head}<body class="construction-page builder-detail-page">{header(prefix)}<main><nav class="container construction-breadcrumbs" aria-label="Хлебные крошки"><a href="/">Главная</a><span>→</span><a href="{prefix}construction.html">Строительство домов</a><span>→</span><span>{esc(builder['name'])}</span></nav><section class="builder-hero"><div class="container builder-hero__grid"><div><span class="section-kicker">Строительная компания</span><h1>{esc(builder['name'])}: {catalogue_label.lower()} в Ростовской области</h1><p>{esc(builder['about'])}</p>{source_note}<div class="builder-hero__actions"><a class="btn" href="#builder-projects">{catalogue_label}</a><a class="btn secondary" href="#lead-form-section" data-lead-type="construction" data-source-cta="construction_builder_quote" data-builder="{esc(builder['name'])}">Подобрать проект</a></div></div>{picture(items[0], 'facade', f"Проект строительной компании {builder['name']}", prefix, True)}</div></section>{family_mortgage_block(prefix, compact=True)}<section class="construction-section builder-about"><div class="container builder-about__grid"><article><span class="section-kicker">География</span><h2>Где работает компания</h2><p>{esc(builder['geography'])}</p></article><article><span class="section-kicker">Направления</span><h2>Что можно подобрать</h2><ul>{directions}</ul></article><article><span class="section-kicker">Комплектации</span><h2>Форматы предложения</h2><ul>{packages}</ul>{warranty_note}</article></div></section><section class="construction-filter" id="builder-projects"><div class="container"><div class="section-heading"><span class="section-kicker">{builder_count(builder_id)}</span><h2>Каталог {esc(builder['name'])}</h2><p>{item_note}</p></div><div class="construction-grid">{cards}</div></div></section>{lead_form(prefix, builder=builder)}</main>{footer(prefix)}{scripts(prefix, detail=True)}</body></html>'''


def write_json() -> None:
    OUTPUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_DATA.write_text(json.dumps({"generatedAt": TODAY.isoformat(), "builders": BUILDERS, "projects": PROJECTS}, ensure_ascii=False, indent=2), encoding="utf-8")


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


def sync_mortgage_entry_points() -> None:
    for name, anchor in [("index.html", '<div class="ui-blocks-wrapper">'), ("houses.html", '<main>')]:
        path = ROOT / name
        content = path.read_text(encoding="utf-8")
        css = '<link rel="stylesheet" href="/assets/css/family-mortgage.css">'
        if css not in content:
            content = content.replace("</head>", css + "\n</head>", 1)
        block = '<!-- family-mortgage:start -->' + family_mortgage_block(compact=True, external=True) + '<!-- family-mortgage:end -->'
        start = content.find('<!-- family-mortgage:start -->')
        if start >= 0:
            end = content.index('<!-- family-mortgage:end -->', start) + len('<!-- family-mortgage:end -->')
            content = content[:start] + block + content[end:]
        else:
            assert anchor in content, name
            content = content.replace(anchor, block + "\n" + anchor, 1)
        path.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    BUILDERS_DIR.mkdir(parents=True, exist_ok=True)
    write_json()
    sync_mortgage_entry_points()
    catalog_html = catalog_page().replace(
        "<h1>Строительство домов под ключ в Ростове-на-Дону, Аксае и Ростовской области</h1>",
        '<h1><span class="construction-hero__title-main">Строительство<br>домов под ключ</span>'
        '<span class="construction-hero__title-location">в Ростове-на-Дону, Аксае<br>и Ростовской области</span></h1>',
    )
    (ROOT / "construction.html").write_text(catalog_html.replace("</section>\n", "</section>"), encoding="utf-8", newline="\n")
    for project in PROJECTS:
        (PROJECTS_DIR / f"{project['slug']}.html").write_text(project_page(project).replace("</section>\n", "</section>"), encoding="utf-8", newline="\n")
    for builder_id, builder in BUILDERS.items():
        (BUILDERS_DIR / f"{builder_id}.html").write_text(builder_page(builder_id, builder).replace("</section>\n", "</section>"), encoding="utf-8", newline="\n")
    update_sitemap()
    subprocess.run(["node", str(ROOT / "_tools" / "sync-public-header.mjs")], cwd=ROOT, check=True)
    print(f"Generated {len(PROJECTS)} project pages, {len(BUILDERS)} builder pages and construction.html")


if __name__ == "__main__":
    main()
