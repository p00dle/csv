import { describe, it, expect } from 'vitest';

import {
  stringifyCsv,
  CsvColumns,
  CsvParams,
  parseCsv,
  parseCsvFromStream,
  stringifyCsvFromStream,
  createParseCsvStream,
  createStringifyCsvStream,
  ParseCsvTransformStream,
  StringifyCsvTransformStream,
} from '../src';
import { SimpleDate } from '../src/simple-date';
import { createReadableStreamFromString, createReadableStreamFromArray, collectStream } from '../src/stream-utils';

async function testParseStream(
  csvText: string,
  chunkSize: number,
  columns?: CsvColumns,
  csvParams?: CsvParams
): Promise<any[]> {
  const readable = createReadableStreamFromString(csvText, chunkSize);
  return await parseCsvFromStream(readable, columns, csvParams);
}

async function testStringifyStream(records: any[], columns?: CsvColumns, csvParams?: CsvParams): Promise<string> {
  const readable = createReadableStreamFromArray(records);
  return await stringifyCsvFromStream(readable, columns, csvParams);
}

async function willParseStreamThrow(
  csvText: string,
  chunkSize: number,
  columns?: CsvColumns,
  csvParams?: CsvParams
): Promise<boolean> {
  try {
    await testParseStream(csvText, chunkSize, columns, csvParams);
    return false;
  } catch {
    return true;
  }
}

async function willStringifyStreamThrow(records: any[], columns?: CsvColumns, csvParams?: CsvParams): Promise<boolean> {
  try {
    await testStringifyStream(records, columns, csvParams);
    return false;
  } catch {
    return true;
  }
}

describe('stream utils', () => {
  it('createReadableStreamFromString, createReadableStreamFromArray, collectStream', async () => {
    const str = 'abcdefghijklmnopqrstuvwyz';
    const streamDefault = createReadableStreamFromString(str);
    expect((await collectStream(streamDefault)).join('')).toEqual(str);
    const stream1 = createReadableStreamFromString(str, 1);
    expect((await collectStream(stream1)).join('')).toEqual(str);
    const stream5 = createReadableStreamFromString(str, 5);
    expect((await collectStream(stream5)).join('')).toEqual(str);
    const stream100 = createReadableStreamFromString(str, 100);
    expect((await collectStream(stream100)).join('')).toEqual(str);
    const records = [{ a: 1 }, { b: 2 }, { c: 3 }];
    const objStream = createReadableStreamFromArray(records);
    expect(await collectStream(objStream)).toEqual(records);
  });
});

describe('stream factories', () => {
  it('parse', () => expect(createParseCsvStream() instanceof ParseCsvTransformStream).toBe(true));
  it('stringify', () => expect(createStringifyCsvStream() instanceof StringifyCsvTransformStream).toBe(true));
});

describe('parse-stringify untyped', () => {
  const csv = `col1,col2,col3
a,1,2.3
b,2,2.4
d,,
`;
  const records = [
    { col1: 'a', col2: '1', col3: '2.3' },
    { col1: 'b', col2: '2', col3: '2.4' },
    { col1: 'd', col2: null, col3: null },
  ];
  it('parse sync', () => expect(parseCsv(csv)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000)).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records)).toEqual(csv));
});

