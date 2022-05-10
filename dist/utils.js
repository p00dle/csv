"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escape = exports.shouldEscape = exports.makeColumns = exports.stringifyersByTypeFactory = exports.parsersByTypeFactory = exports.camelCaseToTitleCase = exports.normalizeOptions = exports.defaultOptions = void 0;
const simple_date_1 = require("./simple-date");
exports.defaultOptions = {
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
    dateFactory: (params) => new simple_date_1.SimpleDate(params),
    skipHeader: false,
    useNullForEmpty: true,
};
function normalizeOptions(options) {
    return options
        ? Object.assign(Object.assign(Object.assign({}, exports.defaultOptions), options), { dateOptions: options.dateOptions
                ? Object.assign(Object.assign({}, exports.defaultOptions.dateOptions), options.dateOptions) : exports.defaultOptions.dateOptions, dateFormats: options.dateFormats
                ? Object.assign(Object.assign({}, exports.defaultOptions.dateFormats), options.dateFormats) : exports.defaultOptions.dateFormats }) : exports.defaultOptions;
}
exports.normalizeOptions = normalizeOptions;
function camelCaseToTitleCase(str) {
    return str.replace(/[A-Z]/g, (x) => ' ' + x).replace(/^[a-z]/, (x) => x.toUpperCase());
}
exports.camelCaseToTitleCase = camelCaseToTitleCase;
function parsersByTypeFactory(dateFactory, dateOptions, dateFormats) {
    const date = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.date }));
    const datetime = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.dateTime }));
    const datetimes = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.dateTimeSeconds }));
    const timestamp = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.timestamp }));
    return {
        string: (x) => x,
        integer: (x) => parseInt(x, 10),
        float: (x) => x * 1,
        boolean: (x) => x !== '0' &&
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
exports.parsersByTypeFactory = parsersByTypeFactory;
function stringifyersByTypeFactory(dateFactory, dateOptions, dateFormats) {
    const date = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.date }));
    const datetime = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.dateTime }));
    const datetimes = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.dateTimeSeconds }));
    const timestamp = dateFactory(Object.assign(Object.assign({}, dateOptions), { format: dateFormats.timestamp }));
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
exports.stringifyersByTypeFactory = stringifyersByTypeFactory;
function makeColumns(firstRow, ignoreUnderscored, titleCaseHeaders) {
    let props = Object.keys(firstRow);
    if (ignoreUnderscored)
        props = props.filter((prop) => String(prop)[0] !== '_');
    return props
        .filter((prop) => typeof prop === 'string')
        .map((prop) => ({
        csvProp: titleCaseHeaders ? camelCaseToTitleCase(String(prop)) : String(prop),
        prop,
        type: 'custom',
    }));
}
exports.makeColumns = makeColumns;
function shouldEscape(str, delimiter, escape, rowSeperator) {
    return (str.indexOf(delimiter) !== -1 ||
        str.indexOf(escape) !== -1 ||
        str.indexOf('\n') !== -1 ||
        str.indexOf('\r') !== -1 ||
        str.indexOf(rowSeperator) !== -1);
}
exports.shouldEscape = shouldEscape;
function escape(str, quote, escapeQuote, quoteRegex) {
    return quote + str.replace(quoteRegex, escapeQuote) + quote;
}
exports.escape = escape;
//# sourceMappingURL=utils.js.map