import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run set:studio-password -- <new-password>");
  process.exit(1);
}

const targetFile = path.join(process.cwd(), "admin", "auth-config.js");
const source = await fs.readFile(targetFile, "utf8");
const updated = source
  .replace(/password: ".*?"/, `password: "${password}"`);

await fs.writeFile(targetFile, updated);

console.log("Studio password updated.");
console.log("Run `npm run build` to publish the new login gate.");