describe('parse-stringify typed', () => {
  const csv = `col1,col2,col3,col4,col5,col6,col7
a,1,2.3,4.5,TRUE,50%,A
b,2,2.4,5.6,FALSE,0%,B
d,,,,,,
`;
  const cols = {
    strings: { type: 'text', header: 'col1' },
    integers: { type: 'integer', header: 'col2' },
    custom: {
      type: 'custom',
      header: 'col3',
      parse: (str) => str + 'c',
      stringify: (str) => (str ? str.replace(/c$/, '') : ''),
    },
    floats: { type: 'float', header: 'col4' },
    bools: { type: 'boolean', header: 'col5' },
    percs: { type: 'percentage', header: 'col6' },
    cats: { type: 'category', categories: ['A', 'B'], header: 'col7' },
  } satisfies CsvColumns;
  const records = [
    { strings: 'a', integers: 1, custom: '2.3c', floats: 4.5, bools: true, percs: 0.5, cats: 'A' },
    { strings: 'b', integers: 2, custom: '2.4c', floats: 5.6, bools: false, percs: 0, cats: 'B' },
    { strings: 'd', integers: null, custom: null, floats: null, bools: null, percs: null, cats: null },
  ];
  it('parse sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols)).toEqual(csv));
});

describe('parse untyped with escaped new lines', () => {
  const csv = `col1,col2,col3
" ","
","
a ""
b"",
"
,"",
,"""","
c"
,"d
  e",f
g,h,"i"`;
  const records = [
    { col1: ' ', col2: '\n', col3: '\na "\nb",\n' },
    { col1: null, col2: null, col3: null },
    { col1: null, col2: '"', col3: '\nc' },
    { col1: null, col2: 'd\n  e', col3: 'f' },
    { col1: 'g', col2: 'h', col3: 'i' },
  ];
  it('sync', () => expect(parseCsv(csv)).toEqual(records));
  it('stream-1', async () => expect(await testParseStream(csv, 1)).toEqual(records));
  it('stream-1000', async () => expect(await testParseStream(csv, 1000)).toEqual(records));
});

describe('parse-stringify whitespace and bom before headers', () => {
  const csv = `ï»¿\r

head1,head2,head3
,,
a,b,c`;
  const fixedCsv = `head1,head2,head3
,,
a,b,c
`;
  const records = [
    { head1: null, head2: null, head3: null },
    { head1: 'a', head2: 'b', head3: 'c' },
  ];
  it('parse sync', () => expect(parseCsv(csv)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000)).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records)).toEqual(fixedCsv));
  it('stringify stream', async () => expect(await testStringifyStream(records)).toEqual(fixedCsv));
});

describe('parse-stringify empty values as undefined', () => {
  const csv = `a,b,c
,,
`;
  const records = [{ a: undefined, b: undefined, c: undefined }];
  it('sync', () => expect(parseCsv(csv, undefined, { useNullForEmpty: false })).toEqual(records));
  it('stream-1', async () =>
    expect(await testParseStream(csv, 5, undefined, { useNullForEmpty: false })).toEqual(records));
  it('stream-1000', async () =>
    expect(await testParseStream(csv, 1000, undefined, { useNullForEmpty: false })).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records)).toEqual(csv));
});

describe('parse throws on unterminated quote', () => {
  const csv = `h1,h2,h3
a,b,"c
`;
  it('sync', () => expect(() => parseCsv(csv)).toThrow());
  it('stream-1', async () => expect(await willParseStreamThrow(csv, 1)).toBe(true));
  it('stream-1000', async () => expect(await willParseStreamThrow(csv, 1000)).toBe(true));
});

describe('parse throws on invalid csv', () => {
  const csv = `h1,h2,h3
a,b
`;
  it('sync', () => expect(() => parseCsv(csv)).toThrow());
  it('stream-1', async () => expect(await willParseStreamThrow(csv, 1)).toBe(true));
  it('stream-1000', async () => expect(await willParseStreamThrow(csv, 1000)).toBe(true));
});

