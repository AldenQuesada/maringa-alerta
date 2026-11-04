#!/usr/bin/env python3
"""Servidor local do Sistema Integrado de Gestao de Crise.
Uso: python3 servidor_local.py [--porta 8788] [--sem-navegador].
ATENCAO: HTTP local apenas; sem backend, login real ou banco compartilhado.
"""
import argparse
import json
import mimetypes
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Timer
import webbrowser

RAIZ = Path(__file__).resolve().parent
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/geo+json", ".geojson")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(RAIZ), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/__saude":
            body = json.dumps({"status": "ok", "aplicacao": "sistema-integrado-gestao-crise", "modo": "local"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        return super().end_headers()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--porta", type=int, default=8788)
    parser.add_argument("--sem-navegador", action="store_true")
    args = parser.parse_args()
    for arquivo in ("index.html", "plataforma/index.html", "gestao/index.html"):
        if not (RAIZ / arquivo).exists():
            raise SystemExit(f"Arquivo necessario ausente: {arquivo}. Execute no repositorio completo.")
    endereco = f"http://127.0.0.1:{args.porta}/plataforma/#municipios"
    try:
        with ThreadingHTTPServer(("127.0.0.1", args.porta), Handler) as servidor:
            print(f"Servidor local ativo: {endereco}", flush=True)
            print("Para encerrar: Ctrl+C", flush=True)
            if not args.sem_navegador:
                Timer(0.7, lambda: webbrowser.open(endereco)).start()
            servidor.serve_forever()
    except OSError as erro:
        raise SystemExit(f"Nao foi possivel iniciar na porta {args.porta}: {erro}")

if __name__ == "__main__":
    main()
