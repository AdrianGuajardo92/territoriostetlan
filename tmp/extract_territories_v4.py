#!/usr/bin/env python3
"""Extract all addresses from Google Maps territory lists - v4 (bulk parse)."""
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


def parse_list_block(text):
    """Parse saved-list entries from expanded Google Maps panel."""
    entries = []

    # Isolate list section between shared-list header and place detail panel
    start_markers = ["Lista compartida", "sitios·Lista", "lugares·Lista"]
    start = -1
    for m in start_markers:
        start = text.find(m)
        if start >= 0:
            break
    if start < 0:
        return entries

    # End before detail actions or second 'Edificio multiusos' block
    end_markers = ["Edificio multiusos", "Indicaciones", "Cómo llegar", "Sugerir un cambio"]
    end = len(text)
    for m in end_markers:
        pos = text.find(m, start + 20)
        if pos > start and pos < end:
            end = pos

    block = text[start:end]
    lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
    # Remove UI noise lines
    noise = re.compile(
        r"^(Guardar|Compartir|Lista compartida|sitios|lugares|Adrian|Por |Guardado|Obtener|||||\d+)$",
        re.I,
    )

    i = 0
    while i < len(lines):
        if noise.match(lines[i]) or lines[i].startswith("Nombre:") or lines[i].startswith("Nota:") or lines[i].startswith("Datos:"):
            i += 1
            continue

        # Address block: street + colonia + cp city
        if i + 2 < len(lines) and re.search(r"\d{4,5}", lines[i + 2]):
            street = lines[i]
            colonia = lines[i + 1]
            city_line = lines[i + 2]
            direccion = f"{street}, {colonia}, {city_line}"
            i += 3
            nombre = ""
            nota = ""
            genero = "sin dato"
            while i < len(lines):
                if lines[i].startswith("Nombre:"):
                    nombre = lines[i][7:].strip()
                    i += 1
                    continue
                if lines[i].startswith("Nota:"):
                    nota = lines[i][5:].strip()
                    i += 1
                    continue
                if lines[i].startswith("Datos:"):
                    nota = lines[i][6:].strip()
                    i += 1
                    continue
                if re.search(r"\d{4,5}", lines[i]) and i + 1 < len(lines):
                    break
                if not noise.match(lines[i]) and not lines[i].startswith("Género:") and not lines[i].startswith("Genero:"):
                    if re.match(r"^(C\.|Av\.|Calle|Perdiz|Verdín|Del |Sta\.|Hacienda|Presa|Artículo|Mariano|Dunas|Cto|Enrique|Salvador|Victoria|Rosario|Jesús|Etiopía|Manuel|Av |La |Sayula|Careyes|Yahualica|Jamay|San Rafael|Manantiales|Prol\.|Capulín|Morelos|Francisco|Joaquín|Loma |Reina|Calle Juan|C\. Zaragoza|C\. Alvaro|Batalla|Bagdad|Monte |Apolonio|Graciela|Compartir)", lines[i]):
                        break
                i += 1

            if re.search(r"\bDesconocido\b", nombre, re.I):
                genero = "Desconocido"
            gmatch = re.search(r"G[eé]nero:\s*(Hombre|Mujer|Desconocido)", nota or "", re.I)
            if gmatch:
                genero = gmatch.group(1).capitalize()

            notes_parts = []
            if nombre:
                notes_parts.append(f"Nombre: {nombre}")
            if nota and nota.lower() not in ("sin datos", ""):
                notes_parts.append(f"Nota: {nota}")

            entries.append({
                "direccion": direccion,
                "notas": " | ".join(notes_parts) if notes_parts else "sin dato",
                "genero": genero,
            })
            continue
        i += 1

    return entries


def fallback_parse_detail(text, preview=""):
    """Parse single place from detail panel footer."""
    section = text
    if "Por Adrian Guajardo" in text:
        section = text.split("Por Adrian Guajardo")[-1]
    elif "Por " in text:
        section = re.split(r"Por .+\n", text)[-1]

    nombre = ""
    nota = ""
    genero = "sin dato"
    direccion = preview

    nm = re.search(r"Nombre:\s*(.+?)(?:\n|Nota:|Datos:|$)", section)
    if nm:
        nombre = nm.group(1).strip()
    nt = re.search(r"(?:Nota|Datos):\s*(.+?)(?:\n\n|Género:|Genero:|$)", section, re.DOTALL)
    if nt:
        nota = re.sub(r"\s+", " ", nt.group(1).strip())
    addr = re.search(
        r"([\w\s\.\-#,áéíóúÁÉÍÓÚñÑ]+?\d+[\w\s\.\-#,áéíóúÁÉÍÓÚñÑ]*,[\s\S]*?(?:Guadalajara|Tonalá|Tlaquepaque|Coyula)[,\s]+(?:Jal\.?|Jalisco))",
        section,
    )
    if addr:
        direccion = re.sub(r"\s+", " ", addr.group(1)).strip()

    if re.search(r"\bDesconocido\b", nombre, re.I):
        genero = "Desconocido"

    notes_parts = []
    if nombre:
        notes_parts.append(f"Nombre: {nombre}")
    if nota and nota.lower() not in ("sin datos", ""):
        notes_parts.append(f"Nota: {nota}")

    return {
        "direccion": direccion,
        "notas": " | ".join(notes_parts) if notes_parts else "sin dato",
        "genero": genero,
    }


def scrape_territory(page, territory_name, url):
    print(f"Procesando {territory_name}...", flush=True)
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    time.sleep(4)

    loc = page.locator("div.ZSOIif button")
    count = loc.count()
    if count == 0:
        loc = page.locator("button").filter(has_text=re.compile(r"Guadalajara|Tonalá|Tlaquepaque|Coyula"))
        count = loc.count()

    if count == 0:
        # Lista no disponible o vacía
        if "No se puede encontrar la lista" in page.inner_text("body"):
            print("  lista no disponible (enlace borrado o sin compartir)", flush=True)
        else:
            print("  0 direcciones", flush=True)
        return []

    # Algunas listas muestran nombre/nota sin abrir detalle
    initial_text = page.inner_text("body")
    initial_entries = parse_list_block(initial_text)
    if len(initial_entries) >= count:
        results = [{"territorio": territory_name, **e} for e in initial_entries[:count]]
        print(f"  -> {len(results)} direcciones (lista visible)", flush=True)
        return results

    previews = []
    for i in range(count):
        try:
            previews.append(loc.nth(i).inner_text(timeout=3000).replace("\n", " ").strip())
        except Exception:
            previews.append("")

    # Click first address and expand to reveal full list notes
    page.evaluate("() => { document.querySelectorAll('div.ZSOIif button')[0]?.click(); }")
    time.sleep(2)
    gbtn = page.locator("button.CsEnBe, button:has-text('Guardado en'), button:has-text('Guardada en')").first
    if gbtn.count():
        try:
            gbtn.click(timeout=5000)
            time.sleep(1.5)
        except Exception:
            pass

    text = page.inner_text("body")
    entries = parse_list_block(text)

    results = []
    if len(entries) >= count:
        for i, entry in enumerate(entries[:count]):
            results.append({"territorio": territory_name, **entry})
    else:
        # Fallback: per-address fresh navigation
        print(f"  bulk parse got {len(entries)}/{count}, usando fallback individual...", flush=True)
        for i, preview in enumerate(previews):
            page.goto(url, wait_until="domcontentloaded", timeout=90000)
            time.sleep(3)
            page.evaluate(f"() => {{ document.querySelectorAll('div.ZSOIif button')[{i}]?.click(); }}")
            time.sleep(2)
            gbtn = page.locator("button.CsEnBe, button:has-text('Guardado en'), button:has-text('Guardada en')").first
            nombre_preview = ""
            if gbtn.count():
                gtxt = gbtn.inner_text(timeout=2000)
                nm = re.search(r"Nombre:\s*(.+?)(?:\.\.\.|$)", gtxt)
                if nm:
                    nombre_preview = nm.group(1).strip()
                try:
                    gbtn.click(timeout=3000)
                    time.sleep(1)
                except Exception:
                    pass
            detail = fallback_parse_detail(page.inner_text("body"), preview)
            if not detail["direccion"]:
                detail["direccion"] = preview
            results.append({"territorio": territory_name, **detail})

    print(f"  -> {len(results)} direcciones", flush=True)
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
    out_md = "/Users/adrianguajardo/Developer/territoriostetlan/tmp/territorios_inventario.md"

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    with open(out_tsv, "w", encoding="utf-8") as f:
        f.write("Territorio\tDirección\tNotas\tGénero\n")
        prev = None
        for row in all_data:
            if row["territorio"] != prev:
                prev = row["territorio"]
                f.write(f"\n=== {prev} ===\n")
            f.write(f"{row['territorio']}\t{row['direccion']}\t{row['notas']}\t{row['genero']}\n")

    with open(out_md, "w", encoding="utf-8") as f:
        prev = None
        for row in all_data:
            if row["territorio"] != prev:
                prev = row["territorio"]
                f.write(f"\n## {prev}\n\n")
                f.write("| Dirección | Notas | Género |\n")
                f.write("|-----------|-------|--------|\n")
            d = row["direccion"].replace("|", "\\|")
            n = row["notas"].replace("|", "\\|")
            g = row["genero"]
            f.write(f"| {d} | {n} | {g} |\n")

    print(f"\nTotal: {len(all_data)} direcciones")
    print(f"JSON: {out_json}")
    print(f"TSV: {out_tsv}")
    print(f"MD: {out_md}")


if __name__ == "__main__":
    main()
