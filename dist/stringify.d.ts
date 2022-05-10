/// <reference types="node" />
import type { CsvColumns, CsvParams } from './types';
import type { TransformCallback, Readable } from 'node:stream';
import { Transform } from 'node:stream';
export declare class CsvStringifyer<T = Record<string, any>> {
    private delimiter;
    private rowSeparator;
    private quote;
    private escapeQuote;
    private quoteRegex;
    private titleCaseHeaders;
    private ignoreUnderscoredProps;
    private dateClass;
    private columnsInferred;
    private dateOptions;
    private dateFormats;
    private stringifyers;
    private rowStringifyers;
    private props;
    private width;
    private shouldTestForEscape;
    private headers;
    private headerSent;
    private skipHeader;
    private areColsRow;
    output: string[];
    private onPushString;
    setOnPushString(listener: (str: string) => any): void;
    private onError;
    setOnError(listener: (err: Error) => any): void;
    constructor(columns?: CsvColumns<T>, options?: CsvParams);
    private initiate;
    stringifyRow(row: T): void;
}
export declare function stringifyCsv<T extends Record<string, any>>(records: T[], columns?: CsvColumns<T>, options?: CsvParams): string;
export declare class StringifyCsvTransformStream<T = Record<string, any>> extends Transform {
    private stringifyer;
    constructor(columns?: CsvColumns<T>, options?: CsvParams);
    _transform(chunk: T, _encoding: BufferEncoding, done: TransformCallback): void;
    _flush(done: TransformCallback): void;
}
export declare function createStringifyCsvStream<T extends Record<string, any>>(columns?: CsvColumns<T>, options?: CsvParams): Transform;
export declare function stringifyCsvFromStream<T extends Record<string, any>>(stream: Readable | Transform, columns?: CsvColumns<T>, options?: CsvParams): Promise<string>;
//# sourceMappingURL=stringify.d.ts.map