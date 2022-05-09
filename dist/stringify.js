"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyCsvFromStream = exports.createStringifyCsvTransformStream = exports.StringifyCsvTransformStream = exports.stringifyCsv = exports.CsvStringifyer = void 0;
const node_stream_1 = require("node:stream");
const utils_1 = require("./utils");
const stream_utils_1 = require("./stream-utils");
class CsvStringifyer {
    constructor(columns, options) {
        this.columnsInferred = false;
        this.stringifyers = [];
        this.rowStringifyers = [];
        this.props = [];
        this.width = 0;
        this.shouldTestForEscape = [];
        this.headers = [];
        this.headerSent = false;
        this.areColsRow = [];
        this.output = [];
        const { delimiter, rowSeparator, quote, escapeQuote, dateContructor, dateOptions, ignoreUnderscoredProps, titleCaseHeaders, skipHeader, dateFormats, } = (0, utils_1.normalizeOptions)(options);
        this.ignoreUnderscoredProps = ignoreUnderscoredProps;
        this.delimiter = delimiter;
        this.rowSeparator = rowSeparator;
        this.quote = quote;
        this.escapeQuote = escapeQuote;
        this.dateContructor = dateContructor;
        this.dateOptions = dateOptions;
        this.quoteRegex = new RegExp(quote, 'g');
        this.titleCaseHeaders = titleCaseHeaders;
        this.skipHeader = skipHeader;
        this.dateFormats = dateFormats;
        if (typeof columns !== 'undefined') {
            this.initiate(columns);
        }
    }
    onPushString(str) {
        this.output.push(str);
    }
    setOnPushString(listener) {
        this.onPushString = listener;
    }
    onError(error) {
        throw error;
    }
    setOnError(listener) {
        this.onError = listener;
    }
    initiate(columns) {
        try {
            const stringifyersByType = (0, utils_1.stringifyersByTypeFactory)(this.dateContructor, this.dateOptions, this.dateFormats);
            this.stringifyers = columns.map((col) => {
                if (col.type === 'custom') {
                    return col.stringify || stringifyersByType.custom;
                }
                else if (col.type === 'row') {
                    return null;
                }
                else {
                    return stringifyersByType[col.type];
                }
            });
            this.rowStringifyers = columns.map((col) => {
                if (col.type === 'row') {
                    return col.stringifyRow;
                }
                else {
                    return null;
                }
            });
            this.width = columns.length;
            this.areColsRow = columns.map((col) => col.type === 'row');
            this.props = columns.map((col) => (col.type === 'row' ? '' : col.prop));
            this.headers = columns.map((col) => (col.type === 'row' ? col.csvProp : col.csvProp || col.prop));
            this.shouldTestForEscape = columns.map((col) => col.type === 'string' || col.type === 'custom');
            this.columnsInferred = true;
            this.headerSent = this.skipHeader;
            return false;
        }
        catch (err) {
            this.onError(err);
            return true;
        }
    }
    stringifyRow(row) {
        if (!this.columnsInferred) {
            const isError = this.initiate((0, utils_1.makeColumns)(row, this.ignoreUnderscoredProps, this.titleCaseHeaders));
            if (isError)
                return;
        }
        if (!this.headerSent) {
            this.onPushString(this.headers
                .map((str) => (0, utils_1.shouldEscape)(str, this.delimiter, this.quote, this.rowSeparator)
                ? (0, utils_1.escape)(str, this.quote, this.escapeQuote, this.quoteRegex)
                : str)
                .join(this.delimiter) + this.rowSeparator);
            this.headerSent = true;
        }
        const rowStrings = [];
        for (let col = 0; col < this.width; col++) {
            let str = this.areColsRow[col]
                ? this.rowStringifyers[col](row)
                : this.stringifyers[col](row[this.props[col]]);
            if (this.shouldTestForEscape[col] && (0, utils_1.shouldEscape)(str, this.delimiter, this.quote, this.rowSeparator)) {
                str = (0, utils_1.escape)(str, this.quote, this.escapeQuote, this.quoteRegex);
            }
            rowStrings.push(str);
        }
        this.onPushString(rowStrings.join(this.delimiter) + this.rowSeparator);
    }
}
exports.CsvStringifyer = CsvStringifyer;
function stringifyCsv(arr, columns, options) {
    const stringifyer = new CsvStringifyer(columns, options);
    arr.forEach((row) => stringifyer.stringifyRow(row));
    return stringifyer.output.join('');
}
exports.stringifyCsv = stringifyCsv;
class StringifyCsvTransformStream extends node_stream_1.Transform {
    constructor(columns, options) {
        super({ objectMode: true });
        this.stringifyer = new CsvStringifyer(columns, options);
        this.stringifyer.setOnPushString((str) => this.push(str));
        this.stringifyer.setOnError((err) => this.emit('error', err));
    }
    _transform(chunk, _encoding, done) {
        this.stringifyer.stringifyRow(chunk);
        done();
    }
    _flush(done) {
        done(null);
    }
}
exports.StringifyCsvTransformStream = StringifyCsvTransformStream;
function createStringifyCsvTransformStream(columns, options) {
    return new StringifyCsvTransformStream(columns, options);
}
exports.createStringifyCsvTransformStream = createStringifyCsvTransformStream;
function stringifyCsvFromStream(stream, columns, options) {
    const stringifyStream = createStringifyCsvTransformStream(columns, options);
    stream.pipe(stringifyStream);
    return (0, stream_utils_1.collectStream)(stringifyStream).then((strings) => strings.join(''));
}
exports.stringifyCsvFromStream = stringifyCsvFromStream;
//# sourceMappingURL=stringify.js.map