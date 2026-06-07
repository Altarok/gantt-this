declare module 'smiles-drawer' {
  export class SvgDrawer {
    constructor(options: any);
    draw(tree: any, target: any, theme: string, weights?: any): void;
  }

  export class CanvasDrawer {
    constructor(options: any);
    draw(tree: any, target: any, theme: string, weights?: any): void;
  }

  export function parse(
    smiles: string,
    successCallback: (tree: any) => void,
    errorCallback?: (error: any) => void
  ): void;

  const SmilesDrawer: {
    SvgDrawer: typeof SvgDrawer;
    CanvasDrawer: typeof CanvasDrawer;
    parse: typeof parse;
  };

  export default SmilesDrawer;
}
