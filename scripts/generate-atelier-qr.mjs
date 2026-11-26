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
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const CONFIG_PATH = path.join(SCRIPT_DIR, "atelier-qr.config.json");
const PRINT_ARTBOARD = 1000;
const PRINT_QR_SIZE = 770;
const PRINT_QR_TOP = 55;
const BRAND_NAME_STRIP_TOP = 880;
const BRAND_NAME_BASELINE = 930;
const BRAND_NAME_SIZE = 24;
const BRAND_NAME_TRACKING = 1.8;
const OBSOLETE_VARIANT_DIRS = ["variant-01-classic", "variant-02-brand-theme", "variant-03-print-edition"];

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
  const logoBlack = source.match(/logoBlack\s*:\s*["']([^"']+)["']/);
  const brandName = source.match(/export const ATELIER_BRAND\s*=\s*\{[\s\S]*?\n\s*name:\s*["']([^"']+)["']/);
  if (!colorBlock || !logoBlack || !brandName) {
    throw new Error("Could not read the Atelier palette, brand name, and monochrome logo from src/lib/brand.ts.");
  }
  const colors = {};
  for (const [, name, value] of colorBlock[1].matchAll(/([A-Za-z][\w]*)\s*:\s*["'](#[\da-fA-F]{6})["']/g)) {
    colors[name] = value.toUpperCase();
  }
  return { colors, logoBlack: logoBlack[1], name: brandName[1] };
}

function resolveColor(value, brand) {
  const token = /^\$brand\.([\w]+)$/.exec(value);
  const resolved = token ? brand.colors[token[1]] : value;
  if (!resolved || !/^#[\da-fA-F]{6}$/.test(resolved)) throw new Error(`Invalid or unknown color: ${value}`);
  return resolved.toUpperCase();
}

function resolveBrandName(value, brand) {
  const resolved = value === "$brand.name" ? brand.name : value;
  if (resolved && typeof resolved !== "string") throw new Error("Brand name must be a string.");
  return resolved;
}

function assertDestinationUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("The QR destination must use HTTPS.");
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname) || url.hostname.endsWith(".vercel.app")) {
    throw new Error("The QR destination cannot be localhost or a Vercel deployment hostname.");
  }
  return url.href;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
}

function isNeutralColor(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16));
  return Math.max(...channels) - Math.min(...channels) <= 24;
}

function assertNeutralLogo(imageBytes, label) {
  return sharp(imageBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }).then(({ data }) => {
    for (let index = 0; index < data.length; index += 4) {
      const [red, green, blue, alpha] = data.subarray(index, index + 4);
      const brightest = Math.max(red, green, blue);
      const saturation = brightest - Math.min(red, green, blue);
      if (alpha > 8 && ((brightest > 80 && saturation > 24) || (red > green * 1.15 && red > blue * 1.15 && red > 45))) {
        throw new Error(`${label} must use a neutral, non-red logo asset.`);
      }
    }
  });
}

function validateVariantDefinition(variant, foreground, background, brand) {
  if (!isNeutralColor(foreground) || !isNeutralColor(background)) {
    throw new Error(`${variant.id} must use neutral colors; red is excluded from every QR variant.`);
  }
  if (!variant.centerLogo && variant.brandName) throw new Error(`${variant.id} cannot show text unless it is the branded variant.`);
  if (variant.id === "01-classic" && (foreground !== "#000000" || background !== "#FFFFFF" || variant.centerLogo || variant.brandName)) {
    throw new Error("01-classic must be a plain black QR on white with no logo or text.");
  }
  if (variant.id === "02-website-theme" && (variant.centerLogo || variant.brandName)) {
    throw new Error("02-website-theme must not contain a logo or text.");
  }
  if (variant.id === "03-premium-branded") {
    if (!variant.centerLogo || variant.brandName !== brand.name) {
      throw new Error("03-premium-branded must use the original logo and complete official brand name.");
    }
    if (!isNeutralColor(foreground) || !isNeutralColor(background)) {
      throw new Error("03-premium-branded must use a neutral, non-red color theme.");
    }
  }
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

function pdfColor(hex) {
  const [red, green, blue] = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  return { red, green, blue };
}

async function createBrandNameStrip({ brandName, foreground, background, variantId }) {
  const resolution = 4096;
  const scale = resolution / PRINT_ARTBOARD;
  const stripHeight = Math.round((PRINT_ARTBOARD - BRAND_NAME_STRIP_TOP) * scale);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([resolution, stripHeight]);
  const backgroundColor = pdfColor(background);
  const textColor = pdfColor(foreground);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: resolution,
    height: stripHeight,
    color: rgb(backgroundColor.red, backgroundColor.green, backgroundColor.blue),
  });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = BRAND_NAME_SIZE * scale;
  const charSpacing = BRAND_NAME_TRACKING * scale;
  const actualWidth = font.widthOfTextAtSize(brandName, fontSize) + (brandName.length - 1) * charSpacing;
  const baselineFromTop = (BRAND_NAME_BASELINE - BRAND_NAME_STRIP_TOP) * scale;
  page.drawText(brandName, {
    x: (resolution - actualWidth) / 2,
    y: stripHeight - baselineFromTop,
    font,
    size: fontSize,
    charSpacing,
    color: rgb(textColor.red, textColor.green, textColor.blue),
  });

  const base = path.join(os.tmpdir(), `atelier-qr-${variantId}-brand-name`);
  const pdfPath = `${base}.pdf`;
  const pngPath = `${base}.png`;
  await fs.writeFile(pdfPath, await pdf.save());
  const pngBytes = await renderPdfToPng(pdfPath, pngPath);
  const expectedHeight = Math.round((PRINT_ARTBOARD - BRAND_NAME_STRIP_TOP) * scale);
  return sharp(pngBytes).resize(resolution, expectedHeight, { fit: "fill" }).png().toBuffer();
}

function makeQrSvgInner({ matrix, foreground, background, logoDataUri, logoAspect, logoWidthRatio, quietZone, centerLogo }) {
  const box = matrix.size + quietZone * 2;
  const modules = qrMatrixPath(matrix, quietZone);
  const content = [
    `<rect width="${box}" height="${box}" fill="${background}"/>`,
    `<path d="${modules}" fill="${foreground}" fill-rule="evenodd"/>`,
  ];
  let logoBoxCoveragePercent = 0;

  if (centerLogo) {
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
    content.push(
      `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${background}"/>`,
      `<image href="${logoDataUri}" x="${x}" y="${y}" width="${logoWidth}" height="${logoHeight}" preserveAspectRatio="xMidYMid meet"/>`,
    );
    logoBoxCoveragePercent = Number((rectWidth * rectHeight / (matrix.size ** 2) * 100).toFixed(2));
  }

  return { box, content: content.join(""), logoBoxCoveragePercent };
}

