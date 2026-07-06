#!/usr/bin/env python3
"""Extract addresses from Google Maps territory lists - v3."""
import json
import re
import time
from playwright.sync_api import sync_playwright

LINKS = [
    ("Territorio 1", "https://maps.app.goo.gl/bGkKFCqLyuF2UDMTA"),
    ("Territorio 2", "https://maps.app.goo.gl/YTsgbKxbj9FBQzDg8"),
    ("Territorio 3", "https://maps.app.goo.gl/tg21Q1v7iMBnz6Ho8"),
    ("Territorio 4", "https://maps.app.goo.gl/B1N1ufMrfapk87GB8"),
    ("Territorio 5", "https://maps.app.goo.gl/JDN9eFUcFB8zNY9C7"),
    ("Territorio 6", "https://maps.app.goo.gl/iXTsVYkfD2QbjmY17"),
    ("Territorio 7", "https://maps.app.goo.gl/7Htm1xD59qmTFFrv6"),
    ("Territorio 8", "https://maps.app.goo.gl/mV6cqAjRSazGehv56"),
    ("Territorio 9", "https://maps.app.goo.gl/Fvp3fLqiDKWd22WFA"),
    ("Territorio 10", "https://maps.app.goo.gl/xorCKcPCbrfjxneG6"),
    ("Territorio 11", "https://maps.app.goo.gl/DkuBABj7U13FGNey9"),
    ("Territorio 12", "https://maps.app.goo.gl/JV71yERnNagHT65r7"),
    ("Territorio 13", "https://maps.app.goo.gl/99JJYBW3XuzknDqz6"),
    ("Territorio 14", "https://maps.app.goo.gl/oikN3LoiUiV3iAfE7"),
    ("Territorio 15", "https://maps.app.goo.gl/W65je4zycSdWS7zA8"),
    ("Territorio 16", "https://maps.app.goo.gl/uThxtoEZzQnZ4K228"),
    ("Territorio 17", "https://maps.app.goo.gl/ciZmcEPit7nm4dMX7"),
    ("Territorio 18", "https://maps.app.goo.gl/vgfiYHZVxYs8ttQ58"),
    ("Territorio 19", "https://maps.app.goo.gl/sEdQvuHeyLuNeruF7"),
    ("Territorio 20", "https://maps.app.goo.gl/WJc7nYXGGYBnUUxLA"),
    ("Territorio 21", "https://maps.app.goo.gl/1DWLD8ejkScEKBMC6"),
]

CITY_PATTERN = re.compile(r"Guadalajara|Tonalá|Tlaquepaque|Coyula|Jal\.", re.I)


def get_address_locator(page):
    """Buttons inside saved-list rows."""
    loc = page.locator("div.ZSOIif button")
    if loc.count() == 0:
        loc = page.locator("button").filter(has_text=CITY_PATTERN)
    return loc


def expand_saved_details(page):
    for selector in ["button.CsEnBe", "button:has-text('Guardado en')", "button:has-text('Guardada en')"]:
        btn = page.locator(selector).first
        if btn.count() > 0:
            try:
                btn.click(timeout=3000)
                time.sleep(0.8)
                # click again if still collapsed (arrow visible)
                if btn.count() > 0:
                    txt = btn.inner_text(timeout=1000)
                    if "Nombre:" in txt and "Nota:" not in txt and "..." in txt:
                        btn.click(timeout=3000)
                        time.sleep(0.8)
            except Exception:
                pass
            break


def parse_place_panel(text, fallback_addr=""):
    direccion = ""
    nombre = ""
    nota = ""
    genero = ""

    addr_match = re.search(
        r"([\w\s\.\-#,°ºª/áéíóúÁÉÍÓÚñÑ]+?\d+[\w\s\.\-#,°ºª/áéíóúÁÉÍÓÚñÑ]*,[\s\S]*?(?:Guadalajara|Tonalá|Tlaquepaque|Coyula)[,\s]+(?:Jal\.?|Jalisco))",
        text,
    )
    if addr_match:
        direccion = re.sub(r"\s+", " ", addr_match.group(1)).strip()

    nombre_match = re.search(r"Nombre:\s*(.+?)(?:\n|Nota:|Género:|Genero:|$)", text)
    if nombre_match:
        nombre = nombre_match.group(1).strip().rstrip(".")

    nota_match = re.search(
        r"Nota:\s*(.+?)(?:\n\n|Género:|Genero:|Nombre:|Guardado en|Guardada en|Indicaciones|Cómo llegar|$)",
        text,
        re.DOTALL,
    )
    if nota_match:
        nota = re.sub(r"\s+", " ", nota_match.group(1).strip())

    genero_match = re.search(r"G[eé]nero:\s*(Hombre|Mujer|Desconocido)", text, re.IGNORECASE)
    if genero_match:
        genero = genero_match.group(1).capitalize()
    elif re.search(r"\bDesconocido\b", nombre, re.I):
        genero = "Desconocido"

    notes_parts = []
    if nombre:
        notes_parts.append(f"Nombre: {nombre}")
    if nota and nota.lower() not in ("sin datos", ""):
        notes_parts.append(f"Nota: {nota}")

    return {
        "direccion": direccion or fallback_addr,
        "notas": " | ".join(notes_parts) if notes_parts else "sin dato",
        "genero": genero or "sin dato",
    }


def scrape_territory(page, territory_name, url):
    print(f"Procesando {territory_name}...", flush=True)
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    time.sleep(4)

    loc = get_address_locator(page)
    count = loc.count()
    if count == 0:
        print("  0 direcciones", flush=True)
        return []

    previews = []
    for i in range(count):
        try:
            previews.append(loc.nth(i).inner_text(timeout=3000).replace("\n", " ").strip())
        except Exception:
            previews.append("")

    print(f"  {count} direcciones", flush=True)
    results = []

    for i in range(count):
        preview = previews[i]
        try:
            loc.nth(i).click(timeout=10000)
            time.sleep(2)
            expand_saved_details(page)
            text = page.inner_text("body")
            parsed = parse_place_panel(text, preview)
            results.append({
                "territorio": territory_name,
                "direccion": parsed["direccion"],
                "notas": parsed["notas"],
                "genero": parsed["genero"],
            })
            print(f"    [{i+1}/{count}] {parsed['direccion'][:60]}", flush=True)
        except Exception as e:
            results.append({
                "territorio": territory_name,
                "direccion": preview or "sin dato",
                "notas": "sin dato",
                "genero": "sin dato",
            })
            print(f"    [{i+1}/{count}] ERROR: {e}", flush=True)

    return results


def main():
    all_data = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(
            locale="es-MX", viewport={"width": 1280, "height": 900}
        ).new_page()

        for territory_name, url in LINKS:
            try:
                all_data.extend(scrape_territory(page, territory_name, url))
            except Exception as e:
                print(f"ERROR {territory_name}: {e}", flush=True)

        browser.close()

    out_json = "/Users/adrianguajardo/Developer/territoriostetlan/tmp/territorios_inventario.json"
    out_tsv = "/Users/adrianguajardo/Developer/territoriostetlan/tmp/territorios_inventario.tsv"

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    with open(out_tsv, "w", encoding="utf-8") as f:
        f.write("Territorio\tDirección\tNotas\tGénero\n")
        prev = None
        for row in all_data:
            if row["territorio"] != prev:
                prev = row["territorio"]
                f.write(f"\n=== {prev} ===\n")
            f.write(
                f"{row['territorio']}\t{row['direccion']}\t{row['notas']}\t{row['genero']}\n"
            )

    print(f"\nTotal: {len(all_data)} direcciones")
    print(f"JSON: {out_json}")
    print(f"TSV: {out_tsv}")


if __name__ == "__main__":
    main()
