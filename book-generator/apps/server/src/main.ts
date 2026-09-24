/**
 * Lauffaehiger Bilderbuch-Service auf node:http.
 *
 *   npm run serve
 *
 * Umgebung:
 *   PORT=8787                     Port
 *   ABG_API_KEYS=key1:kunde_a     Schluessel:Mandant, kommagetrennt
 *   ABG_ALLOW_ANONYMOUS=lokal     ohne Schluessel arbeiten (nur lokal!)
 *
 * Der Server haelt die Buecher im Speicher. Fuer den Betrieb ein BookStore
 * gegen die eigene Datenbank einsetzen — die Schnittstelle hat fuenf Methoden.
 */
import { createServer, type IncomingMessage } from 'node:http';
import { createService, parseKeys } from '@abg/api';
import { DemoGenerator } from '@abg/picturebook';

const port = Number(process.env.PORT ?? 8787);
const keys = parseKeys(process.env.ABG_API_KEYS);
const anonymous = process.env.ABG_ALLOW_ANONYMOUS;

if (Object.keys(keys).length === 0 && !anonymous) {
  console.error('Kein API-Schluessel gesetzt. Entweder ABG_API_KEYS=key:mandant');
  console.error('oder — nur lokal — ABG_ALLOW_ANONYMOUS=lokal');
  process.exit(1);
}

const service = createService({
  generator: new DemoGenerator(),
  auth: { keys, ...(anonymous ? { allowAnonymousAs: anonymous } : {}) },
});

const server = createServer(async (req, res) => {
  const url = `http://${req.headers.host ?? 'localhost'}${req.url}`;
  const body = ['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? '')
    ? undefined
    : await readBody(req);

  const headers: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.push([k, v]);
  }
  const request = new Request(url, {
    method: req.method,
    headers,
    ...(body !== undefined ? { body } : {}),
  });

  const response = await service.handle(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  const text = await response.text();
  res.end(text);

  const t = new Date().toISOString();
  console.log(`${t} ${req.method} ${req.url} -> ${response.status}`);
});

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) { reject(new Error('Anfrage zu gross')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

server.listen(port, () => {
  console.log(`Bilderbuch-Service auf http://localhost:${port}`);
  console.log(`  GET  /v1/health`);
  console.log(`  POST /v1/books   {"prompt": "Ein Fuchs, der das Meer sucht"}`);
  if (anonymous) console.log(`  (ohne Schluessel, alles gehoert "${anonymous}")`);
});
