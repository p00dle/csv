import type { TransformCallback } from 'node:stream';
import type { CsvColumns, CsvOptions, CsvParams, DateFactory } from './types';

import { Transform, Readable } from 'node:stream';
import { normalizeOptions, parsersByTypeFactory } from './utils';
import { collectStream } from './stream-utils';

const untypedColumn = {
  type: 'custom',
  parse: (str: string) => str,
} as const;

export class CsvParser<T = Record<string, any>> {
  public headersParsed = false;
  public buffer = '';
  public output: T[] = [];
  private delimiter: string;
  private delimiterLength: number;
  private rowSeparator: string;
  private rowSeparatorLength: number;
  private quote: string;
  private quoteLength: number;
  private escapeQuote: string;
  private escapeQuoteLength: number;
  private escapeQuoteRegex: RegExp;
  private dateFactory: DateFactory;
  private dateOptions: CsvOptions['dateOptions'];
  private dateFormats: CsvOptions['dateFormats'];
  private columns: CsvColumns<T> | undefined = undefined;
  private headerStartFound = false;
  private useColumn: boolean[] = [];
  private saveFieldAs: string[] = [];
  private parsers: (((str: string) => any) | null)[] = [];
  private width = 0;
  private col = 0;
  private rowValues: Partial<T> = {};
  private cursor = 0;
  private valueIndexStart = 0;
  private valueIndexEnd = 0;
  private isEscapeAllQuotes: boolean;
  private emptyValue: undefined | null = null;
  private isCurrentValueQuoted = false;
  private isCurrentValueStarted = false;
  private isCurrentColLast = false;
  private csvHeaders: string[] = [];

  constructor(private isStream: boolean, columns?: CsvColumns<T>, options?: CsvParams) {
    this.columns = columns;
    const { delimiter, rowSeparator, quote, escapeQuote, useNullForEmpty, dateFactory, dateOptions, dateFormats } =
      normalizeOptions(options);
    this.delimiter = delimiter;
    this.delimiterLength = delimiter.length;
    this.rowSeparator = rowSeparator;
    this.rowSeparatorLength = rowSeparator.length;
    this.quote = quote;
    this.quoteLength = quote.length;
    this.escapeQuote = escapeQuote;
    this.escapeQuoteLength = escapeQuote.length;
    this.escapeQuoteRegex = new RegExp(escapeQuote.replace(/\\/g, '\\\\'), 'g');
    this.isEscapeAllQuotes = Array.from(escapeQuote).every((char) => char === quote);
    this.emptyValue = useNullForEmpty ? null : undefined;
    this.dateFactory = dateFactory;
    this.dateOptions = dateOptions;
    this.dateFormats = dateFormats;
  }

  public setOnPushValue(listener: (val: T) => any) {
    this.onPushValue = listener;
  }
  public setOnError(listener: (err: Error) => any) {
    this.onError = listener;
  }

  public parseHeaders(): boolean {
    if (!this.headerStartFound) {
      const headerStartIndex = this.buffer.search(/[^ï»¿\r\n]/);
      if (headerStartIndex === -1) {
        return false;
      } else {
        this.cursor = headerStartIndex;
        this.headerStartFound = true;
      }
    }
    while (this.cursor < this.buffer.length) {
      if (!this.isCurrentValueStarted) {
        if (this.buffer.slice(this.cursor, this.cursor + this.rowSeparatorLength) === this.rowSeparator) {
          const isError = this.initiate();
          if (isError) return false;
          this.flushProcessed(this.cursor + this.rowSeparatorLength);
          return true;
        }
        if (this.buffer.slice(this.cursor, this.cursor + this.delimiterLength) === this.delimiter) {
          if (this.buffer.slice(this.cursor - this.delimiterLength, this.cursor) === this.delimiter) {
            this.onError(new Error('Empty headers not allowed'));
          }
          this.cursor += this.delimiterLength;
        }
        if (this.cursor !== this.buffer.length) {
          this.determineValueType();
        } else {
          return false;
        }
      }
      if (this.isCurrentValueQuoted) {
        let indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
        if (this.isEscapeAllQuotes) {
          while (
            indexOfQuote !== -1 &&
            this.buffer.slice(indexOfQuote, indexOfQuote + this.escapeQuoteLength) === this.escapeQuote
          ) {
            this.cursor = indexOfQuote + this.escapeQuoteLength;
            indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
          }
        } else {
          while (
            indexOfQuote !== -1 &&
            this.buffer.slice(
              indexOfQuote + this.quoteLength - this.escapeQuoteLength,
              indexOfQuote + this.quoteLength
            ) === this.escapeQuote
          ) {
            this.cursor = indexOfQuote + this.quoteLength;
            indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
          }
        }
        if (indexOfQuote === -1 || indexOfQuote === this.buffer.length - 1) {
          if (this.buffer.length > 1 && this.buffer.length - 1 > this.cursor) {
            this.cursor = this.buffer.length - 1;
          }
          break;
        }
        this.csvHeaders.push(
          this.buffer.slice(this.valueIndexStart, indexOfQuote).replace(this.escapeQuoteRegex, this.quote)
        );
        this.cursor = indexOfQuote + this.quoteLength;
        this.isCurrentValueStarted = false;
      } else {
        const indexOfDelimiter = this.buffer.indexOf(this.delimiter, this.cursor);
        const indexOfRowSeparator = this.buffer.indexOf(this.rowSeparator, this.cursor);
        const endIndex =
          indexOfDelimiter === -1
            ? indexOfRowSeparator
            : indexOfRowSeparator === -1
            ? indexOfDelimiter
            : indexOfDelimiter < indexOfRowSeparator
            ? indexOfDelimiter
            : indexOfRowSeparator;
        if (endIndex === -1) {
          this.cursor = this.buffer.length - 1;
          break;
        } else {
          this.csvHeaders.push(this.buffer.slice(this.valueIndexStart, endIndex));
          this.isCurrentValueStarted = false;
          this.cursor = endIndex;
        }
      }
    }
    return false;
  }

  public parseCsv() {
    while (this.cursor < this.buffer.length) {
      if (!this.isCurrentValueStarted) {
        this.determineValueType();
      }
      if (this.isCurrentValueQuoted) {
        const additionalLength = this.isCurrentColLast ? this.rowSeparatorLength : this.delimiterLength;
        let indexOfQuote: number = this.buffer.indexOf(this.quote, this.cursor);
        if (this.isEscapeAllQuotes) {
          while (
            indexOfQuote !== -1 &&
            this.buffer.slice(indexOfQuote, indexOfQuote + this.escapeQuoteLength) === this.escapeQuote
          ) {
            this.cursor = indexOfQuote + this.escapeQuoteLength;
            indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
          }
        } else {
          while (
            indexOfQuote !== -1 &&
            this.buffer.slice(
              indexOfQuote + this.quoteLength - this.escapeQuoteLength,
              indexOfQuote + this.quoteLength
            ) === this.escapeQuote
          ) {
            this.cursor = indexOfQuote + this.quoteLength;
            indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
          }
        }
        if (indexOfQuote === -1 || indexOfQuote === this.buffer.length - 1) {
          if (this.buffer.length > 1 && this.buffer.length - 1 > this.cursor) {
            this.cursor = this.buffer.length - 1;
          }
          break;
        }
        this.valueIndexEnd = indexOfQuote;
        this.pushValue();
        this.flushProcessed(indexOfQuote + this.quoteLength + additionalLength);
      } else if (this.isCurrentColLast) {
        const indexOfRowSeparator = this.buffer.indexOf(this.rowSeparator, this.cursor);
        if (indexOfRowSeparator === -1) break;
        this.valueIndexEnd = indexOfRowSeparator;
        this.pushValue();
        this.flushProcessed(indexOfRowSeparator + this.rowSeparatorLength);
      } else {
        const indexOfDelimiter = this.buffer.indexOf(this.delimiter, this.cursor);
        if (indexOfDelimiter === -1) break;
        this.valueIndexEnd = indexOfDelimiter;
        this.pushValue();
        this.flushProcessed(indexOfDelimiter + this.delimiterLength);
      }
    }
  }

  public finalParseCsv() {
    if (!this.isCurrentValueStarted) {
      this.determineValueType();
    }
    const finalStr = this.buffer.slice(this.valueIndexStart).trimEnd();
    if (this.isCurrentColLast && this.width > 1) {
      if (this.isCurrentValueQuoted) {
        if (finalStr.slice(-this.quoteLength) === this.quote) {
          this.valueIndexEnd = this.buffer.length - 1;
          this.pushValue();
        } else {
          return this.onError(new Error('Unterminated quote'));
        }
      } else {
        this.valueIndexEnd = finalStr.length + this.cursor;
        this.pushValue();
      }
    } else if (this.col !== 0) {
      return this.onError(new Error('Malformed csv string'));
    }
  }

  private onPushValue(val: T) {
    this.output.push(val);
  }
  private onError(error: Error) {
    throw error;
  }

