import type { CsvColumns, CsvOptions, CsvParams, DateConstructor } from './types';
import type { TransformCallback, Readable } from 'node:stream';

import { Transform } from 'node:stream';
import {
  makeColumns,
  normalizeOptions,
  shouldEscape,
  stringifyersByTypeFactory,
  escape,
  transformColumns,
} from './utils';
import { collectStream } from './stream-utils';

export class CsvStringifyer<T extends Record<string, any> = Record<string, any>> {
  private delimiter: string;
  private rowSeparator: string;
  private quote: string;
  private escapeQuote: string;
  private quoteRegex: RegExp;
  private titleCaseHeaders: boolean;
  private ignoreUnderscoredProps: boolean;
  private dateClass: DateConstructor;
  private columnsInferred = false;
  private isColumnNonNullable: boolean[] = [];
  private columnCategories: (string[] | null)[] = [];
  private dateOptions: CsvOptions['dateOptions'];
  private dateFormats: CsvOptions['dateFormats'];
  private hasQuotes: boolean;
  private stringifyers: (((val: any) => string) | null)[] = [];
  private props: string[] = [];
  private width = 0;
  private shouldTestForEscape: boolean[] = [];
  private headers: string[] = [];
  private headerSent = false;
  private noHeader: boolean;
  public output: string[] = [];

  constructor(columns?: CsvColumns<T>, options?: CsvParams) {
    const {
      delimiter,
      rowSeparator,
      quote,
      escapeQuote,
      dateClass,
      dateOptions,
      ignoreUnderscoredProps,
      titleCaseHeaders,
      noHeader,
      dateFormats,
    } = normalizeOptions(options);
    this.ignoreUnderscoredProps = ignoreUnderscoredProps;
    this.delimiter = delimiter;
    this.rowSeparator = rowSeparator;
    this.hasQuotes = typeof quote === 'string' && typeof escapeQuote === 'string';
    this.quote = quote || '';
    this.escapeQuote = escapeQuote || '';
    this.dateClass = dateClass;
    this.dateOptions = dateOptions;
    this.quoteRegex = new RegExp(quote || '', 'g');
    this.titleCaseHeaders = titleCaseHeaders;
    this.noHeader = noHeader;
    this.dateFormats = dateFormats;
    if (typeof columns !== 'undefined') {
      this.initiate(columns);
    }
  }

  public setOnPushString(listener: (str: string) => any) {
    this.onPushString = listener;
  }

  public setOnError(listener: (err: Error) => any) {
    this.onError = listener;
  }

  public stringifyRow(row: T) {
    if (!this.columnsInferred) {
      const isError = this.initiate(makeColumns(row, this.ignoreUnderscoredProps, this.titleCaseHeaders));
      if (isError) return;
    }
    if (!this.headerSent) {
      this.onPushString(
        this.headers
          .map((str) =>
            this.hasQuotes && shouldEscape(str, this.delimiter, this.quote, this.rowSeparator)
              ? escape(str, this.quote, this.escapeQuote, this.quoteRegex)
              : str
          )
          .join(this.delimiter) + this.rowSeparator
      );
      this.headerSent = true;
    }
    const rowStrings: string[] = [];
    for (let col = 0; col < this.width; col++) {
      const value = row[this.props[col] as unknown as keyof T];
      const valueIsEmpty = value === undefined || value === null || (typeof value === 'number' && isNaN(value));
      if (this.isColumnNonNullable[col] && valueIsEmpty) {
        throw new Error(`null/undefined/NaN value found in column ${this.props[col]}`);
      }
      const colCategories = this.columnCategories[col];
      if (colCategories && !valueIsEmpty) {
        if (!colCategories.includes(value)) {
          console.log({ colCategories, value, col: this.props[col] });
          throw new Error(`Unknown category "${value}" in column ${this.props[col]}`);
        }
      }
      let str = (this.stringifyers[col] as (val: any) => string)(value);
      if (
        this.hasQuotes &&
        this.shouldTestForEscape[col] &&
        shouldEscape(str, this.delimiter, this.quote, this.rowSeparator)
      ) {
        str = escape(str, this.quote, this.escapeQuote, this.quoteRegex);
      }
      rowStrings.push(str);
    }
    this.onPushString(rowStrings.join(this.delimiter) + this.rowSeparator);
  }

  private onError(error: Error) {
    throw error;
  }

  private onPushString(str: string) {
    this.output.push(str);
  }

  private initiate(columnsObj: CsvColumns<T>): boolean {
    try {
      const columns = transformColumns(columnsObj);
      const stringifyersByType = stringifyersByTypeFactory(this.dateClass, this.dateOptions, this.dateFormats);
      this.stringifyers = columns.map((col) => {
        if (col.type === 'custom') {
          return col.stringify || stringifyersByType.custom;
        } else {
          return stringifyersByType[col.type];
        }
      });
      this.columnCategories = columns.map((col) => (col.categories.length > 0 ? col.categories : null));
      this.width = columns.length;
      this.props = columns.map((col) => col.prop as string);
      this.headers = columns.map((col) => col.header);
      this.shouldTestForEscape = columns.map((col) => col.type === 'text' || col.type === 'custom');
      this.columnsInferred = true;
      this.headerSent = this.noHeader;
      this.isColumnNonNullable = columns.map((col) => (typeof col.nullable === 'boolean' ? !col.nullable : false));
      return false;
    } catch (err) {
      this.onError(err as Error);
      return true;
    }
  }
}

export function stringifyCsv<T extends Record<string, any>>(
  records: T[],
  columns?: CsvColumns<T>,
  options?: CsvParams
): string {
  const stringifyer = new CsvStringifyer(columns, options);
  records.forEach((row) => stringifyer.stringifyRow(row));
  return stringifyer.output.join('');
}

export class StringifyCsvTransformStream<T extends Record<string, any> = Record<string, any>> extends Transform {
  private stringifyer: CsvStringifyer<T>;
  constructor(columns?: CsvColumns<T>, options?: CsvParams) {
    super({ objectMode: true });
    this.stringifyer = new CsvStringifyer(columns, options);
    this.stringifyer.setOnPushString((str) => this.push(str));
    this.stringifyer.setOnError((err) => this.emit('error', err));
  }

  _transform(chunk: T, _encoding: BufferEncoding, done: TransformCallback): void {
    try {
      this.stringifyer.stringifyRow(chunk);
      done();
    } catch (err) {
      this.emit('error', err);
    }
  }

  _flush(done: TransformCallback): void {
    done(null);
  }
}

export function createStringifyCsvStream<T extends Record<string, any>>(
  columns?: CsvColumns<T>,
  options?: CsvParams
): Transform {
  return new StringifyCsvTransformStream(columns, options);
}

export function stringifyCsvFromStream<T extends Record<string, any>>(
  stream: Readable | Transform,
  columns?: CsvColumns<T>,
  options?: CsvParams
): Promise<string> {
  const stringifyStream = createStringifyCsvStream(columns, options);
  stream.pipe(stringifyStream);
  return collectStream(stringifyStream).then((strings) => strings.join(''));
}
