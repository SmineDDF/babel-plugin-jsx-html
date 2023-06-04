/* eslint-disable no-unused-vars */

declare module "@babel/helper-annotate-as-pure" {
  import type { Node } from "@babel/types";
  import type { NodePath } from "@babel/traverse";

  export default function annotateAsPure(pathOrNode: Node | NodePath): void;
}

declare module "@babel/plugin-syntax-jsx" {
  function jsx(): {
    manipulateOptions(opts: any, parserOpts: { plugins: string[] }): void;
  };

  export default jsx;
}
