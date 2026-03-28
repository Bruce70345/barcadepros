import encUtf8 from "crypto-js/enc-utf8";
import Rabbit from "crypto-js/rabbit";
import { deleteDB, IDBPDatabase, openDB } from "idb";

const DB_NAME = "app-store";
const STORE_NAME = "kv";
const DB_VERSION = 1;
const ENCRYPTION_KEY = "ALZK";

// 初始化資料庫
export async function initDatabase(): Promise<void> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // 檢查並建立 store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          console.log("Created store:", STORE_NAME);
        }
      },
      blocked() {
        console.log(
          "Database is blocked. Please close all other tabs with this site open"
        );
      },
      blocking() {
        console.log("Database is blocking other connections");
      },
      terminated() {
        console.error("Database connection was terminated");
      },
    });

    db.close();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw new Error("Failed to initialize database");
  }
}

// 檢查並獲取資料庫連接
async function getDatabase(): Promise<IDBPDatabase> {
  try {
    // 先嘗試打開資料庫
    const db = await openDB(DB_NAME, DB_VERSION);

    // 確認 store 是否存在
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.close();
      // 如果 store 不存在，刪除資料庫並重新初始化
      await deleteDB(DB_NAME);
      await initDatabase();
      return await openDB(DB_NAME, DB_VERSION);
    }

    return db;
  } catch (error) {
    console.error("Error getting database:", error);
    // 如果出錯，嘗試重新初始化
    await initDatabase();
    return await openDB(DB_NAME, DB_VERSION);
  }
}

// 儲存加密後的資料
export async function setToIndexedDB(
  key: string,
  value: string
): Promise<void> {
  let db: IDBPDatabase | null = null;
  try {
    db = await getDatabase();
    const encryptedValue = value;
    await db.put(STORE_NAME, encryptedValue, key);
    // console.log(`Data saved successfully for key: ${key}`);
  } catch (error) {
    console.error("Error setting data:", error);
    throw new Error("Failed to set data to IndexedDB");
  } finally {
    db?.close();
  }
}

// 取得並解密資料
export async function getFromIndexedDB(key: string): Promise<string | null> {
  let db: IDBPDatabase | null = null;
  try {
    db = await getDatabase();
    const encryptedValue = await db.get(STORE_NAME, key);

    if (!encryptedValue) {
      console.log(`No value found for key: ${key}`);
      return null;
    }

    try {
      // 嘗試解密
      return Rabbit.decrypt(encryptedValue, ENCRYPTION_KEY).toString(encUtf8);
    } catch (decryptError: any) {
      console.error(`解密失敗: ${decryptError.message}`);
      // 若解密失敗，返回 null 而非拋出異常
      return null;
    }
  } catch (error) {
    console.error("Error getting data:", error);
    // 若讀取失敗，返回 null 而非拋出異常
    return null;
  } finally {
    db?.close();
  }
}

// 刪除特定 key 的資料
export async function deleteFromIndexedDB(key: string): Promise<void> {
  let db: IDBPDatabase | null = null;
  try {
    db = await getDatabase();
    await db.delete(STORE_NAME, key);
    console.log(`Data deleted successfully for key: ${key}`);
  } catch (error) {
    console.error("Error deleting data:", error);
    throw new Error("Failed to delete data from IndexedDB");
  } finally {
    db?.close();
  }
}

// 刪除整個資料庫
export async function deleteDatabase(): Promise<void> {
  try {
    await deleteDB(DB_NAME);
    console.log("Database deleted successfully");
  } catch (error) {
    console.error("Error deleting database:", error);
    throw new Error("Failed to delete database");
  }
}

// 檢查資料庫是否存在
export async function isDatabaseExists(): Promise<boolean> {
  let db: IDBPDatabase | null = null;
  try {
    db = await getDatabase();
    return true;
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

// 列出所有儲存的 keys
export async function getAllKeys(): Promise<string[]> {
  let db: IDBPDatabase | null = null;
  try {
    db = await getDatabase();
    const keys = await db.getAllKeys(STORE_NAME);
    return keys as string[];
  } catch (error) {
    console.error("Error getting keys:", error);
    throw new Error("Failed to get keys from IndexedDB");
  } finally {
    db?.close();
  }
}
