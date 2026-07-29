"""
Obsidian Browser - Obscura Security Tools
Backend tools: DNS, port scan, URL fuzz, proxy, UA, SSL, headers
"""
import socket
import ssl
import concurrent.futures
import json
import urllib.request
import urllib.error
import ssl as ssl_module

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class SecurityTools:
    def __init__(self):
        self.proxy = None
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        self._proxy_enabled = False
        self._proxy_url = None

    def _request(self, url, method="GET", timeout=5):
        if HAS_REQUESTS:
            kwargs = {"headers": {"User-Agent": self.user_agent, "DNT": "1"}, "timeout": timeout, "allow_redirects": True, "verify": False}
            if self._proxy_enabled and self._proxy_url:
                kwargs["proxies"] = {"http": self._proxy_url, "https": self._proxy_url}
            r = requests.request(method, url, **kwargs)
            return {"status": r.status_code, "headers": dict(r.headers), "body": r.text, "url": r.url}
        else:
            req = urllib.request.Request(url, method=method,
                                         headers={"User-Agent": self.user_agent, "DNT": "1"})
            if self._proxy_enabled and self._proxy_url:
                handler = urllib.request.ProxyHandler({"http": self._proxy_url, "https": self._proxy_url})
                opener = urllib.request.build_opener(handler)
            else:
                opener = urllib.request.build_opener()
            ctx = ssl_module.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl_module.CERT_NONE
            resp = opener.open(req, timeout=timeout, context=ctx)
            body = resp.read().decode("utf-8", errors="replace")
            return {"status": resp.status, "headers": dict(resp.headers), "body": body, "url": resp.url}

    def resolve_dns(self, hostname):
        try:
            result = socket.getaddrinfo(hostname, 80)
            ips = []
            seen = set()
            for r in result:
                ip = r[4][0]
                if ip not in seen:
                    seen.add(ip)
                    ips.append(ip)
            return {"hostname": hostname, "ips": ips, "count": len(ips)}
        except Exception as e:
            return {"hostname": hostname, "error": str(e)}

    def port_scan(self, hostname, ports=None):
        if ports is None:
            ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1433, 1521, 2049, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017]
        found = {"open": [], "filtered": [], "closed": []}
        service_map = {21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3",
                       143: "IMAP", 443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S", 1433: "MSSQL",
                       1521: "Oracle", 2049: "NFS", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
                       5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt", 27017: "MongoDB"}

        def check_port(p):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1.5)
                result = s.connect_ex((hostname, p))
                s.close()
                if result == 0:
                    found["open"].append({"port": p, "service": service_map.get(p, "unknown")})
            except:
                pass

        with concurrent.futures.ThreadPoolExecutor(max_workers=25) as executor:
            executor.map(check_port, ports)
        found["open"].sort(key=lambda x: x["port"])
        return {"hostname": hostname, "ports": found, "total_open": len(found["open"])}

    def url_fuzz(self, base_url, paths=None):
        if paths is None:
            paths = [
                "/robots.txt", "/.env", "/.git/config", "/admin", "/login",
                "/wp-admin", "/.htaccess", "/config.php", "/backup",
                "/.aws/credentials", "/sitemap.xml", "/.gitignore",
                "/.DS_Store", "/crossdomain.xml", "/api", "/swagger.json",
                "/phpinfo.php", "/info.php", "/test.php", "/debug",
                "/.svn/entries", "/web.config", "/.htpasswd",
                "/admin.php", "/setup", "/install", "/.well-known/security.txt",
                "/wp-content", "/assets", "/src", "/node_modules",
                "/package.json", "/.npmrc", "/docker-compose.yml",
                "/.dockerignore", "/env", "/config", "/database.yml",
            ]
        results = []
        for path in paths:
            try:
                url = base_url.rstrip("/") + path
                resp = self._request(url, timeout=3)
                if resp["status"] < 400 or resp["status"] == 403 or resp["status"] == 429:
                    results.append({"path": path, "status": resp["status"]})
            except:
                pass
        return {"base_url": base_url, "found": len(results), "results": results}

    def get_headers(self, url):
        try:
            resp = self._request(url, timeout=5)
            return {"url": resp["url"], "status": resp["status"], "headers": resp["headers"]}
        except Exception as e:
            return {"url": url, "error": str(e)}

    def get_ssl_info(self, hostname, port=443):
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=5) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    return {
                        "hostname": hostname,
                        "port": port,
                        "subject": {k: v for d in cert.get("subject", []) for k, v in d},
                        "issuer": {k: v for d in cert.get("issuer", []) for k, v in d},
                        "version": cert.get("version"),
                        "expires": cert.get("notAfter"),
                        "issued": cert.get("notBefore"),
                        "serial": cert.get("serialNumber"),
                        "alpn": ssock.selected_alpn_protocol(),
                        "cipher": cipher[0] if cipher else None,
                        "ssl_version": cipher[1] if cipher else None,
                    }
        except Exception as e:
            return {"hostname": hostname, "error": str(e)}

    def set_user_agent(self, ua):
        self.user_agent = ua
        return {"status": "ok", "user_agent": ua[:80]}

    def get_user_agent(self):
        return {"user_agent": self.user_agent}

    def set_proxy(self, proxy_url):
        self._proxy_enabled = True
        self._proxy_url = proxy_url
        return {"status": "ok", "proxy": proxy_url}

    def clear_proxy(self):
        self._proxy_enabled = False
        self._proxy_url = None
        return {"status": "ok", "proxy": None}

    def get_proxy(self):
        return {"enabled": self._proxy_enabled, "proxy": self._proxy_url}

    def whois_lookup(self, domain):
        import subprocess
        try:
            result = subprocess.run(["whois", domain], capture_output=True, text=True, timeout=10)
            return {"domain": domain, "output": result.stdout[:2000]}
        except Exception as e:
            return {"domain": domain, "error": str(e)}
