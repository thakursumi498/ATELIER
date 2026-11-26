import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } = require("@zxing/library");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "atelier-qr.config.json");
const PRINT_ARTBOARD = 1000;
const PRINT_QR_SIZE = 760;
const PRINT_QR_TOP = 70;
const PRINT_CAPTION_BASELINE = 926;
const PRINT_CAPTION_SIZE = 20;
const PRINT_CAPTION_TRACKING = 2.2;

function parseArgs(args) {
  const parsed = {};
  for (const arg of args) {
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const [key, ...parts] = arg.slice(2).split("=");
    if (!key || parts.length === 0) throw new Error(`Use --${key}=value`);
    parsed[key] = parts.join("=");
  }
  return parsed;
}

function parseBrandSource(source) {
  const colorBlock = source.match(/colors\s*:\s*\{([\s\S]*?)\n\s*\},/);
  const logo = source.match(/logoPrimary\s*:\s*["']([^"']+)["']/);
  if (!colorBlock || !logo) throw new Error("Could not find the official logo and color palette in src/lib/brand.ts.");
  const colors = {};
  for (const [, name, value] of colorBlock[1].matchAll(/([A-Za-z][\w]*)\s*:\s*["'](#[\da-fA-F]{6})["']/g)) {
    colors[name] = value.toUpperCase();
  }
  return { colors, logo: logo[1] };
}

function resolveColor(value, brandColors) {
  const token = /^\$brand\.([\w]+)$/.exec(value);
  const resolved = token ? brandColors[token[1]] : value;
  if (!resolved || !/^#[\da-fA-F]{6}$/.test(resolved)) throw new Error(`Invalid or unknown color: ${value}`);
  return resolved.toUpperCase();
}

function assertDestinationUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("The QR destination must use HTTPS.");
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname) || url.hostname.endsWith(".vercel.app")) {
    throw new Error("The QR destination cannot be localhost or a Vercel deployment hostname.");
  }
  return url.href;
}

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const values = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
    const linear = values.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
}

function colorToPdf(hex) {
  const [r, g, b] = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  return rgb(r, g, b);
}

function qrMatrixPath(matrix, quietZone) {
  const runs = [];
  for (let row = 0; row < matrix.size; row += 1) {
    let start = -1;
    for (let col = 0; col <= matrix.size; col += 1) {
      const dark = col < matrix.size && Boolean(matrix.data[row * matrix.size + col] & 1);
      if (dark && start < 0) start = col;
      if (!dark && start >= 0) {
        const x = start + quietZone;
        const width = col - start;
        runs.push(`M${x} ${row + quietZone}h${width}v1h-${width}z`);
        start = -1;
      }
    }
  }
  return runs.join("");
}

function svgEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function makeQrSvgInner({ matrix, foreground, background, logoDataUri, logoAspect, logoWidthRatio, quietZone }) {
  const box = matrix.size + quietZone * 2;
  const logoWidth = matrix.size * logoWidthRatio;
  const logoHeight = logoWidth / logoAspect;
  const pad = Math.max(0.55, matrix.size * 0.015);
  const center = box / 2;
  const x = center - logoWidth / 2;
  const y = center - logoHeight / 2;
  const rectX = x - pad;
  const rectY = y - pad;
  const rectWidth = logoWidth + pad * 2;
  const rectHeight = logoHeight + pad * 2;
  const modules = qrMatrixPath(matrix, quietZone);
  const content = [
    `<rect width="${box}" height="${box}" fill="${background}"/>`,
    `<path d="${modules}" fill="${foreground}" fill-rule="evenodd"/>`,
    `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${background}"/>`,
    `<image href="${logoDataUri}" x="${x}" y="${y}" width="${logoWidth}" height="${logoHeight}" preserveAspectRatio="xMidYMid meet"/>`,
  ].join("");
  return { box, content, logoBoxCoveragePercent: Number((rectWidth * rectHeight / (matrix.size ** 2) * 100).toFixed(2)) };
}

function makeVariantSvg({ variant, matrix, foreground, background, logoDataUri, logoAspect, logoWidthRatio, quietZone }) {
  const inner = makeQrSvgInner({ matrix, foreground, background, logoDataUri, logoAspect, logoWidthRatio, quietZone });
  const label = variant.caption;
  if (!label) {
    return {
      svg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 ${inner.box} ${inner.box}" shape-rendering="crispEdges">${inner.content}</svg>`,
      logoBoxCoveragePercent: inner.logoBoxCoveragePercent,
    };
  }
  const qrX = (PRINT_ARTBOARD - PRINT_QR_SIZE) / 2;
  return {
    svg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" shape-rendering="crispEdges"><rect width="1000" height="1000" fill="${background}"/><svg x="${qrX}" y="${PRINT_QR_TOP}" width="${PRINT_QR_SIZE}" height="${PRINT_QR_SIZE}" viewBox="0 0 ${inner.box} ${inner.box}">${inner.content}</svg><text x="500" y="${PRINT_CAPTION_BASELINE}" text-anchor="middle" fill="${foreground}" font-family="Jost, Arial, sans-serif" font-size="${PRINT_CAPTION_SIZE}" font-weight="500" letter-spacing="${PRINT_CAPTION_TRACKING}">${svgEscape(label)}</text></svg>`,
    logoBoxCoveragePercent: inner.logoBoxCoveragePercent,
  };
}

function drawQrOnPdf(page, { matrix, variant, logoImage, captionFont, foreground, background, quietZone, logoWidthRatio, label, pageSize }) {
  const top = variant.caption ? PRINT_QR_TOP / PRINT_ARTBOARD * pageSize : 0;
  const qrSize = variant.caption ? PRINT_QR_SIZE / PRINT_ARTBOARD * pageSize : pageSize;
  const x = (pageSize - qrSize) / 2;
  const moduleSize = qrSize / (matrix.size + quietZone * 2);
  const backgroundColor = colorToPdf(background);
  const foregroundColor = colorToPdf(foreground);
  page.drawRectangle({ x: 0, y: 0, width: pageSize, height: pageSize, color: backgroundColor });

  for (let row = 0; row < matrix.size; row += 1) {
    let start = -1;
    for (let col = 0; col <= matrix.size; col += 1) {
      const dark = col < matrix.size && Boolean(matrix.data[row * matrix.size + col] & 1);
      if (dark && start < 0) start = col;
      if (!dark && start >= 0) {
        const width = col - start;
        const pdfX = x + (quietZone + start) * moduleSize;
        const pdfY = pageSize - top - (quietZone + row + 1) * moduleSize;
        page.drawRectangle({ x: pdfX, y: pdfY, width: width * moduleSize, height: moduleSize, color: foregroundColor });
        start = -1;
      }
    }
  }

  const centerX = x + qrSize / 2;
  const centerTop = top + qrSize / 2;
  const logoWidth = matrix.size * logoWidthRatio * moduleSize;
  const logoHeight = logoWidth / (logoImage.width / logoImage.height);
  const padding = Math.max(0.55 * moduleSize, matrix.size * 0.015 * moduleSize);
  const plateWidth = logoWidth + padding * 2;
  const plateHeight = logoHeight + padding * 2;
  page.drawRectangle({
    x: centerX - plateWidth / 2,
    y: pageSize - centerTop - plateHeight / 2,
    width: plateWidth,
    height: plateHeight,
    color: backgroundColor,
  });
  page.drawImage(logoImage, {
    x: centerX - logoWidth / 2,
    y: pageSize - centerTop - logoHeight / 2,
    width: logoWidth,
    height: logoHeight,
  });

  if (label) {
    const fontSize = PRINT_CAPTION_SIZE / PRINT_ARTBOARD * pageSize;
    const charSpacing = PRINT_CAPTION_TRACKING / PRINT_ARTBOARD * pageSize;
    const actualWidth = captionFont.widthOfTextAtSize(label, fontSize) + (label.length - 1) * charSpacing;
    const baseline = PRINT_CAPTION_BASELINE / PRINT_ARTBOARD * pageSize;
    page.drawText(label, {
      x: (pageSize - actualWidth) / 2,
      y: pageSize - baseline,
      font: captionFont,
      size: fontSize,
      charSpacing,
      color: foregroundColor,
    });
  }
}

function decodeGrayscale(gray, width, height) {
  const bytes = new Uint8ClampedArray(gray.buffer, gray.byteOffset, gray.byteLength);
  const source = new RGBLuminanceSource(bytes, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  const reader = new QRCodeReader();
  try {
    return reader.decode(bitmap).getText();
  } finally {
    reader.reset();
  }
}

async function decodeBuffer(buffer) {
  const rendered = await sharp(buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  return decodeGrayscale(rendered.data, rendered.info.width, rendered.info.height);
}

async function assertDecoded(buffer, expected, label, report) {
  const decodedUrl = await decodeBuffer(buffer);
  const pass = decodedUrl === expected;
  report.push({ label, decodedUrl, pass });
  if (!pass) throw new Error(`${label} decoded as ${decodedUrl}, expected ${expected}.`);
}

async function renderPdfToPng(pdfPath, pngPath) {
  try {
    execFileSync("sips", ["-s", "format", "png", "-s", "dpiWidth", "300", "-s", "dpiHeight", "300", pdfPath, "--out", pngPath], { stdio: "ignore" });
  } catch (error) {
    const code = error?.code === "ENOENT" ? "sips is unavailable" : "sips could not render the PDF";
    throw new Error(`${code}. Install a PDF renderer so the print exports can be decoded during QA.`);
  }
  return fs.readFile(pngPath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const brandSource = await fs.readFile(path.join(ROOT, "src/lib/brand.ts"), "utf8");
  const brand = parseBrandSource(brandSource);
  const destinationUrl = assertDestinationUrl(args.url || process.env.ATELIER_QR_URL || config.destinationUrl);
  const logoPathValue = args.logo || process.env.ATELIER_QR_LOGO || (config.logoPath === "auto" ? path.join("public", brand.logo.replace(/^\//, "")) : config.logoPath);
  const logoPath = path.resolve(ROOT, logoPathValue);
  const outputDirectory = path.resolve(ROOT, args.out || process.env.ATELIER_QR_OUTPUT || config.outputDirectory);
  const logoWidthRatio = Number(args.logoWidthRatio || process.env.ATELIER_QR_LOGO_WIDTH_RATIO || config.logoWidthRatio);
  const resolutions = (args.resolutions || config.outputResolutions.join(",")).split(",").map(Number);
  const selectedFormats = (args.formats || config.formats.join(",")).toLowerCase().split(",");
  const allowedFormats = new Set(["png", "svg", "pdf"]);
  const invalidFormats = selectedFormats.filter((format) => !allowedFormats.has(format));
  if (invalidFormats.length) throw new Error(`Unsupported output format(s): ${invalidFormats.join(", ")}`);
  if (!Number.isFinite(logoWidthRatio) || logoWidthRatio <= 0 || logoWidthRatio > 0.25) {
    throw new Error("logoWidthRatio must be greater than 0 and at most 0.25 for reliable scanning.");
  }
  if (!Number.isInteger(config.quietZoneModules) || config.quietZoneModules < 4) {
    throw new Error("quietZoneModules must be an integer of at least 4.");
  }
  if (!resolutions.length || resolutions.some((value) => !Number.isInteger(value) || value < 256 || value > 8192)) {
    throw new Error("Output resolutions must be integers from 256 through 8192 pixels.");
  }
  if (!config.variants?.length || config.variants.length !== 3) throw new Error("The configuration must define exactly three QR variants.");

  const logoInputBytes = await fs.readFile(logoPath);
  const logoBytes = await sharp(logoInputBytes).png().toBuffer();
  const logoMetadata = await sharp(logoBytes).metadata();
  if (!logoMetadata.width || !logoMetadata.height) throw new Error(`Could not read logo dimensions from ${logoPath}.`);
  const logoAspect = logoMetadata.width / logoMetadata.height;
  const logoDataUri = `data:image/png;base64,${logoBytes.toString("base64")}`;
  const qr = QRCode.create(destinationUrl, { errorCorrectionLevel: "H" });
  const matrix = qr.modules;
  const matrixSize = matrix.size;
  const validationItems = [];
  const variantReports = [];
  await fs.mkdir(outputDirectory, { recursive: true });

  for (const variant of config.variants) {
    const foreground = resolveColor(variant.foreground, brand.colors);
    const background = resolveColor(variant.background, brand.colors);
    const ratio = contrastRatio(foreground, background);
    if (ratio < 4.5) throw new Error(`${variant.id} contrast ratio ${ratio}:1 is below 4.5:1.`);
    const folder = path.join(outputDirectory, variant.id);
    await fs.mkdir(folder, { recursive: true });
    const { svg, logoBoxCoveragePercent } = makeVariantSvg({
      variant,
      matrix,
      foreground,
      background,
      logoDataUri,
      logoAspect,
      logoWidthRatio,
      quietZone: config.quietZoneModules,
    });
    const svgBytes = Buffer.from(svg, "utf8");
    if (!svg.includes("data:image/png;base64,")) throw new Error(`${variant.id} SVG does not embed the original PNG logo.`);

    if (selectedFormats.includes("svg")) {
      const svgPath = path.join(folder, `atelier-qr-${variant.id}.svg`);
      await fs.writeFile(svgPath, svgBytes);
      const renderedSvg = await sharp(svgBytes).png().toBuffer();
      await assertDecoded(renderedSvg, destinationUrl, `${variant.id} SVG`, validationItems);
    }

    if (selectedFormats.includes("png")) {
      for (const resolution of resolutions) {
        const pngPath = path.join(folder, `atelier-qr-${variant.id}-${resolution}.png`);
        const pngBytes = await sharp(svgBytes).resize(resolution, resolution, { fit: "fill" }).png({ compressionLevel: 9 }).toBuffer();
        await fs.writeFile(pngPath, pngBytes);
        await assertDecoded(pngBytes, destinationUrl, `${variant.id} PNG ${resolution}×${resolution}`, validationItems);
      }
    }

    if (selectedFormats.includes("pdf")) {
      const pdfPath = path.join(folder, `atelier-qr-${variant.id}.pdf`);
      const pdfDocument = await PDFDocument.create();
      const pageSize = config.pdfPageSizeInches * 72;
      const page = pdfDocument.addPage([pageSize, pageSize]);
      const embeddedLogo = await pdfDocument.embedPng(logoBytes);
      const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
      drawQrOnPdf(page, {
        matrix,
        variant,
        logoImage: embeddedLogo,
        captionFont: font,
        foreground,
        background,
        quietZone: config.quietZoneModules,
        logoWidthRatio,
        label: variant.caption,
        pageSize,
      });
      const pdfBytes = Buffer.from(await pdfDocument.save());
      await fs.writeFile(pdfPath, pdfBytes);
      const verifyDocument = await PDFDocument.load(pdfBytes);
      const [verifyPage] = verifyDocument.getPages();
      const pdfPageSize = verifyPage.getSize();
      if (Math.abs(pdfPageSize.width - pageSize) > 0.1 || Math.abs(pdfPageSize.height - pageSize) > 0.1) {
        throw new Error(`${variant.id} PDF has unexpected page dimensions.`);
      }
      const rasterizedPdfPath = path.join(os.tmpdir(), `atelier-qr-${variant.id}.png`);
      const renderedPdf = await renderPdfToPng(pdfPath, rasterizedPdfPath);
      await assertDecoded(renderedPdf, destinationUrl, `${variant.id} PDF render`, validationItems);
    }

    variantReports.push({
      id: variant.id,
      label: variant.label,
      foreground,
      background,
      contrastRatio: `${ratio}:1`,
      errorCorrection: "H",
      matrixModules: `${matrixSize}×${matrixSize}`,
      quietZoneModules: config.quietZoneModules,
      logoSource: path.relative(ROOT, logoPath),
      logoPixels: `${logoMetadata.width}×${logoMetadata.height}`,
      logoWidthRatio,
      logoKnockoutCoverageOfMatrixPercent: logoBoxCoveragePercent,
      files: {
        svg: selectedFormats.includes("svg") ? `./${variant.id}/atelier-qr-${variant.id}.svg` : null,
        png: selectedFormats.includes("png") ? resolutions.map((size) => `./${variant.id}/atelier-qr-${variant.id}-${size}.png`) : [],
        pdf: selectedFormats.includes("pdf") ? `./${variant.id}/atelier-qr-${variant.id}.pdf` : null,
      },
    });
  }

  const validation = {
    generatedAt: new Date().toISOString(),
    destinationUrl,
    brandColors: brand.colors,
    logoSource: path.relative(ROOT, logoPath),
    passed: validationItems.every((item) => item.pass),
    decodeChecks: validationItems,
    variants: variantReports,
  };
  await fs.writeFile(path.join(outputDirectory, "validation-report.json"), `${JSON.stringify(validation, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, "README.md"), [
    "# ATELIER QR exports",
    "",
    `Destination encoded directly in all QR codes: ${destinationUrl}`,
    "",
    `Detected brand palette: ${Object.entries(brand.colors).map(([name, color]) => `${name} ${color}`).join(" · ")}`,
    "",
    "Each QR uses high error correction (H), a four-module quiet zone, the original cropped Atelier logo PNG embedded at the centre, and brand-derived colors. SVGs contain the logo image as an embedded data URI. PDFs are square, 6-inch print files with vector QR modules and the embedded original PNG logo.",
    "",
    "Regenerate from the repository root with `npm run generate:qr`. Override the destination with `npm run generate:qr -- --url=https://your-live-domain.example/`. The script also accepts `--logo=public/brand/atelier-logo-primary.png`, `--out=exports/atelier-qr`, `--logoWidthRatio=0.2`, `--resolutions=1024,2048,4096`, and `--formats=png,svg,pdf`.",
    "",
    "For physical QA, print at intended size. On Android, open the Camera or Google Lens and scan from a normal viewing distance. On iPhone, open Camera and point it at the print, then tap the website banner. Confirm both phones open the destination above. Recheck each paper stock, finish, and lighting condition used in production.",
    "",
    "See `validation-report.json` for the ZXing decode results for every PNG size, rendered SVG, and rendered PDF.",
    "",
  ].join("\n"));
  if (!validation.passed) throw new Error("At least one exported QR failed validation.");

  console.log(`Generated ${variantReports.length} QR variants for ${destinationUrl}`);
  console.log(`QR matrix: ${matrixSize}×${matrixSize} modules at error correction H; quiet zone: ${config.quietZoneModules} modules.`);
  console.log(`Exports: ${path.relative(ROOT, outputDirectory)}`);
  console.log(`Validation: ${validationItems.length}/${validationItems.length} QR decoding checks passed.`);
  for (const variant of variantReports) {
    console.log(`${variant.id}: ${variant.foreground} on ${variant.background}, contrast ${variant.contrastRatio}, logo knockout ${variant.logoKnockoutCoverageOfMatrixPercent}% of matrix area.`);
  }
}

main().catch((error) => {
  console.error(`QR generation failed: ${error?.stack || error}`);
  process.exitCode = 1;
});
