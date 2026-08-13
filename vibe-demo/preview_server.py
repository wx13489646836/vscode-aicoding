from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse
import posixpath

PORT = 5500
EXTERNAL_FIXTURES_ROOT = Path(r"D:\\vibe-demo\\fixtures").resolve()
EXTERNAL_PREFIX = "/external-fixtures/"

class PreviewRequestHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        request_path = posixpath.normpath(unquote(urlparse(path).path))
        if request_path.startswith(EXTERNAL_PREFIX):
            relative_path = request_path[len(EXTERNAL_PREFIX):].lstrip("/")
            candidate = (EXTERNAL_FIXTURES_ROOT / relative_path).resolve()
            try:
                candidate.relative_to(EXTERNAL_FIXTURES_ROOT)
            except ValueError:
                return str(EXTERNAL_FIXTURES_ROOT / "__not_found__")
            return str(candidate)
        return super().translate_path(path)

def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), PreviewRequestHandler)
    print(f"Starting preview server on http://127.0.0.1:{PORT} ...")
    print(f"Serving external fixtures from {EXTERNAL_FIXTURES_ROOT}")
    server.serve_forever()

if __name__ == "__main__":
    main()
