import type { CsvOptions, CsvParams, ParsersByType, DateFactory, StringifyersByType, CsvColumn } from './types';
export declare const defaultOptions: CsvOptions;
export declare function normalizeOptions(options?: CsvParams): CsvOptions;
export declare function camelCaseToTitleCase(str: string): string;
export declare function parsersByTypeFactory(dateFactory: DateFactory, dateOptions: CsvOptions['dateOptions'], dateFormats: CsvOptions['dateFormats']): ParsersByType;
export declare function stringifyersByTypeFactory(dateFactory: DateFactory, dateOptions: CsvOptions['dateOptions'], dateFormats: CsvOptions['dateFormats']): StringifyersByType;
export declare function makeColumns<T>(firstRow: T, ignoreUnderscored: boolean, titleCaseHeaders: boolean): CsvColumn<T>[];
export declare function shouldEscape(str: string, delimiter: string, escape: string, rowSeperator: string): boolean;
export declare function escape(str: string, quote: string, escapeQuote: string, quoteRegex: RegExp): string;
//# sourceMappingURL=utils.d.ts.map