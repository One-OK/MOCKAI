export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  garments: any[];
  logos: any[];
  thumbnail?: string; // base64 or blob URL
}

const DB_NAME = 'mockai_db';
const STORE_NAME = 'projects';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const convertBlobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    if (!blobUrl.startsWith('blob:')) return blobUrl;
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to convert blob url', e);
    return blobUrl; // Fallback
  }
};

export const saveProject = async (project: Omit<SavedProject, 'updatedAt'>) => {
  try {
    // Convert all garment/logo URLs that are blob URLs to base64
    const garments = await Promise.all((project.garments || []).map(async (g) => {
      const newG = { ...g };
      if (newG.url) newG.url = await convertBlobUrlToBase64(newG.url);
      if (newG.originalUrl) newG.originalUrl = await convertBlobUrlToBase64(newG.originalUrl);
      if (newG.removedBgUrl) newG.removedBgUrl = await convertBlobUrlToBase64(newG.removedBgUrl);
      return newG;
    }));

    const logos = await Promise.all((project.logos || []).map(async (l) => {
      const newL = { ...l };
      if (newL.url) newL.url = await convertBlobUrlToBase64(newL.url);
      if (newL.originalUrl) newL.originalUrl = await convertBlobUrlToBase64(newL.originalUrl);
      if (newL.removedBgUrl) newL.removedBgUrl = await convertBlobUrlToBase64(newL.removedBgUrl);
      return newL;
    }));

    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        ...project,
        garments,
        logos,
        updatedAt: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Save project error:', e);
  }
};

export const loadProjects = async (): Promise<SavedProject[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      // sort by updatedAt descending
      const projects = (request.result as SavedProject[]).sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(projects);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
