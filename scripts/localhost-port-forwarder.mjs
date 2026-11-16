import http from 'http';

const TARGET_PORT = Number(process.env.TARGET_PORT || 4000);
const LISTEN_PORT = Number(process.env.LISTEN_PORT || 3000);

const server = http.createServer((req, res) => {
  const hostHeader = req.headers.host || 'localhost';
  const hostname = hostHeader.split(':')[0] || 'localhost';
  const targetUrl = `http://${hostname}:${TARGET_PORT}${req.url}`;

  // HTTP 307 preserves request method (GET, POST, etc.) and redirect URL
  res.writeHead(307, {
    'Location': targetUrl,
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/plain',
  });
  res.end(`Redirecting to EXMARK Factory ERP: ${targetUrl}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[PortForwarder] Port ${LISTEN_PORT} already in use. Localhost forwarder standing by.`);
  } else {
    console.error('[PortForwarder] Server error:', err);
  }
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[PortForwarder] EXMARK Localhost Port Forwarder running: http://0.0.0.0:${LISTEN_PORT} -> http://0.0.0.0:${TARGET_PORT}`);
});