describe('parse booleans', () => {
  // boolean: (x) => (x !== '0' && x !== 'N' && x !== 'false' && x !== 'FALSE' && x !== 'False'),
  const csv = `trueStr,true,falseStr,false
1,1,0,0
Y,Y,N,N
y,y,n,n
true,true,false,false
TRUE,TRUE,FALSE,FALSE
True,True,False,False
yes,yes,no,no
YES,YES,NO,NO
Yes,Yes,No,No
anything,anything,,
`;
  const cols = {
    trueStr: 'text',
    true: 'boolean',
    falseStr: 'text',
    false: 'boolean',
  } satisfies CsvColumns;
  const records = [
    { trueStr: '1', falseStr: '0', true: true, false: false },
    { trueStr: 'Y', falseStr: 'N', true: true, false: false },
    { trueStr: 'y', falseStr: 'n', true: true, false: false },
    { trueStr: 'true', falseStr: 'false', true: true, false: false },
    { trueStr: 'TRUE', falseStr: 'FALSE', true: true, false: false },
    { trueStr: 'True', falseStr: 'False', true: true, false: false },
    { trueStr: 'yes', falseStr: 'no', true: true, false: false },
    { trueStr: 'YES', falseStr: 'NO', true: true, false: false },
    { trueStr: 'Yes', falseStr: 'No', true: true, false: false },
    { trueStr: 'anything', falseStr: null, true: true, false: null },
  ];
  it('sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
});

describe('parse empty string untyped', () => {
  const csv = '';
  const records = [];
  it('sync', () => expect(parseCsv(csv)).toEqual(records));
  it('stream-1', async () => expect(await testParseStream(csv, 1)).toEqual(records));
  it('stream-1000', async () => expect(await testParseStream(csv, 1000)).toEqual(records));
});

describe('parse empty string typed', () => {
  const csv = '';
  const cols = { col: 'text' } satisfies CsvColumns;
  const records = [];
  it('sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
});

describe('parse quoted headers untyped', () => {
  const csv = `"a","""",","
1,2,3`;
  const records = [{ a: '1', '"': '2', ',': '3' }];
  it('sync', () => expect(parseCsv(csv)).toEqual(records));
  it('stream-1', async () => expect(await testParseStream(csv, 1)).toEqual(records));
  it('stream-1000', async () => expect(await testParseStream(csv, 1000)).toEqual(records));
});

describe('parse quoted headers typed', () => {
  const csv = `"a","""",","
1,2,3`;
  const cols = {
    a: 'integer',
    '"': 'integer',
    ',': 'integer',
  } satisfies CsvColumns;
  const records = [{ a: 1, '"': 2, ',': 3 }];
  it('sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
});

describe('stringify escaped headers', () => {
  const csv = `a,"""",","
1,2,3
`;
  const cols = {
    a: 'integer',
    '"': 'integer',
    ',': 'integer',
  } satisfies CsvColumns;
  const records = [{ a: 1, '"': 2, ',': 3 }];
  it('sync', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stream', async () => expect(await testStringifyStream(records)).toEqual(csv));
  it('sync typed', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stream typed', async () => expect(await testStringifyStream(records)).toEqual(csv));
});

describe('parse throw on empty header', () => {
  const csv = `h1,,h3
a,b,c
`;
  it('sync', () => expect(() => parseCsv(csv)).toThrow());
  it('stream-1', async () => expect(await willParseStreamThrow(csv, 1)).toBe(true));
  it('stream-1000', async () => expect(await willParseStreamThrow(csv, 1000)).toBe(true));
});

describe('parse-stringify on non-standard quote and quoteEscape', () => {
  const csv = `'h1\\'',h2
'\\'',','
`;
  const records = [{ "h1'": "'", h2: ',' }];
  const cols = undefined;
  const csvParams: CsvParams = {
    quote: "'",
    escapeQuote: "\\'",
  };
  it('parse sync', () => expect(parseCsv(csv, cols, csvParams)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols, csvParams)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, cols, csvParams)).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records, cols, csvParams)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols, csvParams)).toEqual(csv));
});

describe('parse-stringify on non-standard delimiter and rowSeparator', () => {
  const csv = `h1\th2|a\tb|`;
  const records = [{ h1: 'a', h2: 'b' }];
  const cols = undefined;
  const csvParams: CsvParams = {
    delimiter: '\t',
    rowSeparator: '|',
    dateOptions: {},
  };
  it('parse sync', () => expect(parseCsv(csv, cols, csvParams)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols, csvParams)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, cols, csvParams)).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records, cols, csvParams)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols, csvParams)).toEqual(csv));
});

describe('stringify ignoreUnderscoredProps and titleCaseHeaders', () => {
  const csv = `Foo Bar
2
4
`;
  const records = [
    { _int: 1, fooBar: 2 },
    { _int: 3, fooBar: 4 },
  ];
  const cols = undefined;
  const csvParams: CsvParams = {
    ignoreUnderscoredProps: true,
    titleCaseHeaders: true,
  };
  it('stringify sync', () => expect(stringifyCsv(records, cols, csvParams)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols, csvParams)).toEqual(csv));
});

describe('parse custom column with undefined parse', () => {
  const csv = `h1
1
1.1
str
true

`;
  const records = [{ h1: '1' }, { h1: '1.1' }, { h1: 'str' }, { h1: 'true' }, { h1: null }];
  const cols = { h1: 'custom' } satisfies CsvColumns;
  it('parse sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
});

describe('stringify custom column with undefined stringify', () => {
  const csv = `h1
1
1.1
str

`;
  const records = [{ h1: 1 }, { h1: 1.1 }, { h1: 'str' }, { h1: null }];
  const cols = { h1: 'custom' } satisfies CsvColumns;
  it('stringify sync', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols)).toEqual(csv));
});

