import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Solo el frontend local
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
    """Busca por RUC directo — resultado único"""
    if len(ruc) != 11 or not ruc.isdigit():
        raise HTTPException(status_code=400, detail="RUC debe tener 11 dígitos numéricos")
    return await scrape_by_ruc(ruc)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
