import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { storage } from '../storage';

interface CsvRow {
  sellerId: number;
  title: string;
  description: string;
  category: string;
  price: number;
  totalUnits: number;
  availableUnits: number;
  minOrderQuantity: number;
  orderMultiple: number;
  images: string[];
  condition: string;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',');
  return lines.map(line => {
    const values = line.split(',');
    const row: any = {};
    headers.forEach((h, i) => {
      row[h.trim()] = values[i] ? values[i].trim() : '';
    });
    row.sellerId = Number(row.sellerId);
    row.price = Number(row.price);
    row.totalUnits = Number(row.totalUnits);
    row.availableUnits = Number(row.availableUnits);
    row.minOrderQuantity = Number(row.minOrderQuantity);
    row.orderMultiple = Number(row.orderMultiple);
    row.images = row.images ? row.images.split('|') : [];
    return row as CsvRow;
  });
}

function parseXlsx(filePath: string): CsvRow[] {
  const sheetXml = execSync(`unzip -p "${filePath}" xl/worksheets/sheet1.xml`).toString();
  let sharedStrings: string[] = [];
  try {
    const sharedXml = execSync(`unzip -p "${filePath}" xl/sharedStrings.xml`).toString();
    sharedStrings = Array.from(sharedXml.matchAll(/<t>([^<]*)<\/t>/g)).map(m => m[1]);
  } catch {}

  const rows: string[][] = [];
  const rowMatches = sheetXml.match(/<row[^>]*>([\s\S]*?)<\/row>/g) || [];
  for (const row of rowMatches) {
    const cells: string[] = [];
    const cellMatches = Array.from(row.matchAll(/<c[^>]*>([\s\S]*?)<\/c>/g));
    for (const c of cellMatches) {
      const cell = c[0];
      const valueMatch = c[1].match(/<v>([^<]*)<\/v>/);
      let value = valueMatch ? valueMatch[1] : '';
      if (/t="s"/.test(cell)) {
        const idx = parseInt(value, 10);
        value = sharedStrings[idx] || '';
      }
      cells.push(value);
    }
    rows.push(cells);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map(vals => {
    const row: any = {};
    headers.forEach((h, i) => {
      row[h.trim()] = vals[i] ? vals[i].trim() : '';
    });
    row.sellerId = Number(row.sellerId);
    row.price = Number(row.price);
    row.totalUnits = Number(row.totalUnits);
    row.availableUnits = Number(row.availableUnits);
    row.minOrderQuantity = Number(row.minOrderQuantity);
    row.orderMultiple = Number(row.orderMultiple);
    row.images = row.images ? row.images.split('|') : [];
    return row as CsvRow;
  });
}

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: ts-node importProducts.ts <file.csv|file.xlsx>');
    process.exit(1);
  }
  const ext = path.extname(file).toLowerCase();
  let rows: CsvRow[] = [];
  if (ext === '.csv') {
    rows = parseCsv(file);
  } else if (ext === '.xlsx') {
    rows = parseXlsx(file);
  } else {
    console.error('Only CSV or XLSX files are supported.');
    process.exit(1);
  }
  for (const row of rows) {
    await storage.createProduct({
      sellerId: row.sellerId,
      title: row.title,
      description: row.description,
      category: row.category,
      price: row.price,
      totalUnits: row.totalUnits,
      availableUnits: row.availableUnits,
      minOrderQuantity: row.minOrderQuantity,
      orderMultiple: row.orderMultiple,
      images: row.images,
      condition: row.condition,
    });
    console.log('Imported', row.title);
  }
  console.log('Import complete');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
