import { createServer } from "node:http";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const reactRoot = dirname(fileURLToPath(import.meta.resolve("react")));
const reactDomRoot = dirname(fileURLToPath(import.meta.resolve("react-dom")));
const frameworkBundles = new Map([
  ["/react.js", resolve(reactRoot, "umd/react.development.js")],
  ["/react-dom.js", resolve(reactDomRoot, "umd/react-dom.development.js")],
]);

export async function startNavigationFixture({ clientMode = "spa" } = {}) {
  let refreshOnlyHits = 0;
  let flakyHits = 0;
  const renderingHits = new Map();
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://fixture.invalid").pathname;
    if (frameworkBundles.has(pathname)) {
      response.writeHead(200, { "content-type": "text/javascript" });
      response.end(await readFile(frameworkBundles.get(pathname)));
      return;
    }
    if (pathname === "/broken") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<html><body><h1>Broken route</h1></body></html>");
      return;
    }
    if (
      pathname === "/expected-redirect" ||
      pathname === "/unexpected-redirect"
    ) {
      response.writeHead(302, { location: "/client?tab=active#content" });
      response.end();
      return;
    }
    if (pathname === "/client") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        "<html><body><main><h1>Client view</h1></main></body></html>",
      );
      return;
    }
    if (pathname === "/refresh-only") {
      refreshOnlyHits += 1;
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        refreshOnlyHits === 3
          ? "<html><body><h1>Missing after refresh</h1></body></html>"
          : "<html><body><main><h1>Present</h1></main></body></html>",
      );
      return;
    }
    if (pathname === "/flaky") {
      flakyHits += 1;
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        flakyHits === 1
          ? "<html><body><h1>Not ready</h1></body></html>"
          : "<html><body><main><h1>Ready</h1></main></body></html>",
      );
      return;
    }
    if (pathname === "/varying-render" || pathname === "/dynamic-render") {
      const hits = (renderingHits.get(pathname) ?? 0) + 1;
      renderingHits.set(pathname, hits);
      const label = hits === 3 ? "refresh" : "direct";
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main><p>Stable content</p><span data-volatile="true">${label} token ${hits}</span></main></body></html>`,
      );
      return;
    }
    if (pathname === "/hydration-warning" || pathname === "/react-healthy") {
      const serverText =
        pathname === "/hydration-warning" ? "server text" : "same text";
      const clientText =
        pathname === "/hydration-warning" ? "client text" : "same text";
      const html = `<html><body><div id="root"><p>${serverText}</p></div><script src="/react.js"></script><script src="/react-dom.js"></script><script>function App(){React.useEffect(()=>{document.documentElement.dataset.hydrated='true'},[]);return React.createElement('p',null,'${clientText}')}ReactDOM.hydrateRoot(document.getElementById('root'),React.createElement(App));</script></body></html>`;
      response.writeHead(200, {
        "content-type": "text/html",
        "content-length": Buffer.byteLength(html),
      });
      response.end(html);
      return;
    }
    if (pathname === "/generic-console-error") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main>Rendered</main><script>console.error('A generic application error');</script></body></html>`,
      );
      return;
    }
    if (pathname === "/sensitive-evidence") {
      const html = `<html><body><main>token=private-value</main></body></html>`;
      response.writeHead(200, {
        "content-type": "text/html",
        "content-length": Buffer.byteLength(html),
      });
      response.end(html);
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(
      `<html><body><main><a href="/client">Client route</a><h1>Healthy</h1></main>${clientMode === "spa" ? `<script>document.querySelector('a').addEventListener('click', (event) => { event.preventDefault(); history.pushState({}, '', '/client'); document.querySelector('main').innerHTML = '<h1>Client view</h1>'; });</script>` : ""}</body></html>`,
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}
