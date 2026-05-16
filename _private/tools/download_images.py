import requests
import os
from bs4 import BeautifulSoup

# === 1. Читаем сохранённый HTML ===
HTML_FILE = "apartments.html"

with open(HTML_FILE, encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

# === 2. Ищем все объекты недвижимости ===
objects = soup.select(".t764")
print(f"Найдено объектов: {len(objects)}")

# === 3. Обрабатываем каждый объект ===
for idx, obj in enumerate(objects, 1):
    folder = f"object_{idx:02}"
    os.makedirs(folder, exist_ok=True)

    # --- 3.1 Заголовок ---
    title_tag = obj.find(["h1", "h2", "h3"])
    title = title_tag.get_text(strip=True) if title_tag else "Без названия"

    # --- 3.2 Описание ---
    descr_blocks = obj.select(".t-descr, .t764__descr")
    description = "\n\n".join(
        block.get_text("\n", strip=True)
        for block in descr_blocks
    )

    # --- 3.3 Сохраняем описание ---
    with open(f"{folder}/description.txt", "w", encoding="utf-8") as f:
        f.write(title + "\n\n" + description)

    # --- 3.4 Уникальные большие изображения ---
    image_urls = {
        div["data-original"]
        for div in obj.select('.t-slds__bgimg[data-original]')
        if "static.tildacdn.com" in div["data-original"]
    }

    # --- 3.5 Скачиваем изображения ---
    for i, img_url in enumerate(sorted(image_urls), 1):
        ext = img_url.split(".")[-1].split("?")[0]

        try:
            r = requests.get(img_url, timeout=15)
            if r.status_code == 200:
                with open(f"{folder}/img_{i:02}.{ext}", "wb") as f:
                    f.write(r.content)
        except Exception as e:
            print(f"Ошибка при скачивании {img_url}: {e}")

    print(f"{folder}: {len(image_urls)} images + description saved")

print("Готово.")
