const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Qlume design token boundary", () => {
  test("the token source covers all domain tones and interaction geometry", () => {
    const tokens = read("src/styles/tokens.less");

    [
      "@color-neutral-900",
      "@color-medical-500",
      "@color-personality-500",
      "@color-ability-500",
      "@color-success-500",
      "@color-warning-500",
      "@color-danger-500",
      "@font-weight-black",
      "@touch-target-min",
      "@safe-area-bottom",
    ].forEach((token) => expect(tokens).toContain(token));
  });

  test.each([
    "src/styles/theme.less",
    "src/styles/qlume-home-layout.less",
  ])("%s remains a literal-free compatibility layer", (relativePath) => {
    const compatibilityLayer = read(relativePath);

    expect(compatibilityLayer).toContain('@import "./tokens.less"');
    expect(compatibilityLayer).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(compatibilityLayer).not.toMatch(/rgba?\(/i);
  });

  test("shared UI does not introduce unsupported numeric font weights", () => {
    const sharedUiRoot = path.join(root, "src/shared/ui");
    const lessFiles = [];

    const walk = (directory) => {
      fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(absolutePath);
        } else if (entry.name.endsWith(".less")) {
          lessFiles.push(absolutePath);
        }
      });
    };
    walk(sharedUiRoot);

    lessFiles.forEach((filePath) => {
      const styles = fs.readFileSync(filePath, "utf8");
      const numericWeights = Array.from(styles.matchAll(/font-weight:\s*(\d+)/g));
      numericWeights.forEach((match) => {
        expect(["400", "500", "600", "700", "900"]).toContain(match[1]);
      });
    });
  });
});

