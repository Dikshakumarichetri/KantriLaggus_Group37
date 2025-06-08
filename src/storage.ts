import { Storage } from '@ionic/storage';

const storage = new Storage();
await storage.create(); // This must be awaited before use

export default storage;
