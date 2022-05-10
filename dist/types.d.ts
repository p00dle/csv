export declare type CsvColumnType = 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'datetimes' | 'timestamp' | 'custom' | 'row';
declare type DST = 'none' | 'eu' | 'us';
export interface DateParams {
    format?: string;
    locale?: string;
    timezoneOffset?: number | 'local';
    dst?: DST;
}
export declare abstract class DateClass<T extends DateParams = DateParams> {
    constructor(_params: T);
    parse(_str: string): number;
    stringify(_n: number): string;
}
export declare type DateFactory = (params: DateParams) => DateClass;
export declare type CsvColumn<T extends Record<string, any>, P extends keyof T = keyof T> = {
    prop: P;
    type: Exclude<CsvColumnType, 'row'>;
    stringify?: (val: T[P]) => string;
    parse?: (str: string) => T[P];
    stringifyRow?: (row: T) => string;
    csvProp?: string;
} | {
    type: 'row';
    stringifyRow: (row: T) => string;
    csvProp: string;
};
export interface CsvOptions {
    delimiter: string;
    quote: string;
    escapeQuote: string;
    rowSeparator: string;
    ignoreUnderscoredProps: boolean;
    dateOptions: Omit<DateParams, 'format'>;
    dateFormats: {
        date: string;
        dateTime: string;
        dateTimeSeconds: string;
        timestamp: string;
    };
    dateFactory: DateFactory;
    skipHeader: boolean;
    useNullForEmpty: boolean;
    titleCaseHeaders: boolean;
}
export declare type CsvParams = Partial<Omit<CsvOptions, 'dateOptions' | 'dateFormats'> & {
    dateOptions?: Partial<CsvOptions['dateOptions']>;
    dateFormats?: Partial<CsvOptions['dateFormats']>;
}>;
export declare type CsvColumns<T = any> = CsvColumn<T>[] | readonly CsvColumn<T>[];
export declare type ParsersByType = Record<CsvColumnType, ((str: string) => any) | null>;
export declare type StringifyersByType = Record<CsvColumnType, ((val: any) => string) | null>;
export {};
//# sourceMappingURL=types.d.ts.map