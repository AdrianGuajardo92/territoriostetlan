#!/usr/bin/env python3
"""Extract addresses from Google Maps territory lists."""
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

GENDER_PATTERNS = [
    (r"(?i)\bGénero:\s*(Hombre|Mujer|Desconocido)\b", 1),
    (r"(?i)\bGenero:\s*(Hombre|Mujer|Desconocido)\b", 1),
    (r"(?i)\b(Hombre|Mujer|Desconocido)\b", 1),
]


def infer_gender(text, nombre=""):
    combined = f"{nombre} {text}"
    for pattern, group in GENDER_PATTERNS:
        m = re.search(pattern, combined)
        if m:
            val = m.group(group)
            if val.lower() in ("hombre", "mujer", "desconocido"):
                return val.capitalize() if val.lower() != "desconocido" else "Desconocido"
    return ""


def parse_saved_details(text):
    nombre = ""
    nota = ""
    genero = ""
    direccion = ""

  # Address line after location pin icon area
    addr_match = re.search(
        r"([\w\s\.\-#,°ºª/]+(?:\d+[\w\s\.\-#,°ºª/]*)?,[\s\S]*?Guadalajara,?\s*Jal\.?)",
        text,
    )
    if addr_match:
        direccion = re.sub(r"\s+", " ", addr_match.group(1)).strip()

    nombre_match = re.search(r"Nombre:\s*(.+?)(?:\n|Nota:|Género:|Genero:|$)", text, re.DOTALL)
    if nombre_match:
        nombre = nombre_match.group(1).strip()

    nota_match = re.search(r"Nota:\s*(.+?)(?:\n\n|Género:|Genero:|$)", text, re.DOTALL)
    if nota_match:
        nota = nota_match.group(1).strip()

    genero_match = re.search(r"G[eé]nero:\s*(Hombre|Mujer|Desconocido)", text, re.IGNORECASE)
    if genero_match:
        genero = genero_match.group(1).capitalize()
    else:
        genero = infer_gender(nota, nombre)

    return {
        "direccion": direccion,
        "notas": nota or nombre or "",
        "nombre": nombre,
        "genero": genero or "sin dato",
    }


def get_list_addresses(page):
    """Get address button texts from the list panel."""
    time.sleep(2)
    buttons = page.locator('div[role="main"] button').all()
    addresses = []
    for btn in buttons:
        try:
            txt = btn.inner_text(timeout=1000)
        except Exception:
            continue
        if not txt:
            continue
        # Filter map UI buttons
        skip = [
            "Atrás", "Buscar", "Cerrar", "Más opciones", "Guardar", "Compartir",
            "Contraer", "Acercar", "Alejar", "Capas", "México", "Condiciones",
            "Privacidad", "comentarios", "km", "Apps de Google", "Cuenta de Google",
            "ubicación", "Street View", "Explorar",
        ]
        if any(s in txt for s in skip):
            continue
        if "Guadalajara" in txt or re.search(r"\d{4,5}", txt):
            line = re.sub(r"\s+", " ", txt.replace("\n", " ")).strip()
            if line and line not in addresses:
                addresses.append(line)
    return addresses


def extract_place_details(page):
    time.sleep(1.5)
    # Expand saved list details if collapsed
    try:
        expand_btn = page.locator("button.CsEnBe").first
        if expand_btn.count() > 0:
            expand_btn.click(timeout=3000)
            time.sleep(0.8)
    except Exception:
        pass

    text = page.inner_text("body")
    return parse_saved_details(text)


def scrape_territory(page, territory_name, url):
    print(f"Procesando {territory_name}...", flush=True)
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    time.sleep(3)

    addresses = get_list_addresses(page)
    results = []

    for i, addr_preview in enumerate(addresses):
        try:
            # Click address in list by matching text
            btn = page.locator(f'button:has-text("{addr_preview[:30]}")').first
            btn.click(timeout=5000)
            details = extract_place_details(page)
            if not details["direccion"]:
                details["direccion"] = addr_preview
            results.append({
                "territorio": territory_name,
                "direccion": details["direccion"],
                "notas": details["notas"] if details["notas"] else (details["nombre"] if details["nombre"] else "sin dato"),
                "genero": details["genero"],
            })
            # Go back to list
            back = page.locator('button[aria-label="Atrás"], button:has-text("Atrás")').first
            if back.count() > 0:
                back.click(timeout=3000)
                time.sleep(1)
        except Exception as e:
            results.append({
                "territorio": territory_name,
                "direccion": addr_preview,
                "notas": f"error al extraer: {e}",
                "genero": "sin dato",
            })

    print(f"  -> {len(results)} direcciones", flush=True)
    return results


def main():
    all_data = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(locale="es-MX")
        page = context.new_page()

        for territory_name, url in LINKS:
            try:
                rows = scrape_territory(page, territory_name, url)
                all_data.extend(rows)
            except Exception as e:
                print(f"ERROR en {territory_name}: {e}", flush=True)
                all_data.append({
                    "territorio": territory_name,
                    "direccion": "sin dato",
                    "notas": f"error territorio: {e}",
                    "genero": "sin dato",
                })

        browser.close()

    out_path = "/Users/adrianguajardo/Developer/territoriostetlan/tmp/territorios_inventario.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"\nGuardado: {out_path}")
    print(f"Total direcciones: {len(all_data)}")


if __name__ == "__main__":
    main()
