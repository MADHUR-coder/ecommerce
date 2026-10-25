const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

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

const server = http.createServer((req, res) => {
    // Parse URL and strip query strings (e.g., ?id=2, ?category=Electronics)
    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Default to index.html for root path
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Secure path resolution to prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(publicDir, safePath);

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
            res.writeHead(200, { 'Content-Type': contentType });
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
