export type CsvColumnType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'datetimes'
  | 'timestamp'
  | 'custom'
  | 'percentage'
  | 'row';

type DST = 'none' | 'eu' | 'us';

export interface DateParams {
  format?: string;
  locale?: any;
  timezoneOffset?: number | 'local';
  dst?: DST;
}

export abstract class DateClass<T extends DateParams = DateParams> {
  // eslint-disable-next-line no-useless-constructor
  constructor(_params: T) {
    //
  }

  parse(_str: string): number {
    return 0;
  }

  stringify(_n: number): string {
    return '';
  }
}

export type DateConstructor = { new (params: DateParams): DateClass };

export type CsvColumn<T extends Record<string, any>, P extends keyof T = keyof T> =
  | {
      prop: P;
      type: Exclude<CsvColumnType, 'row'>;
      stringify?: (val: T[P]) => string;
      parse?: (str: string) => T[P];
      stringifyRow?: (row: T) => string;
      csvProp?: string;
    }
  | {
      type: 'row';
      stringifyRow: (row: T) => string;
      csvProp: string;
    };

export interface CsvOptions {
  delimiter: string;
  quote: string | null;
  preserveCarriageReturn: boolean;
  escapeQuote: string | null;
  rowSeparator: string;
  ignoreUnderscoredProps: boolean;
  dateOptions: Omit<DateParams, 'format'>;
  dateFormats: {
    date: string;
    dateTime: string;
    dateTimeSeconds: string;
    timestamp: string;
  };
  dateClass: DateConstructor;
  noHeader: boolean;
  useNullForEmpty: boolean;
  titleCaseHeaders: boolean;
}

export type CsvParams = Partial<
  Omit<CsvOptions, 'dateOptions' | 'dateFormats'> & {
    dateOptions?: Partial<CsvOptions['dateOptions']>;
    dateFormats?: Partial<CsvOptions['dateFormats']>;
  }
>;

export type CsvColumns<T extends Record<string, any> = Record<string, any>> = CsvColumn<T>[] | readonly CsvColumn<T>[];

export type ParsersByType = Record<CsvColumnType, ((str: string) => any) | null>;

export type StringifyersByType = Record<CsvColumnType, ((val: any) => string) | null>;