function makeVariantSvg({ variant, matrix, foreground, background, logoDataUri, brandNameDataUri, logoAspect, logoWidthRatio, quietZone }) {
  const inner = makeQrSvgInner({
    matrix,
    foreground,
    background,
    logoDataUri,
    logoAspect,
    logoWidthRatio,
    quietZone,
    centerLogo: variant.centerLogo,
  });

  if (!variant.brandName) {
    return {
      svg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 ${inner.box} ${inner.box}" shape-rendering="crispEdges">${inner.content}</svg>`,
      logoBoxCoveragePercent: inner.logoBoxCoveragePercent,
    };
  }

  const qrX = (PRINT_ARTBOARD - PRINT_QR_SIZE) / 2;
  return {
    svg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" shape-rendering="crispEdges"><rect width="1000" height="1000" fill="${background}"/><svg x="${qrX}" y="${PRINT_QR_TOP}" width="${PRINT_QR_SIZE}" height="${PRINT_QR_SIZE}" viewBox="0 0 ${inner.box} ${inner.box}" shape-rendering="crispEdges">${inner.content}</svg><image href="${brandNameDataUri}" x="0" y="${BRAND_NAME_STRIP_TOP}" width="1000" height="${PRINT_ARTBOARD - BRAND_NAME_STRIP_TOP}" preserveAspectRatio="none"/></svg>`,
    logoBoxCoveragePercent: inner.logoBoxCoveragePercent,
  };
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

async function createPrintPdf(pngBytes, outputPath, pageSizeInches) {
  const document = await PDFDocument.create();
  const pageSize = pageSizeInches * 72;
  const page = document.addPage([pageSize, pageSize]);
  const image = await document.embedPng(pngBytes);
  page.drawImage(image, { x: 0, y: 0, width: pageSize, height: pageSize });
  const pdfBytes = Buffer.from(await document.save());
  await fs.writeFile(outputPath, pdfBytes);

  const verification = await PDFDocument.load(pdfBytes);
  const pageSizeActual = verification.getPages()[0].getSize();
  if (Math.abs(pageSizeActual.width - pageSize) > 0.1 || Math.abs(pageSizeActual.height - pageSize) > 0.1) {
    throw new Error(`${path.basename(outputPath)} has an unexpected page size.`);
  }
  return { fileBytes: pdfBytes.length, pageSizePoints: pageSize };
}

async function writeZipArchive({ outputDirectory, archivePath }) {
  const contents = [
    path.relative(ROOT, path.join(outputDirectory, "README.md")),
    path.relative(ROOT, path.join(outputDirectory, "validation-report.json")),
    ...["01-classic", "02-website-theme", "03-premium-branded"].map((id) => path.relative(ROOT, path.join(outputDirectory, id))),
    path.relative(ROOT, path.join(SCRIPT_DIR, "generate-atelier-qr.mjs")),
    path.relative(ROOT, CONFIG_PATH),
    "public/brand/atelier-logo-black.png",
    "src/lib/brand.ts",
    "package.json",
    "package-lock.json",
  ];
  await fs.rm(archivePath, { force: true });
  execFileSync("zip", ["-q", "-r", path.relative(ROOT, archivePath), ...contents], { cwd: ROOT });
  return (await fs.stat(archivePath)).size;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const brandSource = await fs.readFile(path.join(ROOT, "src/lib/brand.ts"), "utf8");
  const brand = parseBrandSource(brandSource);
  const destinationUrl = assertDestinationUrl(args.url || process.env.ATELIER_QR_URL || config.destinationUrl);
  const configuredLogoPath = args.logo || process.env.ATELIER_QR_LOGO || (config.logoPath === "auto-black"
    ? path.join("public", brand.logoBlack.replace(/^\//, ""))
    : config.logoPath);
  const logoPath = path.resolve(ROOT, configuredLogoPath);
  const outputDirectory = path.resolve(ROOT, args.out || process.env.ATELIER_QR_OUTPUT || config.outputDirectory);
  const logoWidthRatio = Number(args.logoWidthRatio || process.env.ATELIER_QR_LOGO_WIDTH_RATIO || config.logoWidthRatio);
  const resolutions = (args.resolutions || config.outputResolutions.join(",")).split(",").map(Number);
  const selectedFormats = (args.formats || config.formats.join(",")).toLowerCase().split(",");
  const supportedFormats = new Set(["png", "svg", "pdf"]);
  const unsupportedFormats = selectedFormats.filter((format) => !supportedFormats.has(format));
  if (unsupportedFormats.length) throw new Error(`Unsupported output format(s): ${unsupportedFormats.join(", ")}`);
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
  if (config.variants.map((variant) => variant.id).join(",") !== "01-classic,02-website-theme,03-premium-branded") {
    throw new Error("The configuration must define exactly the three requested variant folders.");
  }

  const logoInputBytes = await fs.readFile(logoPath);
  const logoBytes = await sharp(logoInputBytes).png().toBuffer();
  const logoMetadata = await sharp(logoBytes).metadata();
  if (!logoMetadata.width || !logoMetadata.height) throw new Error(`Could not read logo dimensions from ${logoPath}.`);
  await assertNeutralLogo(logoBytes, "Premium Branded logo");
  const logoAspect = logoMetadata.width / logoMetadata.height;
  const logoDataUri = `data:image/png;base64,${logoBytes.toString("base64")}`;
  const qr = QRCode.create(destinationUrl, { errorCorrectionLevel: "H" });
  const matrix = qr.modules;
  const validationItems = [];
  const variantReports = [];
  const obsoleteDirs = OBSOLETE_VARIANT_DIRS.map((dir) => path.join(outputDirectory, dir));
  await fs.mkdir(outputDirectory, { recursive: true });

  for (const variant of config.variants) {
    const foreground = resolveColor(variant.foreground, brand);
    const background = resolveColor(variant.background, brand);
    const brandName = resolveBrandName(variant.brandName, brand);
    const variantResolved = { ...variant, brandName };
    validateVariantDefinition(variantResolved, foreground, background, brand);
    const contrast = contrastRatio(foreground, background);
    if (contrast < 4.5) throw new Error(`${variant.id} contrast ratio ${contrast}:1 is below 4.5:1.`);

    const folder = path.join(outputDirectory, variant.id);
    await fs.mkdir(folder, { recursive: true });
    const brandNameStrip = variantResolved.brandName
      ? await createBrandNameStrip({ brandName: variantResolved.brandName, foreground, background, variantId: variant.id })
      : null;
    const brandNameDataUri = brandNameStrip ? `data:image/png;base64,${brandNameStrip.toString("base64")}` : null;
    const { svg, logoBoxCoveragePercent } = makeVariantSvg({
      variant: variantResolved,
      matrix,
      foreground,
      background,
      logoDataUri,
      brandNameDataUri,
      logoAspect,
      logoWidthRatio,
      quietZone: config.quietZoneModules,
    });
    const svgBytes = Buffer.from(svg, "utf8");
    if (!variant.centerLogo && (svg.includes("<image") || svg.includes("<text"))) {
      throw new Error(`${variant.id} must not include a logo or visible text.`);
    }
    if (variant.centerLogo && (!svg.includes("data:image/png;base64,") || !svg.includes(brandNameDataUri))) {
      throw new Error(`${variant.id} must embed the original logo and full brand name.`);
    }

    if (selectedFormats.includes("svg")) {
      const svgPath = path.join(folder, `atelier-qr-${variant.id}.svg`);
      await fs.writeFile(svgPath, svgBytes);
      await assertDecoded(await sharp(svgBytes).png().toBuffer(), destinationUrl, `${variant.id} SVG render`, validationItems);
    }

    const pngsByResolution = new Map();
    if (selectedFormats.includes("png")) {
      for (const resolution of resolutions) {
        const pngPath = path.join(folder, `atelier-qr-${variant.id}-${resolution}.png`);
        const pngBytes = await sharp(svgBytes).resize(resolution, resolution, { fit: "fill" }).png({ compressionLevel: 9 }).toBuffer();
        await fs.writeFile(pngPath, pngBytes);
        pngsByResolution.set(resolution, pngBytes);
        await assertDecoded(pngBytes, destinationUrl, `${variant.id} PNG ${resolution}×${resolution}`, validationItems);
      }
    }

    let pdfReport = null;
    if (selectedFormats.includes("pdf")) {
      const pdfPath = path.join(folder, `atelier-qr-${variant.id}.pdf`);
      const pdfSourcePng = pngsByResolution.get(4096)
        || await sharp(svgBytes).resize(4096, 4096, { fit: "fill" }).png({ compressionLevel: 9 }).toBuffer();
      pdfReport = await createPrintPdf(pdfSourcePng, pdfPath, config.pdfPageSizeInches);
      const renderedPdfPath = path.join(os.tmpdir(), `atelier-qr-${variant.id}.png`);
      const renderedPdf = await renderPdfToPng(pdfPath, renderedPdfPath);
      await assertDecoded(renderedPdf, destinationUrl, `${variant.id} PDF render`, validationItems);
      pdfReport.printResolutionDpi = Number((4096 / config.pdfPageSizeInches).toFixed(1));
      pdfReport.output = path.relative(ROOT, pdfPath);
    }

    variantReports.push({
      id: variant.id,
      label: variant.label,
      foreground,
      background,
      contrastRatio: `${contrast}:1`,
      errorCorrection: "H",
      matrixModules: `${matrix.size}×${matrix.size}`,
      quietZoneModules: config.quietZoneModules,
      logo: variant.centerLogo ? {
        source: path.relative(ROOT, logoPath),
        dimensions: `${logoMetadata.width}×${logoMetadata.height}`,
        widthRatio: logoWidthRatio,
        knockoutCoverageOfMatrixPercent: logoBoxCoveragePercent,
        monochromeValidation: "passed; no red or colored pixels detected",
      } : null,
      brandNameOutsideQuietZone: variantResolved.brandName || null,
      formats: {
        svg: selectedFormats.includes("svg") ? `./${variant.id}/atelier-qr-${variant.id}.svg` : null,
        png: selectedFormats.includes("png") ? resolutions.map((size) => `./${variant.id}/atelier-qr-${variant.id}-${size}.png`) : [],
        pdf: selectedFormats.includes("pdf") ? `./${variant.id}/atelier-qr-${variant.id}.pdf` : null,
      },
      pdfPrintDetails: pdfReport,
    });
  }

  const validation = {
    generatedAt: new Date().toISOString(),
    destinationUrl,
    brandName: brand.name,
    brandColors: brand.colors,
    noRedUsedInVariants: true,
    originalLogoSource: path.relative(ROOT, logoPath),
    passed: validationItems.every((item) => item.pass),
    decodeChecks: validationItems,
    variants: variantReports,
  };
  await fs.writeFile(path.join(outputDirectory, "validation-report.json"), `${JSON.stringify(validation, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, "README.md"), [
    "# ATELIER QR exports",
    "",
    `Destination encoded directly in all three static QR codes: ${destinationUrl}`,
    "",
    `Detected brand palette: ${Object.entries(brand.colors).map(([name, color]) => `${name} ${color}`).join(" · ")}`,
    `Brand name: ${brand.name}`,
    `Variant 03 logo: ${path.relative(ROOT, logoPath)} (monochrome, original supplied asset)`,
    "",
    "The folders are `01-classic`, `02-website-theme`, and `03-premium-branded`. Each contains 1024, 2048, and 4096 PNGs, an SVG, and a six-inch PDF. All output colors are neutral—no red is used in any variant. All QR matrices use error correction H and a four-module quiet zone. The Premium Branded version places the monochrome original logo in the centre and the complete brand name below the QR, outside its quiet zone.",
    "",
    "Regenerate the three variants and the ZIP with `npm run generate:qr`. Override the destination with `npm run generate:qr -- --url=https://your-live-domain.example/`. Other options include `--logo=public/brand/atelier-logo-black.png`, `--out=exports/atelier-qr`, `--logoWidthRatio=0.2`, `--resolutions=1024,2048,4096`, and `--formats=png,svg,pdf`.",
    "",
    "Physical scan check before printing: on Android, use Camera or Google Lens. On iPhone, use Camera and tap the website banner. Check each intended print size, material, finish, lighting condition, and normal viewing distance. Confirm both phones open the destination above.",
    "",
    "See `validation-report.json` for the ZXing decode results for every PNG size, rendered SVG, and rendered PDF.",
    "",
  ].join("\n"));
  if (!validation.passed) throw new Error("At least one exported QR failed validation.");

  for (const obsoleteDir of obsoleteDirs) await fs.rm(obsoleteDir, { recursive: true, force: true });
  const archivePath = path.join(outputDirectory, "atelier-qr-all-in-one.zip");
  const archiveBytes = await writeZipArchive({ outputDirectory, archivePath });

  console.log(`Generated exactly ${variantReports.length} QR variants for ${destinationUrl}`);
  console.log(`QR matrix: ${matrix.size}×${matrix.size} modules at error correction H; quiet zone: ${config.quietZoneModules} modules.`);
  console.log(`Exports: ${path.relative(ROOT, outputDirectory)}`);
  console.log(`Validation: ${validationItems.length}/${validationItems.length} QR decoding checks passed.`);
  console.log(`All-in-one ZIP: ${path.relative(ROOT, archivePath)} (${Math.ceil(archiveBytes / 1024)} KB).`);
  for (const variant of variantReports) {
    console.log(`${variant.id}: ${variant.foreground} on ${variant.background}, contrast ${variant.contrastRatio}${variant.logo ? `, logo knockout ${variant.logo.knockoutCoverageOfMatrixPercent}% of matrix area` : ""}.`);
  }
}

main().catch((error) => {
  console.error(`QR generation failed: ${error?.stack || error}`);
  process.exitCode = 1;
});