describe('stringify type string when value is not string', () => {
  const csv = `h1
1
1.1
str
true
false

`;
  const records = [{ h1: 1 }, { h1: 1.1 }, { h1: 'str' }, { h1: true }, { h1: false }, { h1: null }];
  const cols = { h1: 'text' } satisfies CsvColumns;
  it('stringify sync', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols)).toEqual(csv));
});

describe('parse-stringify throws on custom dateFormats', () => {
  const csv = `h1
a
`;
  const records = [{ h1: 'a' }];
  const cols = undefined;
  const csvParams: CsvParams = {
    dateFormats: {
      date: 'anything',
    },
  };
  it('parse sync', () => expect(() => parseCsv(csv, cols, csvParams)).toThrow());
  it('parse stream-1', async () => expect(await willParseStreamThrow(csv, 1, cols, csvParams)).toBe(true));
  it('parse stream-1000', async () => expect(await willParseStreamThrow(csv, 1000, cols, csvParams)).toBe(true));
  it('stringify sync', () => expect(() => stringifyCsv(records, cols, csvParams)).toThrow());
  it('stringify stream', async () => expect(await willStringifyStreamThrow(records, cols, csvParams)).toBe(true));
});

describe('parse-stringify no quotes tab separated file with carriage returns', () => {
  const csv = `col1\tcol2\tcol3\r
1\t2\t3\r
1
a\t2
b\t3
c\r
`;
  const records = [
    { col1: '1', col2: '2', col3: '3' },
    { col1: '1\na', col2: '2\nb', col3: '3\nc' },
  ];
  const csvOptions = {
    preserveCarriageReturn: true,
    delimiter: '\t',
    quote: null,
    escapeQuote: null,
    rowSeparator: '\r\n',
  };
  it('parse sync', () => expect(parseCsv(csv, undefined, csvOptions)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, undefined, csvOptions)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, undefined, csvOptions)).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records, undefined, csvOptions)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, undefined, csvOptions)).toEqual(csv));
});

describe('parse-stringify date', () => {
  const csv = `date,datetime,datetimes,timestamp
2000-01-02,2000-01-02 03:04,2000-01-02 03:04:05,2000-01-02 03:04:05.678
`;
  const records = [
    {
      date: +new Date(2000, 0, 2),
      datetime: +new Date(2000, 0, 2, 3, 4),
      datetimes: +new Date(2000, 0, 2, 3, 4, 5),
      timestamp: +new Date(2000, 0, 2, 3, 4, 5, 678),
    },
  ];
  const cols = {
    date: 'date',
    datetime: 'datetime',
    datetimes: 'datetimes',
    timestamp: 'timestamp',
  } satisfies CsvColumns;
  it('parse sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
  it('stringify sync', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols)).toEqual(csv));
});

describe('SimpleDate', () => {
  const date = new SimpleDate();
  // @ts-expect-error date.parse allows only strings
  it('returns NaN on non-string value', () => expect(date.parse(23)).toBeNaN());
  it('provides default format', () => expect(date.parse('2000-01-02 03:04')).toBe(+new Date(2000, 0, 2, 3, 4)));
  it('returns NaN on empty string', () => expect(date.parse('')).toBeNaN());
  it('throws when dst is not "none"', () => expect(() => new SimpleDate({ dst: 'eu' })).toThrow());
  it('throws when timezoneOffset is not 0', () => expect(() => new SimpleDate({ timezoneOffset: -6 })).toThrow());
});

describe('Missing field in csv should produce null', () => {
  const csv = 'h1,h3\na,a\nb,b\nc,c\n';
  const records = [{ h2: null }, { h2: null }, { h2: null }];
  const cols = { h2: 'text' } satisfies CsvColumns;
  it('parse sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
});

describe('parse without headers', () => {
  const csv = `a,b,c\nd,e,f\n`;
  const cols = {
    col1: 'text',
    col2: 'text',
    col3: 'text',
  } satisfies CsvColumns;
  const records = [
    { col1: 'a', col2: 'b', col3: 'c' },
    { col1: 'd', col2: 'e', col3: 'f' },
  ];
  it('parse sync', () => expect(parseCsv(csv, cols, { noHeader: true })).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols, { noHeader: true })).toEqual(records));
  it('parse stream-1000', async () =>
    expect(await testParseStream(csv, 1000, cols, { noHeader: true })).toEqual(records));
  it('parse sync - throws on no cols', () => expect(() => parseCsv(csv, undefined, { noHeader: true })).toThrow());
  it('parse stream - throws on no cols', async () => {
    let err: any = null;
    try {
      await testParseStream(csv, 1, undefined, { noHeader: true });
    } catch (error) {
      err = error;
    }
    expect(err).not.toBeNull();
  });
});

