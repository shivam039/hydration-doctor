import { createServer } from "node:http";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const reactRoot = dirname(fileURLToPath(import.meta.resolve("react")));
const reactDomRoot = dirname(fileURLToPath(import.meta.resolve("react-dom")));
const frameworkBundles = new Map([
  ["/react.js", resolve(reactRoot, "umd/react.development.js")],
  ["/react-dom.js", resolve(reactDomRoot, "umd/react-dom.development.js")],
]);

export async function startNavigationFixture({
  clientMode = "spa",
  externalResourceUrl,
} = {}) {
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
    if (pathname === "/empty-data") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        '<html><body><main><p id="status">No records found</p></main></body></html>',
      );
      return;
    }
    if (pathname === "/form-controls") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        '<html><body><main><label for="plan">Plan</label><select id="plan"><option value="basic">Basic</option><option value="hydration-private-option">Premium</option></select><label><input id="alerts" type="checkbox"> Alerts</label><input id="updates" type="checkbox" checked><p id="ready">Controls ready</p></main></body></html>',
      );
      return;
    }
    if (pathname === "/responsive-visual") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        "<html><head><style>body{margin:0}main{height:240px;width:70vw;background:#146e91;color:white;padding:16px;box-sizing:border-box}@media(max-width:900px){main{width:80vw;height:210px;background:#477b35}}@media(max-width:600px){main{width:100vw;height:180px;background:#ac2e10}}</style></head><body><main>Responsive visual fixture</main></body></html>",
      );
      return;
    }
    if (
      pathname === "/state-restoration" ||
      pathname === "/state-restoration-broken"
    ) {
      const broken = pathname.endsWith("-broken");
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main><p id="preference"></p></main><script>const key='hd-fixture-preference';const loads=Number(sessionStorage.getItem('hd-loads')||'0')+1;sessionStorage.setItem('hd-loads',String(loads));if(!localStorage.getItem(key))localStorage.setItem(key,'blue');${broken ? "if(loads>1)localStorage.removeItem(key);" : ""}document.querySelector('#preference').textContent=localStorage.getItem(key)?'Preference restored':'Preference missing';</script></body></html>`,
      );
      return;
    }
    if (pathname === "/auth-protected") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main>Loading account</main><script>if(localStorage.getItem('hd-auth-state')==='authenticated-fixture-state'){document.querySelector('main').textContent='Account dashboard'}else{location.replace('/auth-sign-in')}</script></body></html>`,
      );
      return;
    }
    if (pathname === "/auth-sign-in") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<html><body><main>Sign in required</main></body></html>");
      return;
    }
    if (pathname === "/missing-sidebar") {
      const hits = (renderingHits.get(pathname) ?? 0) + 1;
      renderingHits.set(pathname, hits);
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main>${hits === 1 ? "<aside>Account navigation</aside>" : ""}<section><h1>Account content</h1></section></main></body></html>`,
      );
      return;
    }
    if (pathname === "/masked-visual") {
      const hits = (renderingHits.get(pathname) ?? 0) + 1;
      renderingHits.set(pathname, hits);
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main><div id="volatile" style="width:300px;height:80px;background:#146e91;color:white">Dynamic label ${hits}</div><p>Stable content</p></main></body></html>`,
      );
      return;
    }
    if (
      pathname === "/hydration-button-broken" ||
      pathname === "/hydration-button-gated"
    ) {
      const gated = pathname.endsWith("gated");
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main><button id="save" ${gated ? "disabled" : ""}>Save</button><p id="result">Waiting</p></main><script>setTimeout(()=>{document.querySelector('#save').disabled=false;document.querySelector('#save').addEventListener('click',()=>{document.querySelector('#result').textContent='Saved'});document.documentElement.dataset.hydrated='true'},800)</script></body></html>`,
      );
      return;
    }
    if (
      pathname === "/hydration-input-reset" ||
      pathname === "/hydration-input-gated"
    ) {
      const gated = pathname.endsWith("gated");
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main><label>Display name <input id="profile" ${gated ? "disabled" : ""}></label></main><script>setTimeout(()=>{const field=document.querySelector('#profile');${gated ? "field.disabled=false;" : "field.value='';"}document.documentElement.dataset.hydrated='true'},350)</script></body></html>`,
      );
      return;
    }
    if (pathname === "/hydration-form") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        '<html><body><main><form><label>Name <input id="name" name="name"></label><button id="submit" type="submit">Submit</button></form><p id="result">Waiting</p></main><script>document.querySelector("form").addEventListener("submit",event=>{event.preventDefault();document.querySelector("#result").textContent="Thank you, "+document.querySelector("#name").value})</script></body></html>',
      );
      return;
    }
    if (pathname === "/keyboard-ready" || pathname === "/keyboard-broken") {
      const broken = pathname.endsWith("broken");
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main><label>Command <input id="command"></label><p id="result">Waiting</p></main><script>${broken ? "" : "document.querySelector('#command').addEventListener('keydown',event=>{if(event.key==='Enter')document.querySelector('#result').textContent='Opened'});"}document.documentElement.dataset.hydrated='true'</script></body></html>`,
      );
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
    if (pathname === "/external-resource") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main>External resource fixture</main><script src="${externalResourceUrl}"></script></body></html>`,
      );
      return;
    }
    if (pathname === "/console-flood") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        `<html><body><main>Console fixture</main><script>for(let i=0;i<75;i++)console.error('fixture error '+i)</script></body></html>`,
      );
      return;
    }
    if (pathname === "/compressed-evidence") {
      const body = gzipSync(
        "<html><body><main>Compressed fixture</main></body></html>",
      );
      response.writeHead(200, {
        "content-type": "text/html",
        "content-encoding": "gzip",
        "content-length": body.length,
      });
      response.end(body);
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
      `<html><body><main><a href="/client">Client route</a><h1>Healthy</h1></main>${clientMode.startsWith("spa") ? `<script>document.querySelector('a').addEventListener('click', (event) => { event.preventDefault(); history.pushState({}, '', '/client'); document.querySelector('main').innerHTML = '${clientMode === "spa-broken" ? "<h1>Stale client view</h1>" : "<h1>Client view</h1>"}'; });</script>` : ""}</body></html>`,
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}
