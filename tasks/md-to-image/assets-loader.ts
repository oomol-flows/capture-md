import { readFileSync } from "fs";
import { join } from "path";

/**
 * Asset loader - Load CDN resources from local files
 */
export class AssetLoader {
  private static assetsDir = join(__dirname, "assets");
  private static cache = new Map<string, string>();

  /**
   * Load local asset file
   */
  static loadAsset(filename: string): string {
    if (this.cache.has(filename)) {
      return this.cache.get(filename)!;
    }

    try {
      const filePath = join(this.assetsDir, filename);
      const content = readFileSync(filePath, "utf-8");
      this.cache.set(filename, content);
      return content;
    } catch (error) {
      console.warn(`Cannot load local asset ${filename}, will use CDN fallback`);
      return "";
    }
  }

  /**
   * Get KaTeX CSS
   */
  static getKatexCss(): string {
    return this.loadAsset("katex.min.css");
  }

  /**
   * Get KaTeX JS
   */
  static getKatexJs(): string {
    return this.loadAsset("katex.min.js");
  }

  /**
   * Get KaTeX Auto-render JS
   */
  static getKatexAutoRender(): string {
    return this.loadAsset("auto-render.min.js");
  }

  /**
   * Get Mermaid JS
   */
  static getMermaidJs(): string {
    return this.loadAsset("mermaid.min.js");
  }
}
