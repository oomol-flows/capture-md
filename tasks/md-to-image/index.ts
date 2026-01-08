import type { Context } from "@oomol/types/oocana";
import { marked } from "marked";
import { chromium, Browser, Page } from "playwright";
import { readFile, access } from "fs/promises";
import { AssetLoader } from "./assets-loader";

//#region generated meta
type Inputs = {
  markdown_input: string;
  output_path: string | null;
  export_mode: "free" | "xhs" | "pyq" | null;
  width: number | null;
  padding: number | null;
  font_size: number | null;
  background_preset: "purple" | "pink" | "blue" | "green" | "sunset" | "pastel" | "peach" | "rose" | null;
  custom_bg_start: string | null;
  custom_bg_end: string | null;
  gradient_direction: "0deg" | "45deg" | "90deg" | "135deg" | "180deg" | "270deg" | null;
  title_font: "default" | "NotoSansSC" | "NotoSerifSC" | "Montserrat" | "Poppins" | "PlayfairDisplay" | "Roboto" | null;
  body_font: "default" | "NotoSansSC" | "NotoSerifSC" | "Montserrat" | "Poppins" | "PlayfairDisplay" | "Roboto" | null;
  scale: number | null;
  enable_math: boolean | null;
  enable_diagram: boolean | null;
  enable_card: boolean | null;
};
type Outputs = {
  image_path: string;
  image_width: number;
  image_height: number;
};
//#endregion

import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get project root directory (workspace root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "../..");

// Font configuration mapping
const FONT_FILES: Record<string, { regular: string; bold: string }> = {
  NotoSansSC: {
    regular: "NotoSansSC-Regular.ttf",
    bold: "NotoSansSC-Bold.ttf",
  },
  NotoSerifSC: {
    regular: "NotoSerifSC-Regular.ttf",
    bold: "NotoSerifSC-Bold.ttf",
  },
  Montserrat: {
    regular: "Montserrat-Regular.ttf",
    bold: "Montserrat-Bold.ttf",
  },
  Poppins: {
    regular: "Poppins-Regular.ttf",
    bold: "Poppins-Bold.ttf",
  },
  PlayfairDisplay: {
    regular: "PlayfairDisplay-Regular.ttf",
    bold: "PlayfairDisplay-Bold.ttf",
  },
  Roboto: {
    regular: "Roboto-Regular.ttf",
    bold: "Roboto-Bold.ttf",
  },
};

// Load font as base64 data URL
async function loadFontAsBase64(fontName: string): Promise<{ regular: string; bold: string } | null> {
  if (!FONT_FILES[fontName]) {
    return null;
  }

  const fontDir = join(PROJECT_ROOT, "fonts");
  const files = FONT_FILES[fontName];

  try {
    const regularPath = join(fontDir, files.regular);
    const boldPath = join(fontDir, files.bold);

    const [regularData, boldData] = await Promise.all([
      readFile(regularPath),
      readFile(boldPath),
    ]);

    return {
      regular: `data:font/ttf;base64,${regularData.toString("base64")}`,
      bold: `data:font/ttf;base64,${boldData.toString("base64")}`,
    };
  } catch (error) {
    console.warn(`Failed to load font ${fontName}:`, error);
    return null;
  }
}

// Generate @font-face CSS rules
function generateFontFaceCSS(fontName: string, fontData: { regular: string; bold: string }): string {
  return `
    @font-face {
      font-family: '${fontName}';
      src: url('${fontData.regular}') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: '${fontName}';
      src: url('${fontData.bold}') format('truetype');
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }
  `;
}

// Background gradient presets
const BACKGROUND_PRESETS: Record<string, string> = {
  purple: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  pink: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  blue: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  green: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  sunset: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  pastel: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  peach: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  rose: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
};

// CSS Variables
const CSS_VARIABLES = `
:root {
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --secondary-color: #8b5cf6;
  --text-primary: #1e293b;
  --text-secondary: #334155;
  --text-muted: #64748b;
  --text-light: #475569;
  --background-light: #f8fafc;
  --background-gray: #f1f5f9;
  --border-color: #e2e8f0;
  --border-light: #cbd5e1;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1);
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}
`;

