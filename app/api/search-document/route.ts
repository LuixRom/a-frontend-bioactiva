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

    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: (error as any).detail || 'Error consultando SUNAT' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error('[SUNAT proxy error]', err);
    return NextResponse.json(
      { error: 'No se pudo conectar con el servicio SUNAT' },
      { status: 503 }
    );
  }
}
