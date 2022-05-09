/// <reference types="node" />
import { Readable, Transform } from 'node:stream';
export declare function createReadableStreamFromString(str: string, chunkSize?: number): Readable;
export declare function createReadableStreamFromArray(arr: any[]): Readable;
export declare function collectStream(stream: Transform | Readable, objectMode?: boolean): Promise<any[]>;
//# sourceMappingURL=stream-utils.d.ts.map