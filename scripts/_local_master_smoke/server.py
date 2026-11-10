#!/usr/bin/env python3
"""Serve an ephemeral loopback-only technical form. Never accept or log credentials/session responses."""
import argparse
import hashlib
import json
import re
import sys
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(__file__).resolve().parent
SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js'
SDK_SHA256 = 'a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce'
PROJECT_URL = 'https://mqkflwsvnzcaylxtvsje.supabase.co'
HTML = b'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TaxiQaid Local Master Smoke Test</title><link rel="stylesheet" href="/style.css"><script defer src="/privacy.js"></script><script defer src="/supabase.js"></script><script defer src="/config.js"></script><script defer src="/catalog.js"></script><script defer src="/permissions.js"></script><script defer src="/validator.js"></script><script defer src="/smoke.js"></script></head><body><main><h1>TaxiQaid Local Master Smoke Test</h1><p>Private technical test against the dedicated Supabase project. Both private fields are masked and cleared on submission. Keep this tab open until automatic sign-out finishes.</p><form id="credentials" autocomplete="off"><fieldset id="private-fields" disabled><legend>Owner-only input</legend><label for="technical-email">Existing Supabase Auth email (masked)</label><input id="technical-email" type="password" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false"><label for="technical-password">Existing password</label><input id="technical-password" type="password" autocomplete="off"><button type="button" id="run">Run Once and Sign Out</button></fieldset></form><p id="overall" role="status">Ready. The public username/Iqama broker stays disabled.</p><ul id="results" aria-live="polite"></ul><label for="summary">Sanitized result summary</label><textarea id="summary" rows="14" readonly spellcheck="false" autocomplete="off"></textarea><button id="copy" type="button" disabled>Copy Sanitized Summary</button><p id="copy-status" role="status"></p><p>Report only this summary. Do not share screenshots of inputs, browser network captures, SDK sessions or raw function responses.</p></main></body></html>'''
PRIVACY = b'''(()=>{try{for(const name of ['localStorage','sessionStorage','indexedDB','caches'])Object.defineProperty(globalThis,name,{get(){throw new DOMException('Storage is disabled for this temporary test.','SecurityError');}});Object.defineProperty(globalThis,'LOCAL_SMOKE_PRIVACY_READY',{value:true});}catch{}})();'''
CSS = b'''*{box-sizing:border-box}body{margin:0;background:#f4f5f7;color:#24242d;font:16px/1.6 system-ui,sans-serif}main{max-width:850px;margin:24px auto;padding:24px;background:white;border-top:5px solid #f58220;border-radius:12px}h1{font-size:26px}fieldset{border:1px solid #d7d9df;border-radius:8px;padding:16px}label{display:block;margin:12px 0 6px;font-weight:600}input,textarea,button{font:inherit;min-height:46px;border:1px solid #c8cad0;border-radius:6px;padding:10px}input,textarea{width:100%}button{margin-top:16px;background:#f58220;font-weight:600;cursor:pointer}button:disabled{opacity:.55;cursor:default}textarea{font:13px/1.5 monospace;resize:vertical}li{overflow-wrap:anywhere}input:focus,button:focus,textarea:focus{outline:2px solid #d96a10;outline-offset:2px}@media(max-width:600px){main{margin:0;padding:16px}}'''


def load_sdk(filename):
    if filename:
        data = Path(filename).read_bytes()
    else:
        # Public pinned code is downloaded before any private input; TLS verification remains enabled.
        with urllib.request.urlopen(SDK_URL, timeout=30) as response:
            data = response.read(2 * 1024 * 1024)
    if hashlib.sha256(data).hexdigest() != SDK_SHA256:
        raise ValueError('SDK_INTEGRITY_CHECK_FAILED')
    return data


def load_key():
    config = (ROOT / 'shared/auth-dedicated-config.js').read_text()
    url = re.search(r"url:\s*'([^']+)'", config)
    key = re.search(r"publicKey:\s*'(sb_publishable_[A-Za-z0-9_-]+)'", config)
    if not url or url.group(1) != PROJECT_URL or not key:
        raise ValueError('DEDICATED_PUBLIC_CONFIGURATION_REJECTED')
    return key.group(1)


def make_server(port, sdk):
    public_key = load_key()
    routes = {
        '/': ('text/html; charset=utf-8', HTML),
        '/style.css': ('text/css; charset=utf-8', CSS),
        '/privacy.js': ('text/javascript; charset=utf-8', PRIVACY),
        '/supabase.js': ('text/javascript; charset=utf-8', sdk),
        '/catalog.js': ('text/javascript; charset=utf-8', (ROOT / 'shared/permission-catalog.js').read_bytes()),
        '/permissions.js': ('text/javascript; charset=utf-8', (ROOT / 'shared/permission-model.js').read_bytes()),
        '/validator.js': ('text/javascript; charset=utf-8', (ASSETS / 'validator.js').read_bytes()),
        '/smoke.js': ('text/javascript; charset=utf-8', (ASSETS / 'browser.js').read_bytes()),
    }

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def log_error(self, *args):
            pass

        def reply(self, code, data=b'Request rejected.', content_type='text/plain; charset=utf-8'):
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src " + PROJECT_URL + "; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'")
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(data)

        def send_error(self, code, message=None, explain=None):
            self.reply(code)

        def do_GET(self):
            expected_host = '127.0.0.1:' + str(self.server.server_port)
            expected_origin = 'http://' + expected_host
            parsed = urlsplit(self.path)
            if self.headers.get('Host') != expected_host or self.headers.get('Origin') not in (None, expected_origin) or parsed.query or parsed.fragment or parsed.scheme or parsed.netloc:
                self.reply(403)
                return
            if parsed.path == '/config.js':
                data = 'globalThis.LOCAL_MASTER_SMOKE=Object.freeze(' + json.dumps({'url': PROJECT_URL, 'key': public_key, 'localOrigin': expected_origin}) + ');'
                self.reply(200, data.encode(), 'text/javascript; charset=utf-8')
                return
            route = routes.get(parsed.path)
            if route is None:
                self.reply(404)
                return
            content_type, data = route
            self.reply(200, data, content_type)

        def do_HEAD(self):
            self.do_GET()

        def do_POST(self):
            # Never read a request body. Credentials must go directly from browser to Supabase Auth.
            self.reply(405)
            self.close_connection = True

    return ThreadingHTTPServer(('127.0.0.1', port), Handler)


def main():
    parser = argparse.ArgumentParser(description='Temporary loopback-only TaxiQaid Master test; no broker activation.')
    parser.add_argument('--port', type=int, default=0, help='Loopback port; default chooses a free port.')
    parser.add_argument('--sdk-file', help='Optional offline copy of the exact pinned public SDK; checksum is mandatory.')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error('Invalid port.')
    server = None
    try:
        server = make_server(args.port, load_sdk(args.sdk_file))
        print('Open locally: http://127.0.0.1:' + str(server.server_port) + '/', flush=True)
        print('No credentials or request bodies are collected by this server. Stop with Ctrl+C.', flush=True)
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    except Exception:
        print('LOCAL_TEST_START_FAILED: check the pinned SDK download, Python TLS/network access and local port.', file=sys.stderr)
        return 1
    finally:
        if server:
            server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
