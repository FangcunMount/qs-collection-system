const path = require("path");
const sass = require("sass");
const postcss = require("postcss");

// Component tests stub Taroify and styles. Compile the real manifest here so
// missing styles for its native button overlay cannot silently pass those tests.
test("Taroify native button overlays the label without taking layout space", () => {
  const root = path.resolve(__dirname, "../../..");
  const { css } = sass.renderSync({
    file: path.join(root, "src/styles/taroify.scss"),
    includePaths: [path.join(root, "node_modules")],
    logger: sass.Logger.silent,
  });
  const declarations = {};
  postcss.parse(css.toString()).walkRules(".taroify-button-base", (rule) => {
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });

  expect(declarations).toMatchObject({
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    opacity: "0",
  });
});
