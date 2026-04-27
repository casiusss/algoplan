import { describe, expect, it } from "vitest";

import { selectPlatformReleaseAssetName } from "./cli-release-asset";

describe("selectPlatformReleaseAssetName", () => {
  it("matches the darwin archive from release assets", () => {
    const assetNames = [
      "checksums.txt",
      "algoplan-cli-1.2.3-darwin-amd64.tar.gz",
      "algoplan-cli-1.2.3-darwin-arm64.tar.gz",
      "algoplan-cli-1.2.3-linux-amd64.tar.gz",
    ];

    expect(selectPlatformReleaseAssetName(assetNames, "darwin", "x64")).toBe(
      "algoplan-cli-1.2.3-darwin-amd64.tar.gz",
    );
  });

  it("matches the windows zip archive", () => {
    const assetNames = [
      "algoplan-cli-1.2.3-windows-amd64.zip",
      "algoplan-cli-1.2.3-linux-amd64.tar.gz",
    ];

    expect(selectPlatformReleaseAssetName(assetNames, "win32", "x64")).toBe(
      "algoplan-cli-1.2.3-windows-amd64.zip",
    );
  });

  it("fails when the current platform asset is missing", () => {
    expect(() =>
      selectPlatformReleaseAssetName(
        ["algoplan-cli-1.2.3-linux-amd64.tar.gz"],
        "darwin",
        "arm64",
      ),
    ).toThrow(/no release asset found/);
  });
});