  private initiate(): boolean {
    try {
      const colIndexes = this.columns
        ? this.csvHeaders.map((csvProp) =>
            (this.columns as CsvColumns<T>).findIndex((col) =>
              col.type === 'row' ? false : col.csvProp === csvProp || col.prop === csvProp
            )
          )
        : this.csvHeaders.map((_, i) => i);
      this.useColumn = colIndexes.map((index) => index !== -1);
      this.saveFieldAs = this.columns
        ? colIndexes.map((index) => {
            if (index === -1) return '';
            const col = (this.columns as CsvColumns<T>)[index] as { prop: string };
            return col.prop as string;
          })
        : this.csvHeaders;
      const optionsInCsv = this.columns
        ? colIndexes.map((index) => (index === -1 ? null : (this.columns as CsvColumns<T>)[index]))
        : this.csvHeaders.map(() => untypedColumn);
      const parsersByType = parsersByTypeFactory(this.dateFactory, this.dateOptions, this.dateFormats);
      this.parsers = optionsInCsv.map((option) => {
        if (option === null) return null;
        if (option.type === 'custom') return option.parse || parsersByType.custom;
        else return parsersByType[option.type];
      });
      this.width = this.csvHeaders.length;
      this.headersParsed = true;
      return false;
    } catch (err) {
      this.onError(err as Error);
      return true;
    }
  }

  private flushProcessed(index: number) {
    if (this.isStream) {
      this.buffer = this.buffer.slice(index);
      this.cursor = 0;
      this.valueIndexStart = 0;
    } else {
      this.cursor = index;
      this.valueIndexStart = index;
    }
  }

  private pushValue() {
    if (this.useColumn[this.col]) {
      let value = this.buffer.slice(this.valueIndexStart, this.valueIndexEnd);
      if (this.isCurrentValueQuoted) value = value.replace(this.escapeQuoteRegex, this.quote);
      this.rowValues[this.saveFieldAs[this.col] as keyof T] =
        value === '' ? this.emptyValue : (this.parsers[this.col] as (str: string) => any)(value);
    }
    this.col++;
    if (this.col === this.width) {
      this.onPushValue(this.rowValues as T);
      this.rowValues = {};
      this.col = 0;
    }
    this.isCurrentValueStarted = false;
  }

  private determineValueType() {
    this.isCurrentColLast = this.col === this.width - 1;
    this.isCurrentValueQuoted = this.buffer.slice(this.cursor, this.cursor + this.quoteLength) === this.quote;
    this.valueIndexStart = this.isCurrentValueQuoted ? this.cursor + this.quoteLength : this.cursor;
    this.isCurrentValueStarted = true;
    if (this.isCurrentValueQuoted) this.cursor += this.quoteLength;
  }
}
/** Parses csvString synchronously. */
export function parseCsv<T extends Record<string, any>>(
  string: string,
  columns?: CsvColumns<T>,
  options?: CsvParams
): T[] {
  const parser = new CsvParser(false, columns, options);
  parser.buffer = /\r/.test(string) ? string.replace(/\r/g, '') : string;
  parser.parseHeaders();
  parser.parseCsv();
  parser.finalParseCsv();
  return parser.output;
}

export class ParseCsvTransformStream<T = Record<string, any>> extends Transform {
  private parser: CsvParser<T>;
  constructor(columns?: CsvColumns<T>, options?: CsvParams) {
    super({ objectMode: true });
    this.parser = new CsvParser(true, columns, options);
    this.parser.setOnError((err) => this.emit('error', err));
    this.parser.setOnPushValue((val) => this.push(val));
  }
  _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback): void {
    this.parser.buffer += ('' + chunk).replace(/\r/g, '');
    if (!this.parser.headersParsed) {
      if (!this.parser.parseHeaders()) {
        return done();
      }
    }
    this.parser.parseCsv();
    done();
  }
  _flush(done: TransformCallback): void {
    this.parser.parseCsv();
    this.parser.finalParseCsv();
    done(null);
  }
}

export function createParseCsvStream<T extends Record<string, any>>(
  columns?: CsvColumns<T>,
  options?: CsvParams
): Transform {
  return new ParseCsvTransformStream(columns, options);
}

export function parseCsvFromStream<T extends Record<string, any>>(
  stream: Readable | Transform,
  columns?: CsvColumns<T>,
  options?: CsvParams
): Promise<T[]> {
  const parseStream = createParseCsvStream(columns, options);
  stream.pipe(parseStream);
  return collectStream(parseStream);
}
