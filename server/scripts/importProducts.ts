import fs from 'fs';
import path from 'path';
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

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: ts-node importProducts.ts <file.csv>');
    process.exit(1);
  }
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.csv') {
    console.error('Only CSV files are supported in this demo.');
    process.exit(1);
  }
  const rows = parseCsv(file);
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
