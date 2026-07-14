import http.server
import socketserver
import os

port = int(os.environ.get("PORT", 8000))
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", port), Handler) as httpd:
    httpd.serve_forever()
