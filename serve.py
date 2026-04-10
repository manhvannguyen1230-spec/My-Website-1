import os
import sys

os.chdir("/Users/manhnguyen/Library/Mobile Documents/com~apple~CloudDocs/Test 3d 3")

from http.server import HTTPServer, SimpleHTTPRequestHandler

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
server = HTTPServer(("", port), SimpleHTTPRequestHandler)
print(f"Serving on http://localhost:{port}")
server.serve_forever()
