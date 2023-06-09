export type CsvColumnType =
  | 'text'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'datetimes'
  | 'timestamp'
  | 'custom'
  | 'percentage';
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

export type CsvColumn<T extends Record<string, any>, P extends keyof T = keyof T> = {
  type: CsvColumnType;
  nullable?: boolean;
  stringify?: (val: T[P]) => string;
  parse?: (str: string) => T[P];
  header?: string;
  index?: number;
};

export type InternalColumn<T extends Record<string, any>, P extends keyof T = keyof T> = {
  prop: P;
  type: CsvColumnType;
  nullable?: boolean;
  stringify?: (val: T[P]) => string;
  parse?: (str: string) => T[P];
  stringifyRow?: (row: T) => string;
  header: string;
  index: number;
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

export type CsvColumns<T extends Record<string, any> = Record<string, any>> = {
  [P in keyof T]?: CsvColumn<T, P> | CsvColumnType;
};

export type ParsersByType = Record<CsvColumnType, ((str: string) => any) | null>;

export type StringifyersByType = Record<CsvColumnType, ((val: any) => string) | null>;

type InferColumnType<C> = C extends { type: CsvColumnType }
  ? C['type'] extends 'text'
    ? string
    : C['type'] extends 'integer'
    ? number
    : C['type'] extends 'float'
    ? number
    : C['type'] extends 'boolean'
    ? boolean
    : C['type'] extends 'date'
    ? number
    : C['type'] extends 'datetime'
    ? number
    : C['type'] extends 'datetimes'
    ? number
    : C['type'] extends 'timestamp'
    ? number
    : C['type'] extends 'percentage'
    ? number
    : C['type'] extends 'custom'
    ? C extends { parse: (val: string) => infer X }
      ? X
      : never
    : never
  : C extends 'text'
  ? string
  : C extends 'integer'
  ? number
  : C extends 'float'
  ? number
  : C extends 'boolean'
  ? boolean
  : C extends 'date'
  ? number
  : C extends 'datetime'
  ? number
  : C extends 'datetimes'
  ? number
  : C extends 'timestamp'
  ? number
  : C extends 'percentage'
  ? number
  : never;

type InferColumns<C> = {
  [K in keyof C]: InferColumnType<C[K]>;
};

type FlatType<T> = T extends object ? { [K in keyof T]: FlatType<T[K]> } : T;

export type InferParseType<C extends CsvColumns> = C extends never ? Record<string, any> : FlatType<InferColumns<C>[]>;