describe('parse throws on non-nullable column with empty value', () => {
  const csv = `a,b\nd,\n`;
  const cols = {
    a: 'text',
    b: { type: 'text', nullable: false },
  } satisfies CsvColumns;
  it('parse sync', () => expect(() => parseCsv(csv, cols)).toThrow());
  it('parse stream-1', async () => expect(await willParseStreamThrow(csv, 1, cols)).toBe(true));
  it('parse stream-1000', async () => expect(await willParseStreamThrow(csv, 1000, cols)).toBe(true));
});

describe('stringify throws on non-nullable column with undefined/null/NaN value', () => {
  const records = [
    {
      a: 'a',
      null: null,
      undefined,
      nan: NaN,
    },
  ];
  const colsNull = {
    a: 'text',
    null: { type: 'text', nullable: false },
  } satisfies CsvColumns;
  const colsUndefined = {
    a: 'text',
    undefined: { type: 'boolean', nullable: false },
  } satisfies CsvColumns;
  const colsNan = {
    a: 'text',
    nan: { type: 'float', nullable: false },
  } satisfies CsvColumns;
  it('stringify sync - null', () => expect(() => stringifyCsv(records, colsNull)).toThrow());
  it('stringify stream - null', async () => expect(await willStringifyStreamThrow(records, colsNull)).toBe(true));
  it('stringify sync - undefined', () => expect(() => stringifyCsv(records, colsUndefined)).toThrow());
  it('stringify stream - undefined', async () =>
    expect(await willStringifyStreamThrow(records, colsUndefined)).toBe(true));
  it('stringify sync - NaN', () => expect(() => stringifyCsv(records, colsNan)).toThrow());
  it('stringify stream - NaN', async () => expect(await willStringifyStreamThrow(records, colsNan)).toBe(true));
});

describe('stringify respects custom column indexes', () => {
  const records = [{ a: 0, b: 1, c: 2 }];
  const cols = {
    a: { type: 'integer', index: 2 },
    b: { type: 'integer', index: 1 },
    c: { type: 'integer', index: 0 },
  } satisfies CsvColumns;
  const csv = `c,b,a
2,1,0
`;
  it('stringify sync', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols)).toEqual(csv));
});

describe('parse throws on unknown category', () => {
  const csv = `a\nb\n`;
  const cols = {
    a: { type: 'category', categories: ['c'] },
  } satisfies CsvColumns;
  it('parse sync', () => expect(() => parseCsv(csv, cols)).toThrow());
  it('parse stream-1', async () => expect(await willParseStreamThrow(csv, 1, cols)).toBe(true));
  it('parse stream-1000', async () => expect(await willParseStreamThrow(csv, 1000, cols)).toBe(true));
});

describe('parse accepts known category', () => {
  const records = [{ a: 'c' }];
  const csv = `a\nc\n`;
  const cols = {
    a: { type: 'category', categories: ['c'] },
  } satisfies CsvColumns;
  it('parse sync', () => expect(parseCsv(csv, cols)).toEqual(records));
  it('parse stream-1', async () => expect(await testParseStream(csv, 1, cols)).toEqual(records));
  it('parse stream-1000', async () => expect(await testParseStream(csv, 1000, cols)).toEqual(records));
});

describe('stringify throws on unknown category', () => {
  const records = [{ a: 'b' }];
  const cols = {
    a: { type: 'category', categories: ['c'] },
  } satisfies CsvColumns;
  it('stringify sync', () => expect(() => stringifyCsv(records, cols)).toThrow());
  it('stringify stream', async () => expect(await willStringifyStreamThrow(records, cols)).toBe(true));
});

describe('stringify accepts known category', () => {
  const records = [{ a: 'c' }];
  const csv = `a\nc\n`;
  const cols = {
    a: { type: 'category', categories: ['c'] },
  } satisfies CsvColumns;
  it('stringify sync', () => expect(stringifyCsv(records, cols)).toEqual(csv));
  it('stringify stream', async () => expect(await testStringifyStream(records, cols)).toEqual(csv));
});
