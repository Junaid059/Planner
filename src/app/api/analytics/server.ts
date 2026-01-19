import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

const PORT = process.env.PORT || 3005;

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const mockRequest = {
      method: req.method,
      headers: {
        get: (name: string) => req.headers[name.toLowerCase()] as string || null,
      },
      json: async () => ({}),
      url: `http://localhost:${PORT}${req.url}`,
      nextUrl: { searchParams: new URLSearchParams(parsedUrl.query as Record<string, string>) },
    };

    let response;

    if (pathname === '/api/analytics' && req.method === 'GET') {
      const { GET } = await import('./route');
      response = await GET(mockRequest as any);
    } else if (pathname === '/api/analytics/weekly' && req.method === 'GET') {
      const { GET } = await import('./weekly/route');
      response = await GET(mockRequest as any);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }));
      return;
    }

    const responseBody = await response.json();
    res.writeHead(response.status || 200);
    res.end(JSON.stringify(responseBody));
  } catch (error) {
    console.error('Request error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: { code: 'SRV001', message: 'Internal server error' } }));
  }
}

const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Analytics service running on port ${PORT}`);
});
