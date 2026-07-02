import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface CategoryStore {
  [username: string]: string;
}

const DEFAULT_FILE_PATH = path.join(os.homedir(), '.sf-org-manager', 'categories.json');

export class CategoryService {
  private cache: CategoryStore | undefined;

  constructor(private readonly filePath: string = DEFAULT_FILE_PATH) {}

  private load(): CategoryStore {
    if (this.cache) {
      return this.cache;
    }
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.cache = JSON.parse(raw) as CategoryStore;
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  private save(store: CategoryStore): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
    this.cache = store;
  }

  getCategory(username: string): string | undefined {
    return this.load()[username];
  }

  assignCategory(username: string, category: string): void {
    this.save({ ...this.load(), [username]: category });
  }

  removeCategory(username: string): void {
    const store = { ...this.load() };
    delete store[username];
    this.save(store);
  }

  listCategories(): string[] {
    return [...new Set(Object.values(this.load()))].sort();
  }
}
