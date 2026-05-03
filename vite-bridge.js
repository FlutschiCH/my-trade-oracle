import { createServer } from "vite";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MASTER_ROOT = __dirname;

/**
 * Creates a bridge server that hosts a Vite instance in middleware mode.
 * This has been simplified to mostly boilerplate, as all the complex file
 * resolution and caching logic now lives in the `virtual-project-fs-cache`
 * plugin within `vite.config.ts`.
 */

// Clear stale Vite cache on startup to prevent "missing chunk" errors
const viteCacheDir = path.resolve(MASTER_ROOT, "node_modules", ".vite");
if (fs.existsSync(viteCacheDir)) {
  console.log("[Vite Bridge] 🧹 Clearing stale .vite cache...");
  fs.rmSync(viteCacheDir, { recursive: true, force: true });
}

function isOptimizablePackage(pkgName) {
  if (pkgName.startsWith("@types/")) return false;
  const exclude = [
    "vite",
    "typescript",
    "tailwindcss",
    "autoprefixer",
    "postcss",
    "eslint",
    "lovable-tagger",
    "tw-animate-css",
    "npm-run-path",
    "unicorn-magic",
  ];
  if (exclude.includes(pkgName)) return false;

  try {
    const depPkgJsonPath = path.resolve(
      MASTER_ROOT,
      "node_modules",
      pkgName,
      "package.json",
    );
    if (fs.existsSync(depPkgJsonPath)) {
      const depPkg = JSON.parse(fs.readFileSync(depPkgJsonPath, "utf-8"));
      if (depPkg.exports) {
        if (typeof depPkg.exports === "string" || Array.isArray(depPkg.exports))
          return true;
        if (depPkg.exports["."]) return true;
        if (Object.keys(depPkg.exports).some((k) => !k.startsWith(".")))
          return true;
        return false; // Package only has deep imports (e.g., @tiptap/pm)
      }
      if (depPkg.main || depPkg.module) return true;
      if (
        fs.existsSync(
          path.resolve(MASTER_ROOT, "node_modules", pkgName, "index.js"),
        )
      )
        return true;
      return false; // No apparent entry point
    }
  } catch (e) {}
  return false;
}

// Automatically extract all dependencies from package.json
const pkgPath = path.resolve(MASTER_ROOT, "package.json");
let dynamicDeps = [];
try {
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    dynamicDeps = Object.keys(allDeps).filter(isOptimizablePackage);
  }
} catch (e) {
  console.warn(
    "[Vite Bridge] ⚠️ Could not read package.json for deps optimization",
  );
}

// Explicitly add deep imports that aren't top-level package.json keys
const deepImports = ["react/jsx-dev-runtime", "react-dom/client"];
const optimizeInclude = [...new Set([...dynamicDeps, ...deepImports])];

const installingProjects = new Set();
const warmedUpProjects = new Set();

async function createBridge() {
  const vite = await createServer({
    configFile: path.resolve(MASTER_ROOT, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: {
      include: optimizeInclude,
      entries: [],
    },
  });

  const server = http.createServer((req, res) => {
    // 🛑 CACHE CLEARING & WARMING ENDPOINTS
    if (
      req.method === "POST" &&
      (req.url === "/__clear_cache" || req.url === "/__warm_cache")
    ) {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", () => {
        try {
          const { projectId, filePath } = JSON.parse(body);
          console.log(
            `[Vite Bridge] 🧹 Invalidating memory cache for project ${projectId} (${req.url})`,
          );

          if (filePath === "*" || !filePath) {
            // Nuke the entire project from Vite's memory
            for (const [id, mod] of vite.moduleGraph.idToModuleMap.entries()) {
              if (id.includes(`/project/${projectId}/`)) {
                vite.moduleGraph.invalidateModule(mod);
              }
            }
            // Nuke the entire client window if a wildcard was sent
            vite.ws.send({ type: 'full-reload' });
          } else {
            // Invalidate a specific file
            const normalizedPath = filePath.startsWith("/")
              ? filePath
              : `/${filePath}`;
            const updates = [];
            let needsFullReload = false;

            const invalidateChain = (mod, seen = new Set()) => {
              if (seen.has(mod)) return;
              seen.add(mod);
              vite.moduleGraph.invalidateModule(mod);
              if (mod.importers) {
                mod.importers.forEach((importer) => invalidateChain(importer, seen));
              }
            };

            for (const [id, mod] of vite.moduleGraph.idToModuleMap.entries()) {
              if (id.includes(`/project/${projectId}${normalizedPath}`)) {
                invalidateChain(mod);
                
                // Send HMR updates directly to the connected iframe
                if (filePath.endsWith('.html')) {
                  needsFullReload = true;
                } else {
                  if (filePath.endsWith('.css')) {
                    updates.push({
                      type: 'css-update',
                      path: mod.url,
                      acceptedPath: mod.url,
                      timestamp: Date.now()
                    });
                  } else {
                    needsFullReload = true;
                  }
                }
              }
            }
            
            if (needsFullReload) {
              console.log(`[Vite Bridge] 🔄 Pushing full-reload for ${filePath}`);
              vite.ws.send({ type: 'full-reload' });
            } else if (updates.length > 0) {
              console.log(`[Vite Bridge] 🔄 Pushing HMR update for ${filePath}`);
              vite.ws.send({ type: 'update', updates });
            }
          }
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 400;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // === DEBUG LOGGING START ===
    const start = Date.now();
    const originalUrl = req.url;

    // 🛑 DEBUG TRAP: Catch any incoming request that contains a hash
    if (originalUrl.includes("#")) {
      console.log(
        `\n=== 🛑 [DEBUG Hash Request] vite-bridge received: ${originalUrl} ===\n`,
      );
    }

    // 🛑 RECOVERY TRAP: Strip stale @id virtual prefixes
    // Vite's module graph can desync, causing /@id/ requests to 404 without hitting plugins.
    // By stripping the prefix, we force Vite to treat it as a fresh project file request!
    const virtualMatch = req.url.match(
      /\/@id\/(?:__x00__|%00)?virtual:(\/project\/.*)/,
    );
    if (virtualMatch) {
      req.url = virtualMatch[1];
      console.log(
        `[Vite Bridge] Recovered stale @id request -> ${req.url}`
      );
    }

    // 🛑 MEDIA ASSET DIRECT ROUTING
    // If the request is for a media asset within the virtual project path, we rewrite it
    // directly to its physical /@fs/ path. This ensures assets always load even if the
    // Vite module graph desyncs and drops the virtual ID.
    const mediaMatch = req.url.match(
      /^\/project\/([^/]+)\/(.*\.(?:png|jpe?g|gif|svg|webp|woff2?|ttf|eot|mp4|webm|ogg|mp3|wav|ico))((\?.*)?)$/i,
    );
    if (mediaMatch) {
      const projectId = mediaMatch[1];
      const filePath = mediaMatch[2];
      const query = mediaMatch[3] || "";
      const baseCacheDir = path.resolve(MASTER_ROOT, "..", ".project_cache");
      const absolutePath = path.resolve(baseCacheDir, projectId, filePath);
      req.url = `/@fs/${absolutePath.replace(/\\/g, "/")}${query}`;
    }

    // 🚀 FAST PATH: Bypass Vite completely for raw media assets
    // When the browser requests the raw image (e.g. /@fs/d:/...), we serve it directly via Node.js fs.
    // This avoids Virtual FS plugin overhead and dramatically increases loading speeds for assets.
    const fsMediaMatch = req.url.match(
      /^\/@fs\/(.*\.(?:png|jpe?g|gif|svg|webp|woff2?|ttf|eot|mp4|webm|ogg|mp3|wav|ico))((\?.*)?)$/i,
    );

    if (fsMediaMatch) {
      const fsPath = decodeURIComponent(fsMediaMatch[1]);
      const mediaQuery = fsMediaMatch[2] || "";
      
      // If it has ?import, Vite needs to transform it into a JS module.
      // If not, it's a raw asset request from the browser, which we can serve instantly.
      if (!mediaQuery.includes('import')) {
        try {
          // Normalize path for Windows (e.g. /C:/... -> C:/...)
          let absoluteMediaPath = fsPath;
          if (process.platform === 'win32' && absoluteMediaPath.match(/^\/[a-zA-Z]:/)) {
            absoluteMediaPath = absoluteMediaPath.slice(1);
          }

          if (fs.existsSync(absoluteMediaPath)) {
            const ext = path.extname(absoluteMediaPath).toLowerCase();
            const mimeTypes = {
              '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
              '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
              '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
              '.eot': 'application/vnd.ms-fontobject', '.mp4': 'video/mp4',
              '.webm': 'video/webm', '.ogg': 'video/ogg', '.mp3': 'audio/mpeg',
              '.wav': 'audio/wav', '.ico': 'image/x-icon'
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache'); // Prevent stale dev assets
            
            const stream = fs.createReadStream(absoluteMediaPath);
            stream.pipe(res);
            return; // Stop execution; Vite is fully bypassed!
          }
        } catch (e) {
          console.warn(`[Vite Bridge] Fast-path media serve failed: ${e.message}`);
        }
      }
    }

    // 1. Check if the request is for a Vite system asset, even if prefixed with a project path or subdirectories.
    // e.g., /project/123/@vite/client or /project/123/frontend/@vite/client -> /@vite/client
    const systemAssetPattern =
      /(\/(@vite|node_modules|@react-refresh|@id|@fs).*)/;

    if (req.url.startsWith("/project/")) {
      const match = req.url.match(systemAssetPattern);
      if (match) {
        // Strip the project prefix and any subdirectories to let Vite recognize the request.
        req.url = match[1];
      }
    }

    // 2. Identify if the request is for a core system module.
    const isSystem =
      req.url.startsWith("/@") ||
      req.url.includes("node_modules") ||
      req.url.includes("vite/dist") ||
      req.url.endsWith(".mjs");

    // 3. For relative asset requests from within a project, map them to the correct project path using the Referer header.
    // e.g., a request for /logo.png from a page at /project/123/ should become /project/123/logo.png
    if (!isSystem && !req.url.startsWith("/project/")) {
      const referer = req.headers.referer;
      if (referer) {
        const match = referer.match(
          /\/(?:project|preview\/[^/]+|user_projects\/[^/]+)\/([^/]+)/,
        );
        if (match) {
          req.url = path.posix.join(`/project/${match[1]}`, req.url);
        }
      }
    }

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        console.error(
          `[FORCE_LOG] ❌ RESPONSE ERROR: ${res.statusCode} for ${originalUrl} -> ${req.url} (took ${duration}ms)`,
        );
      }
    });

    // 4. Hand off to Vite, with SPA fallback logic per user instructions.
    return vite.middlewares(req, res, async () => {
      // This callback is reached if Vite's middleware doesn't find a file.
      // We now handle the SPA fallback here.
      if (
        req.method === "GET" &&
        (req.url.includes(".html") || req.headers.accept?.includes("text/html"))
      ) {
        // Extract the project ID and the exact HTML path requested (e.g. index.html)
        const match =
          req.url.match(/^\/project\/([^/]+)\/(.*\.html)/i) ||
          req.url.match(/^\/project\/([^/]+)/);
        if (match) {
          const projectId = match[1];
          const htmlPath = match[2] || "index.html"; // Defaults to index.html if regex #2 matched
          const baseCacheDir = path.resolve(
            MASTER_ROOT,
            "..",
            ".project_cache",
          );
          const projectCacheDir = path.join(baseCacheDir, projectId);
          const indexPath = path.join(projectCacheDir, htmlPath.split("?")[0]);

          // 🚀 BULK INSTALL & WARM UP: Read the project's package.json to bulk install
          // missing dependencies and force Vite to optimize them in one single batch.
          if (
            !installingProjects.has(projectId) &&
            !warmedUpProjects.has(projectId)
          ) {
            installingProjects.add(projectId);
            try {
              const projPkgPath = path.join(projectCacheDir, "package.json");
              const masterPkgPath = path.join(MASTER_ROOT, "package.json");

              if (fs.existsSync(projPkgPath) && fs.existsSync(masterPkgPath)) {
                const projPkg = JSON.parse(
                  fs.readFileSync(projPkgPath, "utf-8"),
                );
                const masterPkg = JSON.parse(
                  fs.readFileSync(masterPkgPath, "utf-8"),
                );

                const projDeps = {
                  ...projPkg.dependencies,
                  ...projPkg.devDependencies,
                };
                const masterDeps = {
                  ...masterPkg.dependencies,
                  ...masterPkg.devDependencies,
                };
                const excludeFromOptimize = [
                  "vite",
                  "typescript",
                  "tailwindcss",
                  "autoprefixer",
                  "postcss",
                  "eslint",
                  "lovable-tagger",
                  "playwright-core",
                  "@vitejs/plugin-react",
                  "@vitejs/plugin-react-swc",
                  "@swc/core",
                  "@typescript-eslint/utils",
                  "@typescript-eslint/eslint-plugin",
                  "@testing-library/dom",
                  "tw-animate-css",
                ];

                const missingDeps = Object.keys(projDeps).filter(
                  (d) =>
                    !masterDeps[d] &&
                    !excludeFromOptimize.includes(d) &&
                    !d.startsWith("@types/"),
                );

                if (missingDeps.length > 0) {
                  console.log(
                    `\n[Vite Bridge] 📦 Bulk installing missing dependencies for project: ${missingDeps.join(", ")}`,
                  );
                  execSync(
                    `npm install --save --legacy-peer-deps --no-audit --no-fund ${missingDeps.join(" ")}`,
                    { cwd: MASTER_ROOT, stdio: "inherit" },
                  );
                  console.log(
                    `[Vite Bridge] ✅ Bulk install complete. Restarting Vite server...`,
                  );
                  await vite.restart();

                  // Mid-request restart invalidates the Vite instance for this connection.
                  // Return an auto-reloading script to gracefully retry the page load.
                  if (!res.writableEnded) {
                    res.setHeader("Content-Type", "text/html");
                    res.statusCode = 200;
                    res.end("<script>window.location.reload();</script>");
                  }
                  return;
                }

                const allDepsToWarmup = Object.keys(projDeps).filter(
                  (d) =>
                    !excludeFromOptimize.includes(d) &&
                    !d.startsWith("@types/"),
                );
                Promise.all(
                  allDepsToWarmup.map((dep) =>
                    vite.transformRequest(dep).catch(() => {}),
                  ),
                );
                warmedUpProjects.add(projectId);
              }
            } catch (e) {
              console.warn(
                `[Vite Bridge] ⚠️ Failed to bulk install or warm up dependencies:`,
                e.message,
              );
            } finally {
              installingProjects.delete(projectId);
            }
          }

          try {
            if (fs.existsSync(indexPath)) {
              const htmlContent = fs.readFileSync(indexPath, "utf-8");
              // Use vite.transformIndexHtml to inject HMR client and plugins
              const transformedHtml = await vite.transformIndexHtml(
                req.url,
                htmlContent,
              );
              res.setHeader("Content-Type", "text/html");
              res.statusCode = 200;
              res.end(transformedHtml);
            } else {
              throw new Error("index.html not found in cache");
            }
          } catch (e) {
            console.error(
              `[Vite Bridge] SPA Fallback Error for project ${projectId}:`,
              e,
            );
            if (!res.writableEnded) {
              res.setHeader("Content-Type", "text/html");
              res.statusCode = 404;
              res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Missing</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #09090b; color: #f8fafc; margin: 0; text-align: center; padding: 20px; }
        .container { max-width: 500px; padding: 40px; background: #18181b; border-radius: 16px; box-shadow: 0 4px 30px rgba(0,0,0,0.5); border: 1px solid #27272a; }
        .icon { width: 64px; height: 64px; margin-bottom: 24px; color: #ef4444; }
        h1 { margin-top: 0; color: #f8fafc; font-size: 24px; font-weight: 600; margin-bottom: 12px; }
        p { color: #a1a1aa; line-height: 1.6; margin-bottom: 32px; font-size: 15px; }
        a.btn { color: #fff; text-decoration: none; font-weight: 500; font-size: 14px; padding: 12px 24px; border-radius: 8px; background: #5865F2; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        a.btn:hover { background: #4752C4; }
        code { background: #09090b; padding: 2px 6px; border-radius: 4px; color: #e2e8f0; font-size: 13px; font-family: monospace; border: 1px solid #27272a; }
    </style>
</head>
<body>
    <div class="container">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <h1>File Not Found</h1>
        <p>We couldn't find <code>index.html</code> in the project cache. The project might be empty, or the AI agent is still writing the initial files.</p>
        <a href="https://discord.gg/vKzepKWez4" class="btn" target="_blank">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
            Ask in Discord for Help
        </a>
    </div>
</body>
</html>
              `);
            }
          }
          return; // Request handled
        }
      }

      // If it's not an SPA fallback request, it's a genuine 404.
      if (!res.writableEnded) {
        res.statusCode = 404;
        res.end("Not Found");
      }
    });
  });

  const PORT = process.env.PORT || 5173;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[Vite Bridge] 🚀 Server is ready and listening on http://localhost:${PORT}`,
    );
  });
}

createBridge();
