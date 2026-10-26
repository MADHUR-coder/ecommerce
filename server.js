const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

let PORT = parseInt(process.env.PORT, 10) || 3000;

// Resolve public folder: if run from root, serve 'ecommerce'; if run from inside 'ecommerce', serve current dir
const publicDir = fs.existsSync(path.join(__dirname, 'ecommerce')) 
    ? path.join(__dirname, 'ecommerce') 
    : __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const ADMIN_SESSION_COOKIE = 'aura_admin_session';
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000;
const ADMIN_LOGIN_WINDOW = 15 * 60 * 1000;
const ADMIN_LOGIN_LIMIT = 5;
const adminSessions = new Map();
const adminLoginAttempts = new Map();

function sendJson(res, statusCode, payload, headers = {}) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...headers
    });
    res.end(JSON.stringify(payload));
}

function getAdminSession(req) {
    const cookie = (req.headers.cookie || '')
        .split(';')
        .map(part => part.trim())
        .find(part => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
    if (!cookie) return null;

    const token = cookie.slice(ADMIN_SESSION_COOKIE.length + 1);
    const session = adminSessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        if (session) adminSessions.delete(token);
        return null;
    }
    return session;
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let tooLarge = false;
        req.on('data', chunk => {
            if (tooLarge) return;
            body += chunk;
            if (Buffer.byteLength(body) > 4096) {
                tooLarge = true;
                body = '';
            }
        });
        req.on('end', () => {
            if (tooLarge) {
                reject(new Error('Request body is too large.'));
                return;
            }
            try {
                resolve(JSON.parse(body || '{}'));
            } catch {
                reject(new Error('Request body must be valid JSON.'));
            }
        });
        req.on('error', reject);
    });
}

function credentialsMatch(candidate, configured) {
    const candidateHash = crypto.createHash('sha256').update(candidate).digest();
    const configuredHash = crypto.createHash('sha256').update(configured).digest();
    return crypto.timingSafeEqual(candidateHash, configuredHash);
}

function handleAdminApi(req, res, pathname) {
    if (pathname === '/api/admin/session' && req.method === 'GET') {
        const session = getAdminSession(req);
        sendJson(res, 200, {
            authenticated: Boolean(session),
            ...(session ? { email: session.email } : {})
        });
        return true;
    }

    if (pathname === '/api/admin/session' && req.method === 'DELETE') {
        const session = getAdminSession(req);
        if (session) {
            for (const [token, storedSession] of adminSessions) {
                if (storedSession === session) adminSessions.delete(token);
            }
        }
        sendJson(res, 200, { authenticated: false }, {
            'Set-Cookie': `${ADMIN_SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
        });
        return true;
    }

    if (pathname !== '/api/admin/login' || req.method !== 'POST') return false;

    if (req.headers.origin) {
        try {
            if (new URL(req.headers.origin).host !== req.headers.host) {
                sendJson(res, 403, { error: 'Cross-origin login requests are not allowed.' });
                return true;
            }
        } catch {
            sendJson(res, 403, { error: 'Invalid request origin.' });
            return true;
        }
    }

    const now = Date.now();
    for (const [address, attempt] of adminLoginAttempts) {
        if (now - attempt.startedAt > ADMIN_LOGIN_WINDOW) adminLoginAttempts.delete(address);
    }
    const address = req.socket.remoteAddress || 'unknown';
    const attempt = adminLoginAttempts.get(address);
    if (attempt && attempt.count >= ADMIN_LOGIN_LIMIT && now - attempt.startedAt < ADMIN_LOGIN_WINDOW) {
        sendJson(res, 429, { error: 'Too many login attempts. Please wait 15 minutes and try again.' });
        return true;
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        sendJson(res, 503, { error: 'Admin sign-in is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD on the server, then restart it.' });
        return true;
    }

    readJsonBody(req).then(body => {
        const email = typeof body.email === 'string'
            ? body.email.trim()
            : (typeof body.username === 'string' ? body.username.trim() : '');
        const password = typeof body.password === 'string' ? body.password : '';
        const valid = email.length <= 254 && password.length > 0 && password.length <= 1024
            && credentialsMatch(email.toLowerCase(), process.env.ADMIN_EMAIL.trim().toLowerCase())
            && credentialsMatch(password, process.env.ADMIN_PASSWORD);

        if (!valid) {
            const current = adminLoginAttempts.get(address);
            adminLoginAttempts.set(address, {
                startedAt: current && now - current.startedAt < ADMIN_LOGIN_WINDOW ? current.startedAt : now,
                count: current && now - current.startedAt < ADMIN_LOGIN_WINDOW ? current.count + 1 : 1
            });
            sendJson(res, 401, { error: 'The email or password is incorrect.' });
            return;
        }

        adminLoginAttempts.delete(address);
        const token = crypto.randomBytes(32).toString('hex');
        adminSessions.set(token, {
            email: process.env.ADMIN_EMAIL.trim(),
            expiresAt: Date.now() + ADMIN_SESSION_TTL
        });
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        sendJson(res, 200, { authenticated: true, email: process.env.ADMIN_EMAIL.trim() }, {
            'Set-Cookie': `${ADMIN_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_TTL}${secure}`
        });
    }).catch(error => {
        if (!res.headersSent) {
            const status = error.message === 'Request body is too large.' ? 413 : 400;
            sendJson(res, status, { error: error.message });
        }
    });
    return true;
}

const server = http.createServer((req, res) => {
    // Parse URL and strip query strings (e.g., ?id=2, ?category=Electronics)
    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname.startsWith('/api/admin/')) {
        if (handleAdminApi(req, res, pathname)) return;
        sendJson(res, 404, { error: 'Admin API route not found.' });
        return;
    }

    // Default to index.html for root path
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Secure path resolution to prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(publicDir, safePath);
    const relativePath = path.relative(publicDir, filePath).toLowerCase();
    const isAdminPage = relativePath === 'admin.html';
    const isAdminLoginPage = relativePath === 'admin-login.html';

    if (isAdminPage && !getAdminSession(req)) {
        res.writeHead(302, { Location: '/admin-login.html', 'Cache-Control': 'no-store' });
        res.end();
        return;
    }

    if (isAdminLoginPage && getAdminSession(req)) {
        res.writeHead(302, { Location: '/admin.html', 'Cache-Control': 'no-store' });
        res.end();
        return;
    }

    // If path is a directory, look for index.html inside it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    // Determine extension & MIME type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>404 Not Found</title></head>
                    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>404 — Page Not Found</h1>
                        <p>The requested file <code>${pathname}</code> was not found.</p>
                        <a href="/">← Return to Store Home</a>
                    </body>
                    </html>
                `);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'X-Content-Type-Options': 'nosniff',
                ...(isAdminPage || isAdminLoginPage ? { 'Cache-Control': 'no-store' } : {})
            });
            res.end(content);
        }
    });
});

function listen(port) {
    server.listen(port, () => {
        console.log('\n======================================================');
        console.log('🛍️   Aura E-Commerce Storefront is running!');
        console.log(`🌐  Local URL:   http://localhost:${port}`);
        console.log(`📁  Serving:     ${publicDir}`);
        console.log('======================================================\n');
        console.log('Press Ctrl+C to stop the server.\n');
    });
}

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Notice: Port ${PORT} is in use, trying port ${PORT + 1}...`);
        PORT += 1;
        listen(PORT);
    } else {
        console.error('Server error:', err);
    }
});

listen(PORT);
