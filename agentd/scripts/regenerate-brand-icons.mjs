import * as NodeFSP from "node:fs/promises";
import * as NodeModule from "node:module";
import * as NodePath from "node:path";
import * as NodeProcess from "node:process";
import * as NodeURL from "node:url";

import { BRAND_ASSET_PATHS, resolveWebIconOverrides } from "../../scripts/lib/brand-assets.ts";

const require = NodeModule.createRequire(new URL("../../scripts/package.json", import.meta.url));
const sharp = require("sharp");
const root = NodeURL.fileURLToPath(new URL("../../", import.meta.url));
const source = NodeProcess.argv[2];
if (!source || NodeProcess.argv.length !== 3) {
  throw new Error(
    "Usage: node agentd/scripts/regenerate-brand-icons.mjs <agentd-desktop/resources>",
  );
}

const largePng = await NodeFSP.readFile(NodePath.resolve(source, "build", "icon.png"));
const smallPng = await NodeFSP.readFile(NodePath.resolve(source, "icon.png"));
const windowsIco = await NodeFSP.readFile(NodePath.resolve(source, "build", "icon.ico"));
const macPng = await sharp(largePng)
  .resize(824, 824)
  .extend({ top: 100, bottom: 100, left: 100, right: 100, background: "#00000000" })
  .png()
  .toBuffer();
const publicIcons = new Map([["favicon.ico", windowsIco]]);
for (const [name, size] of [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192x192.png", 192],
  ["icon-512x512.png", 512],
]) {
  publicIcons.set(
    name,
    await sharp(size <= 256 ? smallPng : largePng)
      .resize(size, size)
      .png()
      .toBuffer(),
  );
}

for (const [brand, ios, linux, mac, windows] of [
  [
    "development",
    BRAND_ASSET_PATHS.developmentIosIconPng,
    BRAND_ASSET_PATHS.developmentUniversalIconPng,
    BRAND_ASSET_PATHS.developmentDesktopIconPng,
    BRAND_ASSET_PATHS.developmentWindowsIconIco,
  ],
  [
    "nightly",
    BRAND_ASSET_PATHS.nightlyIosIconPng,
    BRAND_ASSET_PATHS.nightlyLinuxIconPng,
    BRAND_ASSET_PATHS.nightlyMacIconPng,
    BRAND_ASSET_PATHS.nightlyWindowsIconIco,
  ],
  [
    "production",
    BRAND_ASSET_PATHS.productionIosIconPng,
    BRAND_ASSET_PATHS.productionLinuxIconPng,
    BRAND_ASSET_PATHS.productionMacIconPng,
    BRAND_ASSET_PATHS.productionWindowsIconIco,
  ],
]) {
  for (const [file, bytes] of [
    [ios, largePng],
    [linux, largePng],
    [mac, macPng],
    [windows, windowsIco],
  ]) {
    await NodeFSP.writeFile(NodePath.join(root, file), bytes);
  }
  for (const { sourceRelativePath, targetRelativePath } of resolveWebIconOverrides(
    brand,
    "apps/web/public",
  )) {
    const name = NodePath.basename(targetRelativePath);
    const bytes = publicIcons.get(name);
    if (!bytes) throw new Error(`No rendition for ${name}`);
    await NodeFSP.writeFile(NodePath.join(root, sourceRelativePath), bytes);
    if (brand === "development") {
      await NodeFSP.writeFile(NodePath.join(root, targetRelativePath), bytes);
    }
  }
}
