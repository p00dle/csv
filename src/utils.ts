import { SimpleDate } from './simple-date';
import type { CsvOptions, CsvParams, ParsersByType, DateFactory, StringifyersByType, CsvColumn } from './types';

export const defaultOptions: CsvOptions = {
  delimiter: ',',
  quote: '"',
  escapeQuote: '""',
  rowSeparator: '\n',
  ignoreUnderscoredProps: false,
  titleCaseHeaders: false,
  dateOptions: {
    timezoneOffset: 0,
    dst: 'none',
    locale: 'en',
  },
  dateFormats: {
    date: 'YYYY-MM-DD',
    dateTime: 'YYYY-MM-DD HH:mm',
    dateTimeSeconds: 'YYYY-MM-DD HH:mm:SS',
    timestamp: 'YYYY-MM-DD HH:mm:SS.sss',
  },
  dateContructor: (params) => new SimpleDate(params),
  skipHeader: false,
  useNullForEmpty: true,
};

export function normalizeOptions(options?: CsvParams): CsvOptions {
  return options
    ? {
        ...defaultOptions,
        ...options,
        dateOptions: options.dateOptions
          ? { ...defaultOptions.dateOptions, ...options.dateOptions }
          : defaultOptions.dateOptions,
        dateFormats: options.dateFormats
          ? { ...defaultOptions.dateFormats, ...options.dateFormats }
          : defaultOptions.dateFormats,
      }
    : defaultOptions;
}

export function camelCaseToTitleCase(str: string): string {
  return str.replace(/[A-Z]/g, (x) => ' ' + x).replace(/^[a-z]/, (x) => x.toUpperCase());
}

export function parsersByTypeFactory(
  dateFactory: DateFactory,
  dateOptions: CsvOptions['dateOptions'],
  dateFormats: CsvOptions['dateFormats']
): ParsersByType {
  const date = dateFactory({ ...dateOptions, format: dateFormats.date });
  const datetime = dateFactory({ ...dateOptions, format: dateFormats.dateTime });
  const datetimes = dateFactory({ ...dateOptions, format: dateFormats.dateTimeSeconds });
  const timestamp = dateFactory({ ...dateOptions, format: dateFormats.timestamp });
  return {
    string: (x) => x,
    integer: (x) => parseInt(x, 10),
    float: (x) => (x as unknown as number) * 1,
    boolean: (x) =>
      x !== '0' &&
      x !== 'N' &&
      x !== 'n' &&
      x !== 'false' &&
      x !== 'FALSE' &&
      x !== 'False' &&
      x !== 'no' &&
      x !== 'NO' &&
      x !== 'No',
    date: (x) => date.parse(x),
    datetime: (x) => datetime.parse(x),
    datetimes: (x) => datetimes.parse(x),
    timestamp: (x) => timestamp.parse(x),
    custom: (x) => x,
    row: null,
  };
}

export function stringifyersByTypeFactory(
  dateFactory: DateFactory,
  dateOptions: CsvOptions['dateOptions'],
  dateFormats: CsvOptions['dateFormats']
): StringifyersByType {
  const date = dateFactory({ ...dateOptions, format: dateFormats.date });
  const datetime = dateFactory({ ...dateOptions, format: dateFormats.dateTime });
  const datetimes = dateFactory({ ...dateOptions, format: dateFormats.dateTimeSeconds });
  const timestamp = dateFactory({ ...dateOptions, format: dateFormats.timestamp });
  return {
    string: (x) => (typeof x === 'string' ? x : typeof x === 'boolean' || x ? '' + x : ''),
    integer: (x) => (typeof x === 'number' && !isNaN(x) ? x.toFixed(0) : ''),
    float: (x) => (typeof x === 'number' && !isNaN(x) ? '' + x : ''),
    boolean: (x) => (x !== undefined && x !== null ? (x ? 'TRUE' : 'FALSE') : ''),
    date: (x) => date.stringify(x),
    datetime: (x) => datetime.stringify(x),
    datetimes: (x) => datetimes.stringify(x),
    timestamp: (x) => timestamp.stringify(x),
    custom: (x) => (typeof x === 'string' ? x : typeof x === 'boolean' || x ? '' + x : ''),
    row: null,
  };
}

export function makeColumns<T>(firstRow: T, ignoreUnderscored: boolean, titleCaseHeaders: boolean): CsvColumn<T>[] {
  let props = Object.keys(firstRow) as (keyof T)[];
  if (ignoreUnderscored) props = props.filter((prop) => String(prop)[0] !== '_');
  return props
    .filter((prop) => typeof prop === 'string')
    .map((prop: keyof T) => ({
      csvProp: titleCaseHeaders ? camelCaseToTitleCase(String(prop)) : String(prop),
      prop,
      type: 'custom' as const,
    }));
}

export function shouldEscape(str: string, delimiter: string, escape: string, rowSeperator: string): boolean {
  return (
    str.indexOf(delimiter) !== -1 ||
    str.indexOf(escape) !== -1 ||
    str.indexOf('\n') !== -1 ||
    str.indexOf('\r') !== -1 ||
    str.indexOf(rowSeperator) !== -1
  );
}

export function escape(str: string, quote: string, escapeQuote: string, quoteRegex: RegExp): string {
  return quote + str.replace(quoteRegex, escapeQuote) + quote;
}
