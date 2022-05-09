"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvFromStream = exports.createParseCsvTransformStream = exports.ParseCsvTransformStream = exports.parseCsv = exports.CsvParser = void 0;
const node_stream_1 = require("node:stream");
const utils_1 = require("./utils");
const stream_utils_1 = require("./stream-utils");
const untypedColumn = {
    type: 'custom',
    parse: (str) => str,
};
class CsvParser {
    constructor(isStream, columns, options) {
        this.isStream = isStream;
        this.headersParsed = false;
        this.buffer = '';
        this.output = [];
        this.columns = undefined;
        this.headerStartFound = false;
        this.useColumn = [];
        this.saveFieldAs = [];
        this.parsers = [];
        this.width = 0;
        this.col = 0;
        this.rowValues = {};
        this.cursor = 0;
        this.valueIndexStart = 0;
        this.valueIndexEnd = 0;
        this.emptyValue = null;
        this.isCurrentValueQuoted = false;
        this.isCurrentValueStarted = false;
        this.isCurrentColLast = false;
        this.csvHeaders = [];
        this.columns = columns;
        const { delimiter, rowSeparator, quote, escapeQuote, useNullForEmpty, dateContructor, dateOptions, dateFormats } = (0, utils_1.normalizeOptions)(options);
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
        this.dateContructor = dateContructor;
        this.dateOptions = dateOptions;
        this.dateFormats = dateFormats;
    }
    setOnPushValue(listener) {
        this.onPushValue = listener;
    }
    setOnError(listener) {
        this.onError = listener;
    }
    parseHeaders() {
        if (!this.headerStartFound) {
            const headerStartIndex = this.buffer.search(/[^ï»¿\r\n]/);
            if (headerStartIndex === -1) {
                return false;
            }
            else {
                this.cursor = headerStartIndex;
                this.headerStartFound = true;
            }
        }
        while (this.cursor < this.buffer.length) {
            if (!this.isCurrentValueStarted) {
                if (this.buffer.slice(this.cursor, this.cursor + this.rowSeparatorLength) === this.rowSeparator) {
                    const isError = this.initiate();
                    if (isError)
                        return false;
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
                }
                else {
                    return false;
                }
            }
            if (this.isCurrentValueQuoted) {
                let indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
                if (this.isEscapeAllQuotes) {
                    while (indexOfQuote !== -1 &&
                        this.buffer.slice(indexOfQuote, indexOfQuote + this.escapeQuoteLength) === this.escapeQuote) {
                        this.cursor = indexOfQuote + this.escapeQuoteLength;
                        indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
                    }
                }
                else {
                    while (indexOfQuote !== -1 &&
                        this.buffer.slice(indexOfQuote + this.quoteLength - this.escapeQuoteLength, indexOfQuote + this.quoteLength) === this.escapeQuote) {
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
                this.csvHeaders.push(this.buffer.slice(this.valueIndexStart, indexOfQuote).replace(this.escapeQuoteRegex, this.quote));
                this.cursor = indexOfQuote + this.quoteLength;
                this.isCurrentValueStarted = false;
            }
            else {
                const indexOfDelimiter = this.buffer.indexOf(this.delimiter, this.cursor);
                const indexOfRowSeparator = this.buffer.indexOf(this.rowSeparator, this.cursor);
                const endIndex = indexOfDelimiter === -1
                    ? indexOfRowSeparator
                    : indexOfRowSeparator === -1
                        ? indexOfDelimiter
                        : indexOfDelimiter < indexOfRowSeparator
                            ? indexOfDelimiter
                            : indexOfRowSeparator;
                if (endIndex === -1) {
                    this.cursor = this.buffer.length - 1;
                    break;
                }
                else {
                    this.csvHeaders.push(this.buffer.slice(this.valueIndexStart, endIndex));
                    this.isCurrentValueStarted = false;
                    this.cursor = endIndex;
                }
            }
        }
        return false;
    }
    parseCsv() {
        while (this.cursor < this.buffer.length) {
            if (!this.isCurrentValueStarted) {
                this.determineValueType();
            }
            if (this.isCurrentValueQuoted) {
                const additionalLength = this.isCurrentColLast ? this.rowSeparatorLength : this.delimiterLength;
                let indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
                if (this.isEscapeAllQuotes) {
                    while (indexOfQuote !== -1 &&
                        this.buffer.slice(indexOfQuote, indexOfQuote + this.escapeQuoteLength) === this.escapeQuote) {
                        this.cursor = indexOfQuote + this.escapeQuoteLength;
                        indexOfQuote = this.buffer.indexOf(this.quote, this.cursor);
                    }
                }
                else {
                    while (indexOfQuote !== -1 &&
                        this.buffer.slice(indexOfQuote + this.quoteLength - this.escapeQuoteLength, indexOfQuote + this.quoteLength) === this.escapeQuote) {
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
            }
            else if (this.isCurrentColLast) {
                const indexOfRowSeparator = this.buffer.indexOf(this.rowSeparator, this.cursor);
                if (indexOfRowSeparator === -1)
                    break;
                this.valueIndexEnd = indexOfRowSeparator;
                this.pushValue();
                this.flushProcessed(indexOfRowSeparator + this.rowSeparatorLength);
            }
            else {
                const indexOfDelimiter = this.buffer.indexOf(this.delimiter, this.cursor);
                if (indexOfDelimiter === -1)
                    break;
                this.valueIndexEnd = indexOfDelimiter;
                this.pushValue();
                this.flushProcessed(indexOfDelimiter + this.delimiterLength);
            }
        }
    }
    finalParseCsv() {
        if (!this.isCurrentValueStarted) {
            this.determineValueType();
        }
        const finalStr = this.buffer.slice(this.valueIndexStart).trimEnd();
        if (this.isCurrentColLast && this.width > 1) {
            if (this.isCurrentValueQuoted) {
                if (finalStr.slice(-this.quoteLength) === this.quote) {
                    this.valueIndexEnd = this.buffer.length - 1;
                    this.pushValue();
                }
                else {
                    return this.onError(new Error('Unterminated quote'));
                }
            }
            else {
                this.valueIndexEnd = finalStr.length + this.cursor;
                this.pushValue();
            }
        }
        else if (this.col !== 0) {
            return this.onError(new Error('Malformed csv string'));
        }
    }
    onPushValue(val) {
        this.output.push(val);
    }
    onError(error) {
        throw error;
    }
    initiate() {
        try {
            const colIndexes = this.columns
                ? this.csvHeaders.map((csvProp) => this.columns.findIndex((col) => col.type === 'row' ? false : col.csvProp === csvProp || col.prop === csvProp))
                : this.csvHeaders.map((_, i) => i);
            this.useColumn = colIndexes.map((index) => index !== -1);
            this.saveFieldAs = this.columns
                ? colIndexes.map((index) => {
                    if (index === -1)
                        return '';
                    const col = this.columns[index];
                    return col.prop;
                })
                : this.csvHeaders;
            const optionsInCsv = this.columns
                ? colIndexes.map((index) => (index === -1 ? null : this.columns[index]))
                : this.csvHeaders.map(() => untypedColumn);
            const parsersByType = (0, utils_1.parsersByTypeFactory)(this.dateContructor, this.dateOptions, this.dateFormats);
            this.parsers = optionsInCsv.map((option) => {
                if (option === null)
                    return null;
                if (option.type === 'custom')
                    return option.parse || parsersByType.custom;
                else
                    return parsersByType[option.type];
            });
            this.width = this.csvHeaders.length;
            this.headersParsed = true;
            return false;
        }
        catch (err) {
            this.onError(err);
            return true;
        }
    }
    flushProcessed(index) {
        if (this.isStream) {
            this.buffer = this.buffer.slice(index);
            this.cursor = 0;
            this.valueIndexStart = 0;
        }
        else {
            this.cursor = index;
            this.valueIndexStart = index;
        }
    }
    pushValue() {
        if (this.useColumn[this.col]) {
            let value = this.buffer.slice(this.valueIndexStart, this.valueIndexEnd);
            if (this.isCurrentValueQuoted)
                value = value.replace(this.escapeQuoteRegex, this.quote);
            this.rowValues[this.saveFieldAs[this.col]] =
                value === '' ? this.emptyValue : this.parsers[this.col](value);
        }
        this.col++;
        if (this.col === this.width) {
            this.onPushValue(this.rowValues);
            this.rowValues = {};
            this.col = 0;
        }
        this.isCurrentValueStarted = false;
    }
    determineValueType() {
        this.isCurrentColLast = this.col === this.width - 1;
        this.isCurrentValueQuoted = this.buffer.slice(this.cursor, this.cursor + this.quoteLength) === this.quote;
        this.valueIndexStart = this.isCurrentValueQuoted ? this.cursor + this.quoteLength : this.cursor;
        this.isCurrentValueStarted = true;
        if (this.isCurrentValueQuoted)
            this.cursor += this.quoteLength;
    }
}
exports.CsvParser = CsvParser;
function parseCsv(csvString, columns, options) {
    const parser = new CsvParser(false, columns, options);
    parser.buffer = /\r/.test(csvString) ? csvString.replace(/\r/g, '') : csvString;
    parser.parseHeaders();
    parser.parseCsv();
    parser.finalParseCsv();
    return parser.output;
}
exports.parseCsv = parseCsv;
class ParseCsvTransformStream extends node_stream_1.Transform {
    constructor(columns, options) {
        super({ objectMode: true });
        this.parser = new CsvParser(true, columns, options);
        this.parser.setOnError((err) => this.emit('error', err));
        this.parser.setOnPushValue((val) => this.push(val));
    }
    _transform(chunk, _encoding, done) {
        this.parser.buffer += ('' + chunk).replace(/\r/g, '');
        if (!this.parser.headersParsed) {
            if (!this.parser.parseHeaders()) {
                return done();
            }
        }
        this.parser.parseCsv();
        done();
    }
    _flush(done) {
        this.parser.parseCsv();
        this.parser.finalParseCsv();
        done(null);
    }
}
exports.ParseCsvTransformStream = ParseCsvTransformStream;
function createParseCsvTransformStream(columns, options) {
    return new ParseCsvTransformStream(columns, options);
}
exports.createParseCsvTransformStream = createParseCsvTransformStream;
function parseCsvFromStream(stream, columns, options) {
    const parseStream = createParseCsvTransformStream(columns, options);
    stream.pipe(parseStream);
    return (0, stream_utils_1.collectStream)(parseStream);
}
exports.parseCsvFromStream = parseCsvFromStream;
//# sourceMappingURL=parse.js.map