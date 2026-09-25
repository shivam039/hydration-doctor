import { createServer } from "node:http";
import { once } from "node:events";

export async function startNavigationFixture({ clientMode = "spa" } = {}) {
  let refreshOnlyHits = 0;
  const server = createServer((request, response) => {
    if (request.url === "/broken") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<html><body><h1>Broken route</h1></body></html>");
      return;
    }
    if (request.url === "/client") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        "<html><body><main><h1>Client view</h1></main></body></html>",
      );
      return;
    }
    if (request.url === "/refresh-only") {
      refreshOnlyHits += 1;
      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        refreshOnlyHits === 3
          ? "<html><body><h1>Missing after refresh</h1></body></html>"
          : "<html><body><main><h1>Present</h1></main></body></html>",
      );
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
