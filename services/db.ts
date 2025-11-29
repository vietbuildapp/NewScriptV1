import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProcessedNews } from '../types';

interface AppDB extends DBSchema {
  news: {
    key: number;
    value: ProcessedNews;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'news-script-factory-db';
const DB_VERSION = 1;

class DBService {
  private dbPromise: Promise<IDBPDatabase<AppDB>>;

  constructor() {
    this.dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('news', { keyPath: 'id' });
        store.createIndex('by-date', 'createdAt');
      },
    });
  }

  async saveNews(news: ProcessedNews) {
    const db = await this.dbPromise;
    await db.put('news', news);
  }

  async getNews(id: number) {
    const db = await this.dbPromise;
    return db.get('news', id);
  }

  async getAllNews() {
    const db = await this.dbPromise;
    return db.getAllFromIndex('news', 'by-date');
  }

  async deleteNews(id: number) {
    const db = await this.dbPromise;
    await db.delete('news', id);
  }
  
  async clearAll() {
    const db = await this.dbPromise;
    await db.clear('news');
  }
}

export const dbService = new DBService();
