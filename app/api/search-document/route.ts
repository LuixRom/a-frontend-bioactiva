import { NextRequest, NextResponse } from 'next/server';

const SUNAT_SERVICE = process.env.SUNAT_SERVICE_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const document = searchParams.get('document');

  if (!document) {
    return NextResponse.json(
      { error: 'Se requiere el parámetro document (RUC de 11 dígitos)' },
      { status: 400 }
    );
  }

  const digits = document.replace(/\D/g, '');
  if (digits.length !== 11) {
    return NextResponse.json(
      { error: 'El RUC debe tener 11 dígitos numéricos' },
      { status: 400 }
    );
  }

  try {
    const url = `${SUNAT_SERVICE}/consultar-ruc?ruc=${encodeURIComponent(digits)}`;
    console.log(`[SUNAT Proxy] Fetching: ${url}`);

    const response = await fetch(url, { 
      signal: AbortSignal.timeout(30000),
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error detail');
      console.error(`[SUNAT Proxy] Backend error ${response.status}:`, errorText);

      if (response.status === 404) {
        return NextResponse.json({ error: 'RUC no encontrado en SUNAT' }, { status: 404 });
      }
      return NextResponse.json(
        { error: `Error del servicio externo (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('[SUNAT Proxy] Exception:', err.name, err.message);
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    
    return NextResponse.json(
      { error: isTimeout ? 'La consulta a SUNAT demoró demasiado (timeout)' : 'Error de comunicación con el servicio SUNAT' },
      { status: isTimeout ? 504 : 503 }
    );
  }
}
