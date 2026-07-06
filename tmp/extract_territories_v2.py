#!/usr/bin/env python3
"""Extract addresses from Google Maps territory lists - v2."""
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

SKIP_BUTTON_TEXT = {
    "Atrás", "Buscar", "Cerrar", "Más opciones", "Guardar", "Compartir",
    "Contraer", "Acercar", "Alejar", "Capas", "México", "Condiciones",
    "Privacidad", "comentarios", "Apps de Google", "Cuenta de Google",
    "ubicación", "Street View", "Explorar", "Indicaciones", "Cerca",
    "Enviar al teléfono", "Sugerir", "Agregar", "historial", "Fotos",
}


def is_address_button(text):
    if not text or len(text) < 10:
        return False
    if any(s in text for s in SKIP_BUTTON_TEXT):
        return False
    if "Compartir" in text and "Nombre:" in text:
        return False
    return bool(re.search(r"\d{4,5}", text) or "Guadalajara" in text or "Tonalá" in text or "Tlaquepaque" in text or "Coyula" in text)


def get_list_buttons(page):
    time.sleep(2.5)
    buttons = page.locator('div[role="main"] button').all()
    result = []
    for btn in buttons:
        try:
            txt = btn.inner_text(timeout=2000).strip()
        except Exception:
            continue
        if is_address_button(txt):
            line = re.sub(r"\s+", " ", txt.replace("\n", " ")).strip()
            result.append((btn, line))
    return result


def parse_place_panel(text):
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
        nombre = nombre_match.group(1).strip()

    nota_match = re.search(r"Nota:\s*(.+?)(?:\n\n|Género:|Genero:|Nombre:|Guardado en|Indicaciones|$)", text, re.DOTALL)
    if nota_match:
        nota = nota_match.group(1).strip()
        nota = re.sub(r"\n+", " ", nota).strip()

    genero_match = re.search(r"G[eé]nero:\s*(Hombre|Mujer|Desconocido)", text, re.IGNORECASE)
    if genero_match:
        genero = genero_match.group(1).capitalize()
    elif re.search(r"\bDesconocido\b", nombre, re.I):
        genero = "Desconocido"

  # Build notes: combine nombre + nota as stored in Maps
    notes_parts = []
    if nombre and nombre.lower() != "sin datos":
        notes_parts.append(f"Nombre: {nombre}")
    if nota and nota.lower() not in ("sin datos", ""):
        notes_parts.append(f"Nota: {nota}")
    elif nombre:
        if not notes_parts:
            notes_parts.append(f"Nombre: {nombre}")
    notas_final = " | ".join(notes_parts) if notes_parts else "sin dato"

    return {
        "direccion": direccion,
        "notas": notas_final,
        "genero": genero or "sin dato",
    }


def extract_one_address(page, url, index, fallback_addr):
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    time.sleep(3)
    buttons = get_list_buttons(page)
    if index >= len(buttons):
        return {
            "direccion": fallback_addr,
            "notas": "sin dato",
            "genero": "sin dato",
        }

    _, preview = buttons[index]
    try:
        buttons[index][0].click(timeout=8000)
    except Exception:
        # retry with fresh locator by index
        btns = get_list_buttons(page)
        if index < len(btns):
            btns[index][0].click(timeout=8000)
        else:
            return {"direccion": fallback_addr or preview, "notas": "sin dato", "genero": "sin dato"}

    time.sleep(2)
    try:
        expand = page.locator("button.CsEnBe").first
        if expand.count() > 0:
            expand.click(timeout=5000)
            time.sleep(1)
    except Exception:
        pass

    text = page.inner_text("body")
    parsed = parse_place_panel(text)
    if not parsed["direccion"]:
        parsed["direccion"] = preview or fallback_addr
    return parsed


def scrape_territory(page, territory_name, url):
    print(f"Procesando {territory_name}...", flush=True)
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    time.sleep(3)
    buttons = get_list_buttons(page)
    previews = [b[1] for b in buttons]
    print(f"  {len(previews)} direcciones en lista", flush=True)

    results = []
    for i, preview in enumerate(previews):
        try:
            details = extract_one_address(page, url, i, preview)
            results.append({
                "territorio": territory_name,
                "direccion": details["direccion"],
                "notas": details["notas"],
                "genero": details["genero"],
            })
            print(f"    [{i+1}/{len(previews)}] OK: {details['direccion'][:50]}...", flush=True)
        except Exception as e:
            results.append({
                "territorio": territory_name,
                "direccion": preview,
                "notas": "sin dato",
                "genero": "sin dato",
            })
            print(f"    [{i+1}/{len(previews)}] ERROR: {e}", flush=True)

    return results


def main():
    all_data = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(locale="es-MX", viewport={"width": 1280, "height": 900})
        page = context.new_page()

        for territory_name, url in LINKS:
            try:
                rows = scrape_territory(page, territory_name, url)
                all_data.extend(rows)
            except Exception as e:
                print(f"ERROR territorio {territory_name}: {e}", flush=True)

        browser.close()

    out_path = "/Users/adrianguajardo/Developer/territoriostetlan/tmp/territorios_inventario.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    # Also generate TSV for easy copy-paste
    tsv_path = "/Users/adrianguajardo/Developer/territoriostetlan/tmp/territorios_inventario.tsv"
    with open(tsv_path, "w", encoding="utf-8") as f:
        f.write("Territorio\tDirección\tNotas\tGénero\n")
        current = None
        for row in all_data:
            if row["territorio"] != current:
                current = row["territorio"]
                f.write(f"\n=== {current} ===\n")
            f.write(f"{row['territorio']}\t{row['direccion']}\t{row['notas']}\t{row['genero']}\n")

    print(f"\nTotal: {len(all_data)} direcciones")
    print(f"JSON: {out_path}")
    print(f"TSV: {tsv_path}")


if __name__ == "__main__":
    main()