// Full CSS styles for markdown rendering (matching capture-md)
const FULL_STYLES = `
  ${CSS_VARIABLES}

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--background-light);
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .markdown-poster {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 0;
    margin: 0;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .markdown-poster::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0;
    pointer-events: none;
  }

  .poster-content {
    background: rgba(255, 255, 255, 0.95) !important;
    border-radius: 12px;
    padding: 40px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    position: relative;
    z-index: 1;
    overflow: hidden;
    word-wrap: break-word;
    min-height: 400px;
  }

  .poster-content img {
    max-width: 100%;
    height: auto;
    border-radius: var(--border-radius);
    margin: 16px auto;
    box-shadow: var(--shadow-md);
    display: block;
    object-fit: cover;
  }

  .poster-content h1 {
    font-size: var(--dynamic-h1-size, 28px);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 16px;
    line-height: 1.3;
  }

  .poster-content h2 {
    font-size: var(--dynamic-h2-size, 22px);
    font-weight: 600;
    color: var(--text-secondary);
    margin: 24px 0 12px 0;
    line-height: 1.4;
  }

  .poster-content h3 {
    font-size: var(--dynamic-h3-size, 18px);
    font-weight: 600;
    color: var(--text-light);
    margin: 20px 0 8px 0;
  }

  .poster-content h4 {
    font-size: var(--dynamic-h4-size, 16px);
    font-weight: 600;
    color: var(--text-light);
    margin: 16px 0 8px 0;
  }

  .poster-content h5,
  .poster-content h6 {
    font-size: var(--dynamic-h5-h6-size, 15px);
    font-weight: 600;
    color: var(--text-light);
    margin: 12px 0 6px 0;
  }

  .poster-content p {
    font-size: var(--dynamic-font-size, 16px);
    color: var(--text-light);
    margin-bottom: 16px;
    line-height: 1.7;
  }

  .poster-content em {
    font-style: italic;
    color: var(--primary-color);
  }

  .poster-content strong {
    font-weight: 700;
    color: var(--text-primary);
  }

  .poster-content a {
    color: var(--primary-color);
    text-decoration: none;
    border-bottom: 1px solid var(--primary-color);
  }

  .poster-content ul,
  .poster-content ol {
    margin: 16px 0;
    padding-left: 24px;
  }

  .poster-content li {
    font-size: var(--dynamic-font-size, 16px);
    color: var(--text-light);
    margin-bottom: 8px;
    line-height: 1.6;
  }

  .poster-content blockquote {
    border-left: 4px solid var(--primary-color);
    padding-left: 16px;
    background: var(--background-gray);
    padding-top: 12px;
    padding-bottom: 12px;
    margin: 16px 0;
    color: var(--text-muted);
    font-style: italic;
    font-size: var(--dynamic-quote-size, 16px);
  }

  .poster-content blockquote p {
    margin: 0;
    line-height: inherit;
  }

  .poster-content code {
    background: var(--background-gray);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: var(--dynamic-code-size, 14px);
    color: var(--primary-color);
  }

  .poster-content pre {
    background: var(--text-primary);
    color: #e2e8f0;
    padding: 16px;
    border-radius: var(--border-radius);
    margin: 16px 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .poster-content pre code {
    background: transparent;
    color: inherit;
    padding: 0;
  }

  .poster-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 14px;
  }

  .poster-content table th,
  .poster-content table td {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    text-align: left;
  }

  .poster-content table th {
    background: var(--background-light);
    font-weight: 600;
  }

  .madopic-card {
    margin: 20px 0;
    padding: 20px 24px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.1);
    transition: all 0.3s ease;
  }

  .madopic-card .card-content {
    color: var(--text-light);
    line-height: 1.7;
  }

  .madopic-card.card-info {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(29, 78, 216, 0.12) 100%);
    border-color: rgba(59, 130, 246, 0.2);
  }

  .madopic-card.card-success {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.12) 100%);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .madopic-card.card-warning {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%);
    border-color: rgba(245, 158, 11, 0.2);
  }

  .madopic-card.card-error {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.12) 100%);
    border-color: rgba(239, 68, 68, 0.2);
  }
`;

// Generate dynamic font size CSS variables
function generateFontSizeVars(baseFontSize: number): string {
  return `
    --dynamic-font-size: ${baseFontSize}px;
    --dynamic-h1-size: ${Math.round(baseFontSize * 1.75)}px;
    --dynamic-h2-size: ${Math.round(baseFontSize * 1.375)}px;
    --dynamic-h3-size: ${Math.round(baseFontSize * 1.125)}px;
    --dynamic-h4-size: ${Math.round(baseFontSize * 1.05)}px;
    --dynamic-h5-h6-size: ${Math.round(baseFontSize * 0.95)}px;
    --dynamic-code-size: ${Math.round(baseFontSize * 0.875)}px;
    --dynamic-quote-size: ${Math.round(baseFontSize * 0.95)}px;
  `.trim();
}

// Helper function to check if input is a file path
async function isFile(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Helper function to read markdown file
async function readMarkdownFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, "utf-8");
  return content;
}

