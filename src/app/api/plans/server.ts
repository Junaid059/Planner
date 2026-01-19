import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

const PORT = process.env.PORT || 3002;

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
    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => { resolve(data); });
      });
    }

    const mockRequest = {
      method: req.method,
      headers: {
        get: (name: string) => req.headers[name.toLowerCase()] as string || null,
      },
      json: async () => body ? JSON.parse(body) : {},
      url: `http://localhost:${PORT}${req.url}`,
      nextUrl: { searchParams: new URLSearchParams(parsedUrl.query as Record<string, string>) },
    };

    let response;

    // Extract plan ID from path like /api/plans/123
    const planIdMatch = pathname.match(/^\/api\/plans\/([^\/]+)$/);
    const planId = planIdMatch ? planIdMatch[1] : null;

    if (pathname === '/api/plans' && req.method === 'GET') {
      const { GET } = await import('./route');
      response = await GET(mockRequest as any);
    } else if (pathname === '/api/plans' && req.method === 'POST') {
      const { POST } = await import('./route');
      response = await POST(mockRequest as any);
    } else if (planId && req.method === 'GET') {
      const { GET } = await import('./[id]/route');
      response = await GET(mockRequest as any, { params: Promise.resolve({ id: planId }) });
    } else if (planId && req.method === 'PATCH') {
      const { PATCH } = await import('./[id]/route');
      response = await PATCH(mockRequest as any, { params: Promise.resolve({ id: planId }) });
    } else if (planId && req.method === 'DELETE') {
      const { DELETE } = await import('./[id]/route');
      response = await DELETE(mockRequest as any, { params: Promise.resolve({ id: planId }) });
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
  console.log(`Plans service running on port ${PORT}`);
});
