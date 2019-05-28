import fs from 'fs';
import glob from 'glob';
import mockfs from 'mock-fs';
import path from 'path';
import { promisify } from 'util';
import { IMigration } from '@uifabric/migration/lib/migration';

const globAsync = promisify(glob);
const readFileAsync = promisify(fs.readFile);
const fixturesRoot = path.join(__dirname, '..', '..', '..', '..', 'fixtures');

// tslint:disable-next-line: no-any
const fileSystem: any = {};

async function recordFile(filename: string): Promise<void> {
  const contents = await readFileAsync(filename);
  const trimmedName = filename.substring(fixturesRoot.length);
  const parts = path.dirname(trimmedName).split(path.sep);
  parts[0] = '_root';
  let current = fileSystem;
  parts.forEach(p => {
    if (!current[p]) {
      current[p] = {};
    }
    current = current[p];
  });
  current[path.basename(trimmedName)] = contents.toString();
}

let initialSetupComplete = false;
async function setup() {
  if (!initialSetupComplete) {
    const files = await globAsync(path.join(fixturesRoot, '**', '*.ts?'));
    const promises = files.map(recordFile);
    await Promise.all(promises);
    initialSetupComplete = true;
  }
  mockfs(fileSystem);
}

function teardown() {
  mockfs.restore();
}

export async function runMigration(migration: IMigration, filename: string): Promise<string> {
  await setup();
  try {
    migration.step({ dryRun: false });
    const contents = await readFileAsync(path.join('_root', filename));
    teardown();
    return contents.toString();
  } catch (e) {
    teardown();
    throw e;
  }
}