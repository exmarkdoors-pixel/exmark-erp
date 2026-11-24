/**
 * EXMARK ERP — Localhost Port Forwarder & Dual-Stack IPv6 Bridge
 *
 * Solves common developer and operator localhost friction:
 * 1. Port 3000 Forwarding: Developers & users frequently type http://localhost:3000
 *    Redirects all traffic on port 3000 (and port 80 if available) to port 4000.
 * 2. IPv6 Loopback Bridge: On Windows, 'localhost' often resolves to IPv6 [::1].
 *    When Next.js binds to 0.0.0.0, [::1]:4000 is rejected with 'Connection refused'.
 *    This bridge transparently pipes [::1]:4000 to 127.0.0.1:4000 for zero-latency failover.
 */

import http from 'http';
import net from 'net';

const TARGET_PORT = Number(process.env.TARGET_PORT || 4000);
const LISTEN_PORT = Number(process.env.LISTEN_PORT || 3000);

export function createRedirectHandler(targetPort = TARGET_PORT) {
  return (req, res) => {
    const rawHost = req.headers.host || 'localhost';
    const hostname = rawHost.split(':')[0] || 'localhost';
    const targetUrl = `http://${hostname}:${targetPort}${req.url || '/'}`;

    res.writeHead(307, {
      Location: targetUrl,
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end(`Redirecting to EXMARK Factory ERP: ${targetUrl}\n`);
  };
}

export function startIpv6Bridge(targetPort = TARGET_PORT) {
  const server = net.createServer((socket) => {
    const remote = net.connect({ host: '127.0.0.1', port: targetPort });

    socket.on('error', () => {
      remote.destroy();
    });
    remote.on('error', () => {
      socket.destroy();
    });

    socket.pipe(remote).pipe(socket);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Another IPv6 bridge or server is already bound
      return;
    }
    console.warn('[IPv6 Bridge] Warning on ::1:' + targetPort, err.message);
  });

  try {
    server.listen(targetPort, '::1', () => {
      console.log(`[IPv6 Bridge] Bound [::1]:${targetPort} -> 127.0.0.1:${targetPort}`);
    });
  } catch {
    // IPv6 may not be configured on host
  }

  return server;
}

export function startPortForwarder(options = {}) {
  const targetPort = Number(options.targetPort || TARGET_PORT);
  const forwardPort = Number(options.forwardPort || LISTEN_PORT);
  const redirectHandler = createRedirectHandler(targetPort);

  // 1. Forwarder on port 3000 (IPv4)
  const serverV4 = http.createServer(redirectHandler);
  serverV4.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[PortForwarder] Port ${forwardPort} (IPv4) already in use. Standing by.`);
    }
  });

  try {
    serverV4.listen(forwardPort, '0.0.0.0', () => {
      console.log(`[PortForwarder] http://0.0.0.0:${forwardPort} -> http://localhost:${targetPort}`);
    });
  } catch {}

  // 2. Forwarder on port 3000 (IPv6)
  const serverV6 = http.createServer(redirectHandler);
  serverV6.on('error', () => {});
  try {
    serverV6.listen(forwardPort, '::1', () => {
      console.log(`[PortForwarder] http://[::1]:${forwardPort} -> http://localhost:${targetPort}`);
    });
  } catch {}

  // 3. Port 80 forwarder (http://localhost without port)
  const serverPort80 = http.createServer(redirectHandler);
  serverPort80.on('error', () => {});
  try {
    serverPort80.listen(80, '127.0.0.1', () => {
      console.log(`[PortForwarder] http://localhost:80 -> http://localhost:${targetPort}`);
    });
  } catch {}

  // 4. IPv6 loopback bridge (only enabled if TARGET_IPV6_BRIDGE=true)
  let bridge = null;
  if (process.env.TARGET_IPV6_BRIDGE === 'true') {
    bridge = startIpv6Bridge(targetPort);
  }

  return {
    serverV4,
    serverV6,
    serverPort80,
    bridge,
    close() {
      try { serverV4.close(); } catch {}
      try { serverV6.close(); } catch {}
      try { serverPort80.close(); } catch {}
      if (bridge) {
        try { bridge.close(); } catch {}
      }
    },
  };
}

// Auto-run when executed directly via node CLI
const isDirectCli = process.argv[1] && process.argv[1].endsWith('localhost-port-forwarder.mjs');
if (isDirectCli) {
  startPortForwarder();
}
