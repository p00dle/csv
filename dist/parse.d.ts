/// <reference types="node" />
import type { TransformCallback } from 'node:stream';
import type { CsvColumns, CsvParams } from './types';
import { Transform, Readable } from 'node:stream';
export declare class CsvParser<T = Record<string, any>> {
    private isStream;
    headersParsed: boolean;
    buffer: string;
    output: T[];
    private delimiter;
    private delimiterLength;
    private rowSeparator;
    private rowSeparatorLength;
    private quote;
    private quoteLength;
    private escapeQuote;
    private escapeQuoteLength;
    private escapeQuoteRegex;
    private dateContructor;
    private dateOptions;
    private dateFormats;
    private columns;
    private headerStartFound;
    private useColumn;
    private saveFieldAs;
    private parsers;
    private width;
    private col;
    private rowValues;
    private cursor;
    private valueIndexStart;
    private valueIndexEnd;
    private isEscapeAllQuotes;
    private emptyValue;
    private isCurrentValueQuoted;
    private isCurrentValueStarted;
    private isCurrentColLast;
    private csvHeaders;
    constructor(isStream: boolean, columns?: CsvColumns<T>, options?: CsvParams);
    setOnPushValue(listener: (val: T) => any): void;
    setOnError(listener: (err: Error) => any): void;
    parseHeaders(): boolean;
    parseCsv(): void;
    finalParseCsv(): void;
    private onPushValue;
    private onError;
    private initiate;
    private flushProcessed;
    private pushValue;
    private determineValueType;
}
export declare function parseCsv<T extends Record<string, any>>(csvString: string, columns?: CsvColumns<T>, options?: CsvParams): T[];
export declare class ParseCsvTransformStream<T = Record<string, any>> extends Transform {
    private parser;
    constructor(columns?: CsvColumns<T>, options?: CsvParams);
    _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback): void;
    _flush(done: TransformCallback): void;
}
export declare function createParseCsvTransformStream<T extends Record<string, any>>(columns?: CsvColumns<T>, options?: CsvParams): Transform;
export declare function parseCsvFromStream<T extends Record<string, any>>(stream: Readable | Transform, columns?: CsvColumns<T>, options?: CsvParams): Promise<T[]>;
//# sourceMappingURL=parse.d.ts.map