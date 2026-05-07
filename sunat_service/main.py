import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright
import uvicorn
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Solo el frontend local
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

def normalize_sunat_data(raw: dict) -> dict:
    """Convierte claves SUNAT al modelo Organization del CRM de forma robusta"""
    result = {}
    
    for k, v in raw.items():
        k_upper = k.upper()
        if 'RUC' in k_upper and ' - ' in v:
            parts = v.split(' - ', 1)
            result['ruc'] = parts[0].strip()
            result['nombre'] = parts[1].strip()
        elif 'NOMBRE COMERCIAL' in k_upper:
            if v != '-' and v != '':
                result['nombreCompleto'] = v
        elif 'ESTADO' in k_upper:
            result['estado'] = v
        elif 'CONDICI' in k_upper:
            result['condicion'] = v
        elif 'DOMICILIO FISCAL' in k_upper:
            result['ubicacion'] = v
        elif 'ACTIVIDAD' in k_upper and 'ECON' in k_upper:
            result['actividades'] = v
            
    result["_raw"] = raw
    return result


async def scrape_by_ruc(ruc: str) -> dict:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-gpu", "--no-sandbox"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            intentos = 0
            while intentos < 2:
                try:
                    await page.goto(
                        "https://e-consultaruc.sunat.gob.pe/cl-ti-itconsruc/FrameCriterioBusquedaWeb.jsp",
                        timeout=60000,
                        wait_until="domcontentloaded"
                    )
                    break
                except Exception:
                    intentos += 1
                    await asyncio.sleep(2)

            # Búsqueda por RUC — tab diferente al de nombre
            await page.click("#btnPorRuc")
            await page.fill("#txtRuc", ruc)
            await page.click("#btnAceptar")
            await page.wait_for_selector(".list-group-item", timeout=15000)

            raw = {}
            items = await page.query_selector_all(".list-group-item")
            for item in items:
                header = await item.query_selector("h4.list-group-item-heading")
                content = await item.query_selector(".col-sm-7, .col-sm-3")
                if header and content:
                    raw[(await header.inner_text()).strip()] = (await content.inner_text()).strip()

            await browser.close()
            return normalize_sunat_data(raw)

        except Exception as e:
            await browser.close()
            raise HTTPException(status_code=503, detail="SUNAT no responde. Intenta de nuevo.")




@app.get("/consultar-ruc")
async def consultar_por_ruc(ruc: str):
    """Busca por RUC usando la API de prueba (NixOS)"""
    if len(ruc) != 11 or not ruc.isdigit():
        raise HTTPException(status_code=400, detail="RUC debe tener 11 dígitos numéricos")
    
    async with httpx.AsyncClient() as client:
        try:
            test_url = f"https://nixos.tail805b57.ts.net/consultar-ruc?ruc={ruc}"
            response = await client.get(test_url, timeout=15.0)
            
            if response.status_code == 200:
                return response.json()
            
            # Si el servicio de prueba falla, intentamos el scraper como respaldo
            return await scrape_by_ruc(ruc)
        except Exception:
            # Si hay error de conexión con la API de prueba, usamos el scraper
            return await scrape_by_ruc(ruc)


import re as _re

async def scrape_by_nombre(nombre: str) -> list:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-gpu", "--no-sandbox"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            await page.goto(
                "https://e-consultaruc.sunat.gob.pe/cl-ti-itconsruc/FrameCriterioBusquedaWeb.jsp",
                timeout=60000,
                wait_until="domcontentloaded"
            )

            # Click tab "Por Nomb./Raz.Soc." por texto visible
            await page.get_by_text("Por Nomb./Raz.Soc.").click()

            # El input de búsqueda (único textbox en la página)
            await page.get_by_role("textbox").fill(nombre)

            # Click "Buscar"
            await page.get_by_role("button", name="Buscar").click()

            # Esperar lista de resultados
            await page.wait_for_selector("text=Relación de contribuyentes", timeout=15000)

            content = await page.inner_text("body")

            # Parsear bloque por bloque:
            # RUC: 20603673141
            # NOMBRE EMPRESA
            # Ubicación: LIMA
            # Estado: ACTIVO
            resultados = []
            seen = set()
            bloques = _re.split(r'\n(?=RUC:\s*\d{11})', content)
            for bloque in bloques:
                ruc_m    = _re.search(r'RUC:\s*(\d{11})', bloque)
                nom_m    = _re.search(r'\d{11}\s+([^\n\r]+)', bloque)
                ubic_m   = _re.search(r'Ubicaci[oó]n:\s*([^\n\r]+)', bloque)
                estado_m = _re.search(r'Estado:\s*([^\n\r]+)', bloque)
                if ruc_m and nom_m:
                    ruc = ruc_m.group(1)
                    if ruc not in seen:
                        seen.add(ruc)
                        resultados.append({
                            "ruc":       ruc,
                            "nombre":    nom_m.group(1).strip(),
                            "ubicacion": ubic_m.group(1).strip()   if ubic_m   else None,
                            "estado":    estado_m.group(1).strip() if estado_m else None,
                        })

            await browser.close()
            return resultados[:20]

        except Exception as e:
            await browser.close()
            raise HTTPException(status_code=503, detail=f"SUNAT error: {str(e)}")


@app.get("/consultar-nombre")
async def consultar_por_nombre(nombre: str):
    """Busca por razón social — retorna lista de coincidencias"""
    nombre = nombre.strip()
    if len(nombre) < 3:
        raise HTTPException(status_code=400, detail="Ingresa al menos 3 caracteres")
    return await scrape_by_nombre(nombre)


@app.get("/apiprueba")
async def apiprueba(ruc: str):
    """Prueba de API externa para consulta RUC"""
    if len(ruc) != 11 or not ruc.isdigit():
        raise HTTPException(status_code=400, detail="RUC debe tener 11 dígitos numéricos")
    
    async with httpx.AsyncClient() as client:
        try:
            # Intentamos consultar el servicio externo proporcionado por el usuario
            test_url = f"https://nixos.tail805b57.ts.net/consultar-ruc?ruc={ruc}"
            response = await client.get(test_url, timeout=10.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en el servicio de prueba")
            
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"No se pudo conectar con la API de prueba: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
