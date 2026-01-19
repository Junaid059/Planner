import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

const PORT = process.env.PORT || 3001;

// Dynamic import handlers
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
    // Read body for POST/PUT/PATCH requests
    let body = '';
    if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => { resolve(data); });
      });
    }

    // Create a mock NextRequest-like object
    const mockRequest = {
      method: req.method,
      headers: {
        get: (name: string) => req.headers[name.toLowerCase()] as string || null,
      },
      json: async () => body ? JSON.parse(body) : {},
      url: `http://localhost:${PORT}${req.url}`,
    };

    let response;

    // Route to appropriate handler
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { POST } = await import('./register/route');
      response = await POST(mockRequest as any);
    } else if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { POST } = await import('./login/route');
      response = await POST(mockRequest as any);
    } else if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const { POST } = await import('./logout/route');
      response = await POST(mockRequest as any);
    } else if (pathname === '/api/auth/refresh' && req.method === 'POST') {
      const { POST } = await import('./refresh/route');
      response = await POST(mockRequest as any);
    } else if (pathname === '/api/auth/me' && req.method === 'GET') {
      const { GET } = await import('./me/route');
      response = await GET(mockRequest as any);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }));
      return;
    }

    // Send response
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
  console.log(`Auth service running on port ${PORT}`);
});