// Calculate target height based on export mode
function calculateHeight(mode: string, width: number): number | null {
  switch (mode) {
    case "xhs":
      return Math.round((width / 3) * 4);
    case "pyq":
      return Math.round(width * (2796 / 1290));
    case "free":
    default:
      return null;
  }
}

// Generate custom background style
function generateCustomBackground(
  start: string,
  end: string,
  direction: string
): string {
  return `linear-gradient(${direction}, ${start} 0%, ${end} 100%)`;
}

// Preprocess markdown (support card syntax)
function preprocessMarkdown(markdown: string, enableCard: boolean): string {
  if (!enableCard) {
    return markdown;
  }

  return markdown.replace(
    /:::card(?:\s+(info|success|warning|error))?\s*\n([\s\S]*?)\n:::/g,
    (_match, type, content) => {
      const cardClass = type ? `card-${type}` : "";
      return `<div class="madopic-card ${cardClass}">\n<div class="card-content">\n\n${content}\n\n</div>\n</div>`;
    }
  );
}

// Generate HTML content
function generateHTML(
  markdown: string,
  options: {
    width: number;
    padding: number;
    fontSize: number;
    background: string;
    targetHeight: number | null;
    enableCard: boolean;
    enableMath: boolean;
    enableDiagram: boolean;
    titleFontCSS: string;
    bodyFontCSS: string;
    titleFontFamily: string;
    bodyFontFamily: string;
  }
): string {
  const preprocessed = preprocessMarkdown(markdown, options.enableCard);
  const htmlContent = marked.parse(preprocessed);

  const fontSizeVars = generateFontSizeVars(options.fontSize);

  const posterHeightStyle = options.targetHeight
    ? `height: ${options.targetHeight}px; min-height: ${options.targetHeight}px; overflow: hidden;`
    : "min-height: 600px;";

  const contentMaxHeightStyle = options.targetHeight
    ? `max-height: ${options.targetHeight - options.padding * 2}px; overflow: hidden;`
    : "";

  // Generate inline assets
  const inlineAssets: string[] = [];
  const inlineScripts: string[] = [];

  // Add custom font CSS
  if (options.titleFontCSS) {
    inlineAssets.push(`<style>${options.titleFontCSS}</style>`);
  }
  if (options.bodyFontCSS && options.bodyFontCSS !== options.titleFontCSS) {
    inlineAssets.push(`<style>${options.bodyFontCSS}</style>`);
  }

  if (options.enableMath) {
    // Inline KaTeX CSS
    const katexCss = AssetLoader.getKatexCss();
    if (katexCss) {
      inlineAssets.push(`<style>${katexCss}</style>`);
    } else {
      // Fallback to CDN
      inlineAssets.push(
        '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">'
      );
    }

    // Inline KaTeX JS
    const katexJs = AssetLoader.getKatexJs();
    const autoRenderJs = AssetLoader.getKatexAutoRender();
    if (katexJs && autoRenderJs) {
      inlineScripts.push(`<script>${katexJs}</script>`);
      inlineScripts.push(`<script>${autoRenderJs}</script>`);
    } else {
      // Fallback to CDN
      inlineScripts.push(
        '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>'
      );
      inlineScripts.push(
        '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>'
      );
    }
  }

  if (options.enableDiagram) {
    // Inline Mermaid JS
    const mermaidJs = AssetLoader.getMermaidJs();
    if (mermaidJs) {
      inlineScripts.push(`<script>${mermaidJs}</script>`);
    } else {
      // Fallback to CDN
      inlineScripts.push(
        '<script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>'
      );
    }
  }

  // Generate extension scripts
  const extensionScripts: string[] = [];

  if (options.enableMath) {
    extensionScripts.push(`
      <script>
        window.addEventListener('load', function() {
          if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(document.body, {
              delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\\\[', right: '\\\\]', display: true},
                {left: '\\\\(', right: '\\\\)', display: false}
              ],
              throwOnError: false
            });
          }
        });
      </script>
    `);
  }

  if (options.enableDiagram) {
    extensionScripts.push(`
      <script>
        if (typeof mermaid !== 'undefined') {
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            themeVariables: {
              primaryColor: '#6366f1',
              primaryTextColor: '#1f2937',
              primaryBorderColor: '#4f46e5',
              lineColor: '#6b7280',
              secondaryColor: '#f3f4f6',
              tertiaryColor: '#ffffff'
            }
          });
        }
      </script>
    `);
  }

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown to Image</title>
  ${inlineAssets.join('\n  ')}
  ${inlineScripts.join('\n  ')}
  <style>
    ${FULL_STYLES}

    /* Custom font overrides */
    .poster-content h1,
    .poster-content h2,
    .poster-content h3,
    .poster-content h4,
    .poster-content h5,
    .poster-content h6 {
      font-family: ${options.titleFontFamily};
    }

    .poster-content,
    .poster-content p,
    .poster-content li,
    .poster-content blockquote {
      font-family: ${options.bodyFontFamily};
    }
  </style>
</head>
<body>
  <div class="markdown-poster" style="
    background: ${options.background};
    width: ${options.width}px;
    padding: ${options.padding}px;
    ${posterHeightStyle}
  ">
    <div class="poster-content" style="
      ${fontSizeVars}
      ${contentMaxHeightStyle}
    ">
      ${htmlContent}
    </div>
  </div>
  ${extensionScripts.join('\n  ')}
</body>
</html>
  `.trim();
}

export default async function (
  params: Inputs,
  context: Context<Inputs, Outputs>
): Promise<Outputs> {
  // Parse inputs with smart defaults
  const exportMode = params.export_mode || "xhs";
  const width = params.width || 640;
  const padding = params.padding || 40;
  const fontSize = params.font_size || 18;
  const scale = params.scale || 3;
  const enableMath = params.enable_math !== false;
  const enableDiagram = params.enable_diagram !== false;
  const enableCard = params.enable_card !== false;

  // Determine background style
  let background: string;
  if (params.custom_bg_start && params.custom_bg_end) {
    const direction = params.gradient_direction || "135deg";
    background = generateCustomBackground(
      params.custom_bg_start,
      params.custom_bg_end,
      direction
    );
  } else {
    const preset = params.background_preset || "purple";
    background = BACKGROUND_PRESETS[preset];
  }

  // Determine output path - use session directory as default
  const outputPath = params.output_path ||
    `${context.sessionDir}/markdown-${Date.now()}.png`;

  // Get markdown content
  let markdownContent: string;
  const isFilePath = await isFile(params.markdown_input);
  if (isFilePath) {
    markdownContent = await readMarkdownFile(params.markdown_input);
  } else {
    markdownContent = params.markdown_input;
  }

  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Calculate target height
  const targetHeight = calculateHeight(exportMode, width);

  // Load custom fonts - default to NotoSansSC for reliable Chinese rendering
  const DEFAULT_FONT = "NotoSansSC";
  const titleFont = params.title_font || DEFAULT_FONT;
  const bodyFont = params.body_font || DEFAULT_FONT;

  const fallbackFontFamily = "sans-serif";

  let titleFontCSS = "";
  let bodyFontCSS = "";
  let titleFontFamily = fallbackFontFamily;
  let bodyFontFamily = fallbackFontFamily;

  // Load title font
  const titleFontData = await loadFontAsBase64(titleFont);
  if (titleFontData) {
    titleFontCSS = generateFontFaceCSS(titleFont, titleFontData);
    titleFontFamily = `'${titleFont}', ${fallbackFontFamily}`;
  }

  // Load body font
  if (bodyFont === titleFont && titleFontCSS) {
    // Reuse title font CSS
    bodyFontCSS = titleFontCSS;
    bodyFontFamily = titleFontFamily;
  } else {
    const bodyFontData = await loadFontAsBase64(bodyFont);
    if (bodyFontData) {
      bodyFontCSS = generateFontFaceCSS(bodyFont, bodyFontData);
      bodyFontFamily = `'${bodyFont}', ${fallbackFontFamily}`;
    }
  }

  // Generate HTML
  const htmlContent = generateHTML(markdownContent, {
    width,
    padding,
    fontSize,
    background,
    targetHeight,
    enableCard,
    enableMath,
    enableDiagram,
    titleFontCSS,
    bodyFontCSS,
    titleFontFamily,
    bodyFontFamily,
  });

  // Launch browser and render
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    // Create page with high device pixel ratio for crisp rendering
    const page: Page = await browser.newPage({
      deviceScaleFactor: scale,
    });

    // Set viewport size
    await page.setViewportSize({
      width: width,
      height: 800,
    });

    // Set page content
    await page.setContent(htmlContent, {
      waitUntil: "networkidle",
    });

    // Wait for the poster element
    await page.waitForSelector(".markdown-poster", { timeout: 10000 });

    // Wait extra time for math and diagrams to render
    if (enableMath || enableDiagram) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Get element dimensions
    const element = await page.$(".markdown-poster");
    if (!element) {
      throw new Error("Cannot find .markdown-poster element");
    }

    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      throw new Error("Cannot get element bounding box");
    }

    // Take high-resolution screenshot
    await element.screenshot({
      path: outputPath,
      type: "png",
    });

    await page.close();

    return {
      image_path: outputPath,
      image_width: Math.round(boundingBox.width * scale),
      image_height: Math.round(boundingBox.height * scale),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
