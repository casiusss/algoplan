import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

// Phase 7 (rebrand) regression-lock for apps/desktop/electron-builder.yml.
// These assertions guarantee that future commits cannot silently revert the
// AlgoPlan brand identity for the packaged Electron app, while also pinning
// the values that MUST stay on their pre-rebrand identifiers (publish remote
// + artifactName template) because external consumers (Homebrew, the
// electron-updater feed) depend on those URLs / filenames.

interface ProtocolEntry {
  name: string;
  schemes: string[];
}

interface ElectronBuilderConfig {
  appId: string;
  productName: string;
  protocols: ProtocolEntry[];
  publish: { provider: string; owner: string; repo: string };
  mac: { artifactName: string };
  dmg: { artifactName: string };
  linux: { artifactName: string };
  win: { artifactName: string };
}

const config = parse(
  readFileSync(join(__dirname, "..", "electron-builder.yml"), "utf-8"),
) as ElectronBuilderConfig;

describe("electron-builder.yml — AlgoPlan brand identity (Phase 7 regression lock)", () => {
  it("appId is ai.algoplan.desktop (not ai.multica.desktop)", () => {
    expect(config.appId).toBe("ai.algoplan.desktop");
  });

  it("productName is AlgoPlan", () => {
    expect(config.productName).toBe("AlgoPlan");
  });

  it("protocols include algoplan scheme (not multica)", () => {
    expect(config.protocols).toEqual([
      { name: "AlgoPlan", schemes: ["algoplan"] },
    ]);
  });

  it("publish remote is unchanged (multica-ai/multica per D-4 — out of phase scope)", () => {
    expect(config.publish.owner).toBe("multica-ai");
    expect(config.publish.repo).toBe("multica");
  });

  it("artifactName template is unchanged (release filename — Homebrew + auto-update consume this)", () => {
    expect(config.mac.artifactName).toMatch(/^multica-desktop-/);
    expect(config.dmg.artifactName).toMatch(/^multica-desktop-/);
    expect(config.win.artifactName).toMatch(/^multica-desktop-/);
    expect(config.linux.artifactName).toMatch(/^multica-desktop-/);
  });
});
