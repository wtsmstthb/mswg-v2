"use strict";

// Local web servers must not expose databases, source backends, tests or archives.
function isPublicFile(relativePath) {
  const file = relativePath.replace(/\\/g, "/");
  if (file.split("/").some(part => part === ".." || part.startsWith("."))) return false;
  if (file === "shared/auth/session.js") return true;
  if (!/^(RISKREGISTER\/frontend|AGM\/frontend|PRE-VOTING\/frontend|shared\/portal)\//.test(file)) return false;
  if (/\/(legacy|node_modules)\//i.test(file) || /\.example\.js$/i.test(file)) return false;
  return /\.(html|css|js|svg|png|jpe?g|ico|webp|woff2?)$/i.test(file);
}

module.exports = { isPublicFile };
