import { Buffer } from "buffer";

// Force Buffer into the global scope
(global as any).Buffer = (global as any).Buffer || Buffer;
(global as any).process = (global as any).process || { env: {} };
