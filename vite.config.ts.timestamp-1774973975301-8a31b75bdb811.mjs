// vite.config.ts
import { defineConfig } from "file:///d:/Coding/fluAgent/backend/user_projects/master_engine/node_modules/vite/dist/node/index.js";
import react from "file:///d:/Coding/fluAgent/backend/user_projects/master_engine/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import os from "os";
import tailwindcss from "file:///d:/Coding/fluAgent/backend/user_projects/master_engine/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///d:/Coding/fluAgent/backend/user_projects/master_engine/node_modules/autoprefixer/lib/autoprefixer.js";
import fs from "fs";
import { execSync } from "child_process";
import { isBuiltin } from "module";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///d:/Coding/fluAgent/backend/user_projects/master_engine/vite.config.ts";
var importerMap = /* @__PURE__ */ new Map();
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var MASTER_ROOT = __dirname;
function autoInstallPlugin() {
  const attemptedInstalls = /* @__PURE__ */ new Set();
  return {
    name: "vite-plugin-auto-install",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (source.startsWith(".") || source.startsWith("/") || source.startsWith("@/") || source.startsWith("\0") || source.startsWith("virtual:") || isBuiltin(source)) {
        return null;
      }
      const packageName = source.startsWith("@") ? source.split("/").slice(0, 2).join("/") : source.split("/")[0];
      if (attemptedInstalls.has(packageName)) {
        return null;
      }
      const resolution = await this.resolve(source, importer, {
        skipSelf: true,
        ...options
      });
      if (!resolution) {
        attemptedInstalls.add(packageName);
        try {
          let installCommand = `npm install ${packageName}`;
          if (packageName === "vitest") {
            installCommand = `npm install vitest@^2.1.0`;
          } else if (packageName === "eslint") {
            installCommand = `npm install eslint@^9.0.0`;
          }
          execSync(`${installCommand} --legacy-peer-deps`, {
            cwd: MASTER_ROOT,
            stdio: "inherit"
          });
        } catch (error) {
          console.error(
            `[Vite Bridge] \u274C Failed to auto-install ${packageName}.`
          );
        }
      }
      return null;
    }
  };
}
var VITE_PLUGIN_DEBUG = false;
function debugLog(...args) {
  if (VITE_PLUGIN_DEBUG) {
    console.log(...args);
  }
}
function getProjectCacheDir(projectId) {
  const baseCacheDir = path.resolve(MASTER_ROOT, "..", ".project_cache");
  return path.join(baseCacheDir, projectId);
}
function parseVirtualId(id) {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  const matches = [...id.matchAll(uuidPattern)];
  if (matches.length === 0) {
    console.error(
      `[Vite Bridge] \u26A0\uFE0F parseVirtualId could not find UUID in: ${id}`
    );
    return null;
  }
  const lastMatch = matches[matches.length - 1];
  const projectId = lastMatch[0];
  const startIndex = (lastMatch.index ?? 0) + lastMatch[0].length;
  const filePath = id.substring(startIndex).split("?")[0];
  return { projectId, filePath };
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
    "lovable-tagger"
  ];
  if (exclude.includes(pkgName)) return false;
  if (pkgName.startsWith("@vitejs/") || pkgName.includes("vite-plugin"))
    return false;
  try {
    const depPkgJsonPath = path.resolve(
      MASTER_ROOT,
      "node_modules",
      pkgName,
      "package.json"
    );
    if (fs.existsSync(depPkgJsonPath)) {
      const depPkg = JSON.parse(fs.readFileSync(depPkgJsonPath, "utf-8"));
      if (depPkg.main || depPkg.module) return true;
      if (depPkg.exports) {
        if (typeof depPkg.exports === "string" || Array.isArray(depPkg.exports))
          return true;
        if (depPkg.exports["."]) return true;
        if (depPkg.exports["import"] || depPkg.exports["require"] || depPkg.exports["default"])
          return true;
        return false;
      }
      if (fs.existsSync(
        path.resolve(MASTER_ROOT, "node_modules", pkgName, "index.js")
      ))
        return true;
      return false;
    }
  } catch (e) {
  }
  return true;
}
var pkgPath = path.resolve(MASTER_ROOT, "package.json");
var dynamicDeps = [];
try {
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    dynamicDeps = Object.keys(allDeps).filter(isOptimizablePackage);
  }
} catch (e) {
}
var autoDepsPath = path.resolve(MASTER_ROOT, ".vite-auto-deps.json");
var autoOptimizedDeps = [];
try {
  if (fs.existsSync(autoDepsPath)) {
    autoOptimizedDeps = JSON.parse(fs.readFileSync(autoDepsPath, "utf-8"));
  }
} catch (e) {
}
var vite_config_default = defineConfig({
  appType: "custom",
  // 1. Set the global build target
  build: {
    target: "es2022"
  },
  server: {
    fs: {
      allow: ["..", os.tmpdir()]
    },
    hmr: {
      protocol: "wss",
      host: "localhost"
    }
  },
  plugins: [
    {
      name: "cache-clear-middleware",
      configureServer(server) {
        server.middlewares.use("/__clear_cache", (req, res, next) => {
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk.toString());
            req.on("end", () => {
              try {
                const { projectId, filePath } = JSON.parse(body);
                const modsToInvalidate = /* @__PURE__ */ new Set();
                const baseFilePath = filePath.replace(/\.[tj]sx?$/, "");
                const variations = [
                  filePath,
                  `${baseFilePath}.ts`,
                  `${baseFilePath}.tsx`
                ];
                variations.forEach((fileVar) => {
                  modsToInvalidate.add(
                    `\0virtual:/project/${projectId}/${fileVar}`
                  );
                  modsToInvalidate.add(
                    `virtual:/project/${projectId}/${fileVar}`
                  );
                });
                let invalidated = false;
                for (const modId of modsToInvalidate) {
                  const mod = server.moduleGraph.getModuleById(modId);
                  if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                    invalidated = true;
                  }
                }
                if (invalidated) {
                  server.ws.send({ type: "full-reload" });
                }
                res.statusCode = 200;
                res.end("OK");
              } catch (e) {
                res.statusCode = 400;
                res.end("Error");
              }
            });
          } else {
            next();
          }
        });
        server.middlewares.use("/__warm_cache", (req, res, next) => {
          if (req.method === "POST") {
            res.statusCode = 200;
            res.end("OK");
          } else {
            next();
          }
        });
      }
    },
    react(),
    autoInstallPlugin(),
    {
      name: "virtual-project-fs-cache",
      enforce: "pre",
      async resolveId(source, importer) {
        if (source.includes("#")) {
          console.log(
            `
=== \u{1F6D1} [DEBUG Hash resolveId] source: "${source}"
  -> importer: "${importer}" ===
`
          );
        }
        const [cleanSource, query] = source.split("?");
        const queryStr = query ? `?${query}` : "";
        if (source.startsWith("/@") || source.includes("node_modules") || !source.startsWith(".") && !source.startsWith("/") && !source.startsWith("@/") && !source.startsWith("virtual:")) {
          return null;
        }
        let resolved = "";
        if (cleanSource.startsWith("virtual:/project/")) {
          return source;
        } else if (cleanSource.startsWith("/project/")) {
          resolved = cleanSource;
        } else if (importer?.includes("virtual:")) {
          const parsed = parseVirtualId(importer);
          if (!parsed) {
            console.error(
              `[Vite Bridge] \u26A0\uFE0F resolveId failed to parse virtual importer: ${importer}`
            );
            return null;
          }
          const { projectId, filePath: importerFilePath } = parsed;
          const importerPath = `/project/${projectId}${importerFilePath}`;
          if (cleanSource.startsWith("@/")) {
            resolved = `/project/${projectId}/src/${cleanSource.slice(2)}`;
          } else if (cleanSource.startsWith("/src/")) {
            resolved = `/project/${projectId}${cleanSource}`;
          } else {
            resolved = path.posix.resolve(
              path.posix.dirname(importerPath),
              cleanSource
            );
          }
        } else {
          return null;
        }
        const hasKnownExt = /\.(tsx|ts|jsx|js|css|html|json|png|jpe?g|gif|svg|webp|woff2?|ttf|eot|mp4|webm|ogg|mp3|wav|ico)(\?.*)?$/i.test(
          resolved
        );
        let finalPath = resolved;
        if (!hasKnownExt) {
          const match = resolved.match(/^\/project\/([^/]+)\/(.*)$/);
          if (match) {
            const [_, projectId, filePathPart] = match;
            const projectCacheDir = getProjectCacheDir(projectId);
            const physicalBaseDir = projectCacheDir;
            const pathsToTry = [
              `${filePathPart}.tsx`,
              `${filePathPart}.ts`,
              `${filePathPart}.jsx`,
              `${filePathPart}.js`,
              `${filePathPart}/index.tsx`,
              `${filePathPart}/index.ts`,
              `${filePathPart}.json`
            ];
            let found = false;
            for (const tryPath of pathsToTry) {
              if (fs.existsSync(path.resolve(physicalBaseDir, tryPath))) {
                finalPath = `/project/${projectId}/${tryPath}`;
                found = true;
                break;
              }
            }
            if (!found) {
              debugLog(
                `[Vite config -> resolveId] \u26A0\uFE0F File not found physically in cache, letting Vite handle it.`
              );
              return null;
            }
          }
        }
        if (finalPath.endsWith(".ts")) {
          const tsxPart = finalPath.replace(/\.ts$/, ".tsx");
          const match = tsxPart.match(/^\/project\/([^/]+)\/(.*)$/);
          if (match) {
            const projectId = match[1];
            const projectCacheDir = getProjectCacheDir(projectId);
            if (fs.existsSync(path.resolve(projectCacheDir, match[2]))) {
              finalPath = tsxPart;
            }
          }
        }
        importerMap.set(finalPath.split("?")[0], importer || "Root");
        return `virtual:${finalPath}${queryStr}`;
      },
      async load(id) {
        if (!id.includes("virtual:/project/")) return null;
        const loadStart = Date.now();
        const parsed = parseVirtualId(id);
        if (!parsed) {
          console.error(`[Vite Bridge] \u274C load hook failed to parse ID: ${id}`);
          return null;
        }
        const { projectId, filePath } = parsed;
        const projectCacheDir = getProjectCacheDir(projectId);
        const absolutePath = path.resolve(
          projectCacheDir,
          filePath.startsWith("/") ? filePath.slice(1) : filePath
        );
        if (!absolutePath.startsWith(projectCacheDir)) {
          console.error(
            `[Vite Bridge] Security Error: Outside cache: ${absolutePath}`
          );
          return null;
        }
        const isMediaAsset = /\.(png|jpe?g|gif|svg|webp|woff2?|ttf|eot|mp4|webm|ogg|mp3|wav|ico)(\?.*)?$/i.test(
          filePath
        );
        if (isMediaAsset) {
          return `export default "/@fs/${absolutePath.replace(/\\/g, "/")}";`;
        }
        try {
          if (fs.existsSync(absolutePath)) {
            const content = fs.readFileSync(absolutePath, "utf-8");
            return content;
          }
        } catch (e) {
          console.error(`[Vite Bridge] \u274C Error loading: ${absolutePath}`, e);
          return null;
        }
        const cleanId = id.replace(/\0?virtual:/g, "").split("?")[0];
        const whoImported = importerMap.get(cleanId) || "Unknown";
        console.error(
          `
[Vite Bridge] \u274C MISSING FILE: ${filePath}
  -> Imported by: ${whoImported}
  -> Absolute Path Tried: ${absolutePath}
  -> Full ID: ${id}
`
        );
        return null;
      }
    }
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(path.resolve(MASTER_ROOT, "./tailwind.config.js")),
        autoprefixer()
      ]
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022"
    },
    exclude: [
      "virtual",
      "@testing-library/dom",
      "@swc/core",
      "eslint",
      "playwright-core",
      // Add this
      "@typescript-eslint/utils",
      "@typescript-eslint/eslint-plugin",
      "@vitejs/plugin-react",
      "@vitejs/plugin-react-swc"
    ],
    include: [...dynamicDeps, ...autoOptimizedDeps]
    // noDiscovery: true, // Commented out to allow Vite to optimize new imports on the fly
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJkOlxcXFxDb2RpbmdcXFxcZmx1QWdlbnRcXFxcYmFja2VuZFxcXFx1c2VyX3Byb2plY3RzXFxcXG1hc3Rlcl9lbmdpbmVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcImQ6XFxcXENvZGluZ1xcXFxmbHVBZ2VudFxcXFxiYWNrZW5kXFxcXHVzZXJfcHJvamVjdHNcXFxcbWFzdGVyX2VuZ2luZVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vZDovQ29kaW5nL2ZsdUFnZW50L2JhY2tlbmQvdXNlcl9wcm9qZWN0cy9tYXN0ZXJfZW5naW5lL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBQbHVnaW4gfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwidGFpbHdpbmRjc3NcIjtcclxuaW1wb3J0IGF1dG9wcmVmaXhlciBmcm9tIFwiYXV0b3ByZWZpeGVyXCI7XHJcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xyXG5pbXBvcnQgeyBpc0J1aWx0aW4gfSBmcm9tIFwibW9kdWxlXCI7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwidXJsXCI7XHJcblxyXG5jb25zdCBpbXBvcnRlck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XHJcbmNvbnN0IERFQlVHX0ZJTEVOQU1FID0gXCJcIjtcclxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XHJcbmNvbnN0IE1BU1RFUl9ST09UID0gX19kaXJuYW1lO1xyXG5cclxuZnVuY3Rpb24gYXV0b0luc3RhbGxQbHVnaW4oKTogUGx1Z2luIHtcclxuICBjb25zdCBhdHRlbXB0ZWRJbnN0YWxscyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogXCJ2aXRlLXBsdWdpbi1hdXRvLWluc3RhbGxcIixcclxuICAgIGVuZm9yY2U6IFwicHJlXCIsXHJcbiAgICBhc3luYyByZXNvbHZlSWQoc291cmNlLCBpbXBvcnRlciwgb3B0aW9ucykge1xyXG4gICAgICBpZiAoXHJcbiAgICAgICAgc291cmNlLnN0YXJ0c1dpdGgoXCIuXCIpIHx8XHJcbiAgICAgICAgc291cmNlLnN0YXJ0c1dpdGgoXCIvXCIpIHx8XHJcbiAgICAgICAgc291cmNlLnN0YXJ0c1dpdGgoXCJAL1wiKSB8fFxyXG4gICAgICAgIHNvdXJjZS5zdGFydHNXaXRoKFwiXFwwXCIpIHx8XHJcbiAgICAgICAgc291cmNlLnN0YXJ0c1dpdGgoXCJ2aXJ0dWFsOlwiKSB8fFxyXG4gICAgICAgIGlzQnVpbHRpbihzb3VyY2UpXHJcbiAgICAgICkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHNvdXJjZS5zdGFydHNXaXRoKFwiQFwiKVxyXG4gICAgICAgID8gc291cmNlLnNwbGl0KFwiL1wiKS5zbGljZSgwLCAyKS5qb2luKFwiL1wiKVxyXG4gICAgICAgIDogc291cmNlLnNwbGl0KFwiL1wiKVswXTtcclxuXHJcbiAgICAgIGlmIChhdHRlbXB0ZWRJbnN0YWxscy5oYXMocGFja2FnZU5hbWUpKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlc29sdXRpb24gPSBhd2FpdCB0aGlzLnJlc29sdmUoc291cmNlLCBpbXBvcnRlciwge1xyXG4gICAgICAgIHNraXBTZWxmOiB0cnVlLFxyXG4gICAgICAgIC4uLm9wdGlvbnMsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKCFyZXNvbHV0aW9uKSB7XHJcbiAgICAgICAgYXR0ZW1wdGVkSW5zdGFsbHMuYWRkKHBhY2thZ2VOYW1lKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGxldCBpbnN0YWxsQ29tbWFuZCA9IGBucG0gaW5zdGFsbCAke3BhY2thZ2VOYW1lfWA7XHJcblxyXG4gICAgICAgICAgLy8gRm9yY2Ugc3BlY2lmaWMgdmVyc2lvbnMgZm9yIFZpdGUgNS40IGNvbXBhdGliaWxpdHlcclxuICAgICAgICAgIGlmIChwYWNrYWdlTmFtZSA9PT0gXCJ2aXRlc3RcIikge1xyXG4gICAgICAgICAgICBpbnN0YWxsQ29tbWFuZCA9IGBucG0gaW5zdGFsbCB2aXRlc3RAXjIuMS4wYDtcclxuICAgICAgICAgIH0gZWxzZSBpZiAocGFja2FnZU5hbWUgPT09IFwiZXNsaW50XCIpIHtcclxuICAgICAgICAgICAgaW5zdGFsbENvbW1hbmQgPSBgbnBtIGluc3RhbGwgZXNsaW50QF45LjAuMGA7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gQWRkIHRoZSBsZWdhY3ktcGVlci1kZXBzIGZsYWcgdG8gYnlwYXNzIHRoZSBFU0xpbnQvUmVhY3QtSG9va3MgY29uZmxpY3RcclxuICAgICAgICAgIGV4ZWNTeW5jKGAke2luc3RhbGxDb21tYW5kfSAtLWxlZ2FjeS1wZWVyLWRlcHNgLCB7XHJcbiAgICAgICAgICAgIGN3ZDogTUFTVEVSX1JPT1QsXHJcbiAgICAgICAgICAgIHN0ZGlvOiBcImluaGVyaXRcIixcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgICBgW1ZpdGUgQnJpZGdlXSBcdTI3NEMgRmFpbGVkIHRvIGF1dG8taW5zdGFsbCAke3BhY2thZ2VOYW1lfS5gLFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSxcclxuICB9O1xyXG59XHJcblxyXG5jb25zdCBWSVRFX1BMVUdJTl9ERUJVRyA9IGZhbHNlOyAvLyBTZXQgdG8gdHJ1ZSBmb3IgdmVyYm9zZSBsb2dnaW5nXHJcbmZ1bmN0aW9uIGRlYnVnTG9nKC4uLmFyZ3M6IGFueVtdKSB7XHJcbiAgaWYgKFZJVEVfUExVR0lOX0RFQlVHKSB7XHJcbiAgICBjb25zb2xlLmxvZyguLi5hcmdzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFByb2plY3RDYWNoZURpcihwcm9qZWN0SWQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgYmFzZUNhY2hlRGlyID0gcGF0aC5yZXNvbHZlKE1BU1RFUl9ST09ULCBcIi4uXCIsIFwiLnByb2plY3RfY2FjaGVcIik7XHJcbiAgcmV0dXJuIHBhdGguam9pbihiYXNlQ2FjaGVEaXIsIHByb2plY3RJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlVmlydHVhbElkKFxyXG4gIGlkOiBzdHJpbmcsXHJcbik6IHsgcHJvamVjdElkOiBzdHJpbmc7IGZpbGVQYXRoOiBzdHJpbmcgfSB8IG51bGwge1xyXG4gIGNvbnN0IHV1aWRQYXR0ZXJuID1cclxuICAgIC9bMC05YS1mXXs4fS1bMC05YS1mXXs0fS1bMC05YS1mXXs0fS1bMC05YS1mXXs0fS1bMC05YS1mXXsxMn0vZztcclxuICBjb25zdCBtYXRjaGVzID0gWy4uLmlkLm1hdGNoQWxsKHV1aWRQYXR0ZXJuKV07XHJcbiAgaWYgKG1hdGNoZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICBgW1ZpdGUgQnJpZGdlXSBcdTI2QTBcdUZFMEYgcGFyc2VWaXJ0dWFsSWQgY291bGQgbm90IGZpbmQgVVVJRCBpbjogJHtpZH1gLFxyXG4gICAgKTtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgbGFzdE1hdGNoID0gbWF0Y2hlc1ttYXRjaGVzLmxlbmd0aCAtIDFdO1xyXG4gIGNvbnN0IHByb2plY3RJZCA9IGxhc3RNYXRjaFswXTtcclxuICBjb25zdCBzdGFydEluZGV4ID0gKGxhc3RNYXRjaC5pbmRleCA/PyAwKSArIGxhc3RNYXRjaFswXS5sZW5ndGg7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBpZC5zdWJzdHJpbmcoc3RhcnRJbmRleCkuc3BsaXQoXCI/XCIpWzBdO1xyXG5cclxuICByZXR1cm4geyBwcm9qZWN0SWQsIGZpbGVQYXRoIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzT3B0aW1pemFibGVQYWNrYWdlKHBrZ05hbWU6IHN0cmluZykge1xyXG4gIGlmIChwa2dOYW1lLnN0YXJ0c1dpdGgoXCJAdHlwZXMvXCIpKSByZXR1cm4gZmFsc2U7XHJcbiAgY29uc3QgZXhjbHVkZSA9IFtcclxuICAgIFwidml0ZVwiLFxyXG4gICAgXCJ0eXBlc2NyaXB0XCIsXHJcbiAgICBcInRhaWx3aW5kY3NzXCIsXHJcbiAgICBcImF1dG9wcmVmaXhlclwiLFxyXG4gICAgXCJwb3N0Y3NzXCIsXHJcbiAgICBcImVzbGludFwiLFxyXG4gICAgXCJsb3ZhYmxlLXRhZ2dlclwiLFxyXG4gIF07XHJcbiAgaWYgKGV4Y2x1ZGUuaW5jbHVkZXMocGtnTmFtZSkpIHJldHVybiBmYWxzZTtcclxuICBpZiAocGtnTmFtZS5zdGFydHNXaXRoKFwiQHZpdGVqcy9cIikgfHwgcGtnTmFtZS5pbmNsdWRlcyhcInZpdGUtcGx1Z2luXCIpKVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgZGVwUGtnSnNvblBhdGggPSBwYXRoLnJlc29sdmUoXHJcbiAgICAgIE1BU1RFUl9ST09ULFxyXG4gICAgICBcIm5vZGVfbW9kdWxlc1wiLFxyXG4gICAgICBwa2dOYW1lLFxyXG4gICAgICBcInBhY2thZ2UuanNvblwiLFxyXG4gICAgKTtcclxuICAgIGlmIChmcy5leGlzdHNTeW5jKGRlcFBrZ0pzb25QYXRoKSkge1xyXG4gICAgICBjb25zdCBkZXBQa2cgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhkZXBQa2dKc29uUGF0aCwgXCJ1dGYtOFwiKSk7XHJcbiAgICAgIGlmIChkZXBQa2cubWFpbiB8fCBkZXBQa2cubW9kdWxlKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgaWYgKGRlcFBrZy5leHBvcnRzKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBkZXBQa2cuZXhwb3J0cyA9PT0gXCJzdHJpbmdcIiB8fCBBcnJheS5pc0FycmF5KGRlcFBrZy5leHBvcnRzKSlcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIGlmIChkZXBQa2cuZXhwb3J0c1tcIi5cIl0pIHJldHVybiB0cnVlO1xyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIGRlcFBrZy5leHBvcnRzW1wiaW1wb3J0XCJdIHx8XHJcbiAgICAgICAgICBkZXBQa2cuZXhwb3J0c1tcInJlcXVpcmVcIl0gfHxcclxuICAgICAgICAgIGRlcFBrZy5leHBvcnRzW1wiZGVmYXVsdFwiXVxyXG4gICAgICAgIClcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoXHJcbiAgICAgICAgZnMuZXhpc3RzU3luYyhcclxuICAgICAgICAgIHBhdGgucmVzb2x2ZShNQVNURVJfUk9PVCwgXCJub2RlX21vZHVsZXNcIiwgcGtnTmFtZSwgXCJpbmRleC5qc1wiKSxcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGUpIHt9XHJcbiAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8vIFJlYWQgcGFja2FnZS5qc29uIHRvIHByZS1idW5kbGUgZGVwZW5kZW5jaWVzXHJcbmNvbnN0IHBrZ1BhdGggPSBwYXRoLnJlc29sdmUoTUFTVEVSX1JPT1QsIFwicGFja2FnZS5qc29uXCIpO1xyXG5sZXQgZHluYW1pY0RlcHM6IHN0cmluZ1tdID0gW107XHJcbnRyeSB7XHJcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtnUGF0aCkpIHtcclxuICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrZ1BhdGgsIFwidXRmLThcIikpO1xyXG4gICAgY29uc3QgYWxsRGVwcyA9IHsgLi4ucGtnLmRlcGVuZGVuY2llcywgLi4ucGtnLmRldkRlcGVuZGVuY2llcyB9O1xyXG4gICAgZHluYW1pY0RlcHMgPSBPYmplY3Qua2V5cyhhbGxEZXBzKS5maWx0ZXIoaXNPcHRpbWl6YWJsZVBhY2thZ2UpO1xyXG4gIH1cclxufSBjYXRjaCAoZSkge31cclxuXHJcbi8vIFJlYWQgYXV0by1kaXNjb3ZlcmVkIG9wdGltaXplZCBkZXBlbmRlbmNpZXNcclxuY29uc3QgYXV0b0RlcHNQYXRoID0gcGF0aC5yZXNvbHZlKE1BU1RFUl9ST09ULCBcIi52aXRlLWF1dG8tZGVwcy5qc29uXCIpO1xyXG5sZXQgYXV0b09wdGltaXplZERlcHM6IHN0cmluZ1tdID0gW107XHJcbnRyeSB7XHJcbiAgaWYgKGZzLmV4aXN0c1N5bmMoYXV0b0RlcHNQYXRoKSkge1xyXG4gICAgYXV0b09wdGltaXplZERlcHMgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhhdXRvRGVwc1BhdGgsIFwidXRmLThcIikpO1xyXG4gIH1cclxufSBjYXRjaCAoZSkge31cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgYXBwVHlwZTogXCJjdXN0b21cIixcclxuXHJcbiAgLy8gMS4gU2V0IHRoZSBnbG9iYWwgYnVpbGQgdGFyZ2V0XHJcbiAgYnVpbGQ6IHtcclxuICAgIHRhcmdldDogXCJlczIwMjJcIixcclxuICB9LFxyXG5cclxuICBzZXJ2ZXI6IHtcclxuICAgIGZzOiB7XHJcbiAgICAgIGFsbG93OiBbXCIuLlwiLCBvcy50bXBkaXIoKV0sXHJcbiAgICB9LFxyXG4gICAgaG1yOiB7XHJcbiAgICAgIHByb3RvY29sOiBcIndzc1wiLFxyXG4gICAgICBob3N0OiBcImxvY2FsaG9zdFwiLFxyXG4gICAgfSxcclxuICB9LFxyXG5cclxuICBwbHVnaW5zOiBbXHJcbiAgICB7XHJcbiAgICAgIG5hbWU6IFwiY2FjaGUtY2xlYXItbWlkZGxld2FyZVwiLFxyXG4gICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9fX2NsZWFyX2NhY2hlXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgIGxldCBib2R5ID0gXCJcIjtcclxuICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IChib2R5ICs9IGNodW5rLnRvU3RyaW5nKCkpKTtcclxuICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeyBwcm9qZWN0SWQsIGZpbGVQYXRoIH0gPSBKU09OLnBhcnNlKGJvZHkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZHNUb0ludmFsaWRhdGUgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VGaWxlUGF0aCA9IGZpbGVQYXRoLnJlcGxhY2UoL1xcLlt0al1zeD8kLywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2YXJpYXRpb25zID0gW1xyXG4gICAgICAgICAgICAgICAgICBmaWxlUGF0aCxcclxuICAgICAgICAgICAgICAgICAgYCR7YmFzZUZpbGVQYXRofS50c2AsXHJcbiAgICAgICAgICAgICAgICAgIGAke2Jhc2VGaWxlUGF0aH0udHN4YCxcclxuICAgICAgICAgICAgICAgIF07XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9ucy5mb3JFYWNoKChmaWxlVmFyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIG1vZHNUb0ludmFsaWRhdGUuYWRkKFxyXG4gICAgICAgICAgICAgICAgICAgIGBcXDB2aXJ0dWFsOi9wcm9qZWN0LyR7cHJvamVjdElkfS8ke2ZpbGVWYXJ9YCxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgbW9kc1RvSW52YWxpZGF0ZS5hZGQoXHJcbiAgICAgICAgICAgICAgICAgICAgYHZpcnR1YWw6L3Byb2plY3QvJHtwcm9qZWN0SWR9LyR7ZmlsZVZhcn1gLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGludmFsaWRhdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG1vZElkIG9mIG1vZHNUb0ludmFsaWRhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgbW9kID0gc2VydmVyLm1vZHVsZUdyYXBoLmdldE1vZHVsZUJ5SWQobW9kSWQpO1xyXG4gICAgICAgICAgICAgICAgICBpZiAobW9kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VydmVyLm1vZHVsZUdyYXBoLmludmFsaWRhdGVNb2R1bGUobW9kKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnZhbGlkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaW52YWxpZGF0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgc2VydmVyLndzLnNlbmQoeyB0eXBlOiBcImZ1bGwtcmVsb2FkXCIgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKFwiT0tcIik7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKFwiRXJyb3JcIik7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL19fd2FybV9jYWNoZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcclxuICAgICAgICAgICAgcmVzLmVuZChcIk9LXCIpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHJlYWN0KCksXHJcbiAgICBhdXRvSW5zdGFsbFBsdWdpbigpLFxyXG4gICAge1xyXG4gICAgICBuYW1lOiBcInZpcnR1YWwtcHJvamVjdC1mcy1jYWNoZVwiLFxyXG4gICAgICBlbmZvcmNlOiBcInByZVwiLFxyXG4gICAgICBhc3luYyByZXNvbHZlSWQoc291cmNlLCBpbXBvcnRlcikge1xyXG4gICAgICAgIC8vIFx1RDgzRFx1REVEMSBERUJVRyBUUkFQOiBDYXRjaCBhbnkgbW9kdWxlIHJlc29sdXRpb24gYXNraW5nIGZvciBhIGhhc2hcclxuICAgICAgICBpZiAoc291cmNlLmluY2x1ZGVzKFwiI1wiKSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgIGBcXG49PT0gXHVEODNEXHVERUQxIFtERUJVRyBIYXNoIHJlc29sdmVJZF0gc291cmNlOiBcIiR7c291cmNlfVwiXFxuICAtPiBpbXBvcnRlcjogXCIke2ltcG9ydGVyfVwiID09PVxcbmAsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgW2NsZWFuU291cmNlLCBxdWVyeV0gPSBzb3VyY2Uuc3BsaXQoXCI/XCIpO1xyXG4gICAgICAgIGNvbnN0IHF1ZXJ5U3RyID0gcXVlcnkgPyBgPyR7cXVlcnl9YCA6IFwiXCI7XHJcblxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIHNvdXJjZS5zdGFydHNXaXRoKFwiL0BcIikgfHxcclxuICAgICAgICAgIHNvdXJjZS5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSB8fFxyXG4gICAgICAgICAgKCFzb3VyY2Uuc3RhcnRzV2l0aChcIi5cIikgJiZcclxuICAgICAgICAgICAgIXNvdXJjZS5zdGFydHNXaXRoKFwiL1wiKSAmJlxyXG4gICAgICAgICAgICAhc291cmNlLnN0YXJ0c1dpdGgoXCJAL1wiKSAmJlxyXG4gICAgICAgICAgICAhc291cmNlLnN0YXJ0c1dpdGgoXCJ2aXJ0dWFsOlwiKSlcclxuICAgICAgICApIHtcclxuICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJlc29sdmVkID0gXCJcIjtcclxuXHJcbiAgICAgICAgaWYgKGNsZWFuU291cmNlLnN0YXJ0c1dpdGgoXCJ2aXJ0dWFsOi9wcm9qZWN0L1wiKSkge1xyXG4gICAgICAgICAgcmV0dXJuIHNvdXJjZTtcclxuICAgICAgICB9IGVsc2UgaWYgKGNsZWFuU291cmNlLnN0YXJ0c1dpdGgoXCIvcHJvamVjdC9cIikpIHtcclxuICAgICAgICAgIHJlc29sdmVkID0gY2xlYW5Tb3VyY2U7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpbXBvcnRlcj8uaW5jbHVkZXMoXCJ2aXJ0dWFsOlwiKSkge1xyXG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VWaXJ0dWFsSWQoaW1wb3J0ZXIpO1xyXG4gICAgICAgICAgaWYgKCFwYXJzZWQpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAgICAgICBgW1ZpdGUgQnJpZGdlXSBcdTI2QTBcdUZFMEYgcmVzb2x2ZUlkIGZhaWxlZCB0byBwYXJzZSB2aXJ0dWFsIGltcG9ydGVyOiAke2ltcG9ydGVyfWAsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGNvbnN0IHsgcHJvamVjdElkLCBmaWxlUGF0aDogaW1wb3J0ZXJGaWxlUGF0aCB9ID0gcGFyc2VkO1xyXG4gICAgICAgICAgY29uc3QgaW1wb3J0ZXJQYXRoID0gYC9wcm9qZWN0LyR7cHJvamVjdElkfSR7aW1wb3J0ZXJGaWxlUGF0aH1gO1xyXG5cclxuICAgICAgICAgIGlmIChjbGVhblNvdXJjZS5zdGFydHNXaXRoKFwiQC9cIikpIHtcclxuICAgICAgICAgICAgcmVzb2x2ZWQgPSBgL3Byb2plY3QvJHtwcm9qZWN0SWR9L3NyYy8ke2NsZWFuU291cmNlLnNsaWNlKDIpfWA7XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsZWFuU291cmNlLnN0YXJ0c1dpdGgoXCIvc3JjL1wiKSkge1xyXG4gICAgICAgICAgICByZXNvbHZlZCA9IGAvcHJvamVjdC8ke3Byb2plY3RJZH0ke2NsZWFuU291cmNlfWA7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXNvbHZlZCA9IHBhdGgucG9zaXgucmVzb2x2ZShcclxuICAgICAgICAgICAgICBwYXRoLnBvc2l4LmRpcm5hbWUoaW1wb3J0ZXJQYXRoKSxcclxuICAgICAgICAgICAgICBjbGVhblNvdXJjZSxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBoYXNLbm93bkV4dCA9XHJcbiAgICAgICAgICAvXFwuKHRzeHx0c3xqc3h8anN8Y3NzfGh0bWx8anNvbnxwbmd8anBlP2d8Z2lmfHN2Z3x3ZWJwfHdvZmYyP3x0dGZ8ZW90fG1wNHx3ZWJtfG9nZ3xtcDN8d2F2fGljbykoXFw/LiopPyQvaS50ZXN0KFxyXG4gICAgICAgICAgICByZXNvbHZlZCxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgbGV0IGZpbmFsUGF0aCA9IHJlc29sdmVkO1xyXG5cclxuICAgICAgICBpZiAoIWhhc0tub3duRXh0KSB7XHJcbiAgICAgICAgICBjb25zdCBtYXRjaCA9IHJlc29sdmVkLm1hdGNoKC9eXFwvcHJvamVjdFxcLyhbXi9dKylcXC8oLiopJC8pO1xyXG4gICAgICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtfLCBwcm9qZWN0SWQsIGZpbGVQYXRoUGFydF0gPSBtYXRjaDtcclxuICAgICAgICAgICAgY29uc3QgcHJvamVjdENhY2hlRGlyID0gZ2V0UHJvamVjdENhY2hlRGlyKHByb2plY3RJZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsQmFzZURpciA9IHByb2plY3RDYWNoZURpcjtcclxuICAgICAgICAgICAgY29uc3QgcGF0aHNUb1RyeSA9IFtcclxuICAgICAgICAgICAgICBgJHtmaWxlUGF0aFBhcnR9LnRzeGAsXHJcbiAgICAgICAgICAgICAgYCR7ZmlsZVBhdGhQYXJ0fS50c2AsXHJcbiAgICAgICAgICAgICAgYCR7ZmlsZVBhdGhQYXJ0fS5qc3hgLFxyXG4gICAgICAgICAgICAgIGAke2ZpbGVQYXRoUGFydH0uanNgLFxyXG4gICAgICAgICAgICAgIGAke2ZpbGVQYXRoUGFydH0vaW5kZXgudHN4YCxcclxuICAgICAgICAgICAgICBgJHtmaWxlUGF0aFBhcnR9L2luZGV4LnRzYCxcclxuICAgICAgICAgICAgICBgJHtmaWxlUGF0aFBhcnR9Lmpzb25gLFxyXG4gICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgdHJ5UGF0aCBvZiBwYXRoc1RvVHJ5KSB7XHJcbiAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5yZXNvbHZlKHBoeXNpY2FsQmFzZURpciwgdHJ5UGF0aCkpKSB7XHJcbiAgICAgICAgICAgICAgICBmaW5hbFBhdGggPSBgL3Byb2plY3QvJHtwcm9qZWN0SWR9LyR7dHJ5UGF0aH1gO1xyXG4gICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgZGVidWdMb2coXHJcbiAgICAgICAgICAgICAgICBgW1ZpdGUgY29uZmlnIC0+IHJlc29sdmVJZF0gXHUyNkEwXHVGRTBGIEZpbGUgbm90IGZvdW5kIHBoeXNpY2FsbHkgaW4gY2FjaGUsIGxldHRpbmcgVml0ZSBoYW5kbGUgaXQuYCxcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIC8vIEl0J3Mgbm90IGEgcGh5c2ljYWwgZmlsZSBpbiB0aGUgY2FjaGUuXHJcbiAgICAgICAgICAgICAgLy8gSXQgY291bGQgYmUgYSB2aXJ0dWFsIG1vZHVsZSBwcm92aWRlZCBieSBhbm90aGVyIHBsdWdpbiAobGlrZSBkb20tcm91dGUpLlxyXG4gICAgICAgICAgICAgIC8vIFdlIHJldHVybiB0aGUgcmVzb2x2ZWQgcGF0aCB3aXRob3V0IHRoZSBgdmlydHVhbDpgIHByZWZpeCBzbyB0aGF0XHJcbiAgICAgICAgICAgICAgLy8gb3RoZXIgcGx1Z2lucyBjYW4gaGFuZGxlIGl0IGluIHRoZWlyIGxvYWQgaG9va3MsIG9yIFZpdGUgY2FuIHRocm93IGEgc3RhbmRhcmQgZXJyb3IuXHJcbiAgICAgICAgICAgICAgLy8gQnkgcmV0dXJuaW5nIG51bGwsIHdlIHRlbGwgVml0ZSB0aGF0IHRoaXMgcGx1Z2luIGRvZXNuJ3QgaGFuZGxlIHRoaXMgcGF0aC5cclxuICAgICAgICAgICAgICAvLyBUaGlzIGFsbG93cyB0aGUgcmVxdWVzdCB0byBmYWxsIHRocm91Z2ggdG8gdGhlIFNQQSBmYWxsYmFjayBsb2dpYyBpbiB2aXRlLWJyaWRnZS5qc1xyXG4gICAgICAgICAgICAgIC8vIGluc3RlYWQgb2YgYmVpbmcgdHJlYXRlZCBhcyBhIGZhaWxlZCBtb2R1bGUgbG9va3VwLlxyXG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGb3JjZSAudHN4IGlmIHRoZSBmaWxlIGV4aXN0cyBhcyBzdWNoXHJcbiAgICAgICAgaWYgKGZpbmFsUGF0aC5lbmRzV2l0aChcIi50c1wiKSkge1xyXG4gICAgICAgICAgY29uc3QgdHN4UGFydCA9IGZpbmFsUGF0aC5yZXBsYWNlKC9cXC50cyQvLCBcIi50c3hcIik7XHJcbiAgICAgICAgICBjb25zdCBtYXRjaCA9IHRzeFBhcnQubWF0Y2goL15cXC9wcm9qZWN0XFwvKFteL10rKVxcLyguKikkLyk7XHJcbiAgICAgICAgICBpZiAobWF0Y2gpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvamVjdElkID0gbWF0Y2hbMV07XHJcbiAgICAgICAgICAgIGNvbnN0IHByb2plY3RDYWNoZURpciA9IGdldFByb2plY3RDYWNoZURpcihwcm9qZWN0SWQpO1xyXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLnJlc29sdmUocHJvamVjdENhY2hlRGlyLCBtYXRjaFsyXSkpKSB7XHJcbiAgICAgICAgICAgICAgZmluYWxQYXRoID0gdHN4UGFydDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW1wb3J0ZXJNYXAuc2V0KGZpbmFsUGF0aC5zcGxpdChcIj9cIilbMF0sIGltcG9ydGVyIHx8IFwiUm9vdFwiKTtcclxuICAgICAgICByZXR1cm4gYHZpcnR1YWw6JHtmaW5hbFBhdGh9JHtxdWVyeVN0cn1gO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgYXN5bmMgbG9hZChpZCkge1xyXG4gICAgICAgIGlmICghaWQuaW5jbHVkZXMoXCJ2aXJ0dWFsOi9wcm9qZWN0L1wiKSkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgY29uc3QgbG9hZFN0YXJ0ID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VWaXJ0dWFsSWQoaWQpO1xyXG4gICAgICAgIGlmICghcGFyc2VkKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBbVml0ZSBCcmlkZ2VdIFx1Mjc0QyBsb2FkIGhvb2sgZmFpbGVkIHRvIHBhcnNlIElEOiAke2lkfWApO1xyXG4gICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB7IHByb2plY3RJZCwgZmlsZVBhdGggfSA9IHBhcnNlZDtcclxuXHJcbiAgICAgICAgY29uc3QgcHJvamVjdENhY2hlRGlyID0gZ2V0UHJvamVjdENhY2hlRGlyKHByb2plY3RJZCk7XHJcbiAgICAgICAgY29uc3QgYWJzb2x1dGVQYXRoID0gcGF0aC5yZXNvbHZlKFxyXG4gICAgICAgICAgcHJvamVjdENhY2hlRGlyLFxyXG4gICAgICAgICAgZmlsZVBhdGguc3RhcnRzV2l0aChcIi9cIikgPyBmaWxlUGF0aC5zbGljZSgxKSA6IGZpbGVQYXRoLFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGlmICghYWJzb2x1dGVQYXRoLnN0YXJ0c1dpdGgocHJvamVjdENhY2hlRGlyKSkge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAgICAgYFtWaXRlIEJyaWRnZV0gU2VjdXJpdHkgRXJyb3I6IE91dHNpZGUgY2FjaGU6ICR7YWJzb2x1dGVQYXRofWAsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBpc01lZGlhQXNzZXQgPVxyXG4gICAgICAgICAgL1xcLihwbmd8anBlP2d8Z2lmfHN2Z3x3ZWJwfHdvZmYyP3x0dGZ8ZW90fG1wNHx3ZWJtfG9nZ3xtcDN8d2F2fGljbykoXFw/LiopPyQvaS50ZXN0KFxyXG4gICAgICAgICAgICBmaWxlUGF0aCxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgaWYgKGlzTWVkaWFBc3NldCkge1xyXG4gICAgICAgICAgcmV0dXJuIGBleHBvcnQgZGVmYXVsdCBcIi9AZnMvJHthYnNvbHV0ZVBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIil9XCI7YDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhhYnNvbHV0ZVBhdGgpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoYWJzb2x1dGVQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGVudDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBbVml0ZSBCcmlkZ2VdIFx1Mjc0QyBFcnJvciBsb2FkaW5nOiAke2Fic29sdXRlUGF0aH1gLCBlKTtcclxuICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY2xlYW5JZCA9IGlkLnJlcGxhY2UoL1xcMD92aXJ0dWFsOi9nLCBcIlwiKS5zcGxpdChcIj9cIilbMF07XHJcbiAgICAgICAgY29uc3Qgd2hvSW1wb3J0ZWQgPSBpbXBvcnRlck1hcC5nZXQoY2xlYW5JZCkgfHwgXCJVbmtub3duXCI7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAgIGBcXG5bVml0ZSBCcmlkZ2VdIFx1Mjc0QyBNSVNTSU5HIEZJTEU6ICR7ZmlsZVBhdGh9XFxuICAtPiBJbXBvcnRlZCBieTogJHt3aG9JbXBvcnRlZH1cXG4gIC0+IEFic29sdXRlIFBhdGggVHJpZWQ6ICR7YWJzb2x1dGVQYXRofVxcbiAgLT4gRnVsbCBJRDogJHtpZH1cXG5gLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIF0sXHJcblxyXG4gIGNzczoge1xyXG4gICAgcG9zdGNzczoge1xyXG4gICAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAgdGFpbHdpbmRjc3MocGF0aC5yZXNvbHZlKE1BU1RFUl9ST09ULCBcIi4vdGFpbHdpbmQuY29uZmlnLmpzXCIpKSxcclxuICAgICAgICBhdXRvcHJlZml4ZXIoKSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgfSxcclxuXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBlc2J1aWxkT3B0aW9uczoge1xyXG4gICAgICB0YXJnZXQ6IFwiZXMyMDIyXCIsXHJcbiAgICB9LFxyXG4gICAgZXhjbHVkZTogW1xyXG4gICAgICBcInZpcnR1YWxcIixcclxuICAgICAgXCJAdGVzdGluZy1saWJyYXJ5L2RvbVwiLFxyXG4gICAgICBcIkBzd2MvY29yZVwiLFxyXG4gICAgICBcImVzbGludFwiLFxyXG4gICAgICBcInBsYXl3cmlnaHQtY29yZVwiLCAvLyBBZGQgdGhpc1xyXG4gICAgICBcIkB0eXBlc2NyaXB0LWVzbGludC91dGlsc1wiLFxyXG4gICAgICBcIkB0eXBlc2NyaXB0LWVzbGludC9lc2xpbnQtcGx1Z2luXCIsXHJcbiAgICAgIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIixcclxuICAgICAgXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIixcclxuICAgIF0sXHJcbiAgICBpbmNsdWRlOiBbLi4uZHluYW1pY0RlcHMsIC4uLmF1dG9PcHRpbWl6ZWREZXBzXSxcclxuICAgIC8vIG5vRGlzY292ZXJ5OiB0cnVlLCAvLyBDb21tZW50ZWQgb3V0IHRvIGFsbG93IFZpdGUgdG8gb3B0aW1pemUgbmV3IGltcG9ydHMgb24gdGhlIGZseVxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdXLFNBQVMsb0JBQTRCO0FBQ3JZLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxrQkFBa0I7QUFDekIsT0FBTyxRQUFRO0FBQ2YsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxpQkFBaUI7QUFDMUIsU0FBUyxxQkFBcUI7QUFUaU0sSUFBTSwyQ0FBMkM7QUFXaFIsSUFBTSxjQUFjLG9CQUFJLElBQW9CO0FBRTVDLElBQU0sWUFBWSxLQUFLLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBQzdELElBQU0sY0FBYztBQUVwQixTQUFTLG9CQUE0QjtBQUNuQyxRQUFNLG9CQUFvQixvQkFBSSxJQUFZO0FBRTFDLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxJQUNULE1BQU0sVUFBVSxRQUFRLFVBQVUsU0FBUztBQUN6QyxVQUNFLE9BQU8sV0FBVyxHQUFHLEtBQ3JCLE9BQU8sV0FBVyxHQUFHLEtBQ3JCLE9BQU8sV0FBVyxJQUFJLEtBQ3RCLE9BQU8sV0FBVyxJQUFJLEtBQ3RCLE9BQU8sV0FBVyxVQUFVLEtBQzVCLFVBQVUsTUFBTSxHQUNoQjtBQUNBLGVBQU87QUFBQSxNQUNUO0FBRUEsWUFBTSxjQUFjLE9BQU8sV0FBVyxHQUFHLElBQ3JDLE9BQU8sTUFBTSxHQUFHLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFDdEMsT0FBTyxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBRXZCLFVBQUksa0JB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
