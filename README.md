### Overview

No dependency CSV parsing and stringifying, synchronously or via stream, typed or untyped

### Installation

```shell
yarn install @p00dle/csv
```

or

```shell
npm install @p00dle/csv
```

### API

#### parseCsv

Parses string synchronously.

- input
  - string: string
  - columns?: [CsvColumn](#csvcolumn)
  - params?: [CsvParams](#csvparams)
- output
  - when columns are specified it returns array of type inferred from columns, otherwise array of records

Example

```ts
import { parseCsv } from '@p00dle/csv';

const csvString = 'a,b\n1,2\n';
const columns = [
  { prop: 'a', type: 'integer' },
  { prop: 'b', type: 'string' },
] as const;
console.log(parseCsv(csvString)); // [ { a: '1', b: '2' } ]
console.log(parseCsv(csvString, columns)); // [ { a: 1, b: '2' } ]
```

#### stringifyCsv

Stringifies array of records.
If columns are not specified the columns will be inferred from the first row.

- input
  - records: when columns are specified array of type inferred from columns, otherwise array of records
  - columns?: [CsvColumn[]](#csvcolumn)
  - params?: [CsvParams](#csvparams)
- output
  - string

Example

```ts
import { stringifyCsv } from '@p00dle/csv';

const records = [{ a: 1 }, { a: 1, b: 2 }];
const columns = [
  { prop: 'a', type: 'integer' },
  { prop: 'b', type: 'integer' },
] as const;
console.log(stringifyCsv(records)); // 'a\n1\n'
console.log(stringifyCsv(records, columns)); // 'a,b\n1,\n1,2\n'
```

#### createParseCsvStream

Creates a transform stream for parsing csv.

- input
  - columns?: [CsvColumn[]](#csvcolumn)
  - params?: [CsvParams](#csvparams)
- output
  - Transform stream that takes in strings and outputs records in objectMode

Example

```ts
import { createParseCsvStream, createStringifyCsvStream } from '@p00dle/csv';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
const readable = createReadStream('./input.csv');
const writable = createWriteStream('./output.csv');
const parseStream = createParseCsvStream();
const stringifyStream = createStringifyCsvStream();
pipeline(
  readable,
  parseStream,
  stringifyStream,
  writable,
  (err) => (err ? console.log(err) : console.log('done')) // 'done'
);
```

#### createStringifyCsvStream

Creates a transform stream for stringifying csv.

- input
  - columns?: [CsvColumn[]](#csvcolumn)
  - params?: [CsvParams](#csvparams)
- output
  - Transform stream that takes records in objectMode and outputs strings

Example: see above

#### parseCsvFromStream

Takes an string input stream and asynchronously parses csv

- input
  - stream: Readable | Transform
  - columns?: [CsvColumn[]](#csvcolumn)
  - params?: [CsvParams](#csvparams)
- output
  - Promise of array of types specified in columns when defined or array of records otherwise

Example:

```ts
import { parseCsvFromStream } from '@p00dle/csv';
import { createReadStream } from 'node:fs';

const readable = createReadStream('./input.csv');
(async () => {
  console.log(await parseCsvFromStream(readable)); // array of records
})();
```

#### stringifyCsvFromStream

Takes an objectMode input stream and asynchronously stringifies csv

- input
  - stream: Readable | Transform
  - columns?: [CsvColumn[]](#csvcolumn)
  - params?: [CsvParams](#csvparams)
- output
  - Promise of string

Example:

```ts
import { stringifyCsvFromStream, createParseCsvStream } from '@p00dle/csv';
import { createReadStream } from 'node:fs';

const readable = createReadStream('./input.csv');
const parseStream = createParseCsvStream();

(async () => {
  readable.pipe(parseStream);
  console.log(await stringifyCsvFromStream(parseStream)); // csv string
})();
```

### Types

#### CsvColumn

```ts
type CsvColumn<T extends Record<string, any>, P extends keyof T = keyof T> =
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
```

Note: when parsing empty strings will always be parsed as either null or undefined when useNullForEmpty is true

- _prop_: property on the object; when _csvProp_ is not specified it will be used as a header when stringifying csv
- _type_:
  - 'string'
    - stringify
      - value is string -> value
      - value is boolean or truthy -> value cast to string
      - else -> ''
    - parse
      - value -> value
  - 'integer'
    - stringify
      - value is number and not NaN -> value.toFixed(0)
      - else -> ''
    - parse
      - value -> parseInt(value, 10)
  - 'float'
    - stringify
      - value is number and not NaN -> value cast to string
      - else -> ''
    - parse
      - value -> value \* 1
  - 'boolean'
    - stringify
      - value is not undefined and not null and falsy -> 'FALSE'
      - value is truthy -> 'TRUE'
      - else -> ''
    - parse
      - value is '0', 'N', 'n', 'false', 'FALSE', 'False', 'no', 'NO', or 'No' -> false
      - else -> true
  - 'date', 'datetime', 'datetimes', 'timestamp'
    - parses using _dateFactory_ supplied in [_csvParams_](#csvparams); see for defaults below
    - parse
      - value can be parsed by casting to built-in Date -> number
    - stringify
      - value is NaN or not of type number -> ''
      - date: 'YYYY-MM-DD'
      - datetime: 'YYYY-MM-DD HH:mm'
      - datetimes: 'YYYY-MM-DD HH:mm:SS'
      - timestamp: 'YYYY-MM-DD HH:mm:SS.sss'
  - 'custom'
    - parse
      - uses _parse_ function; defaults to 'string'
    - stringify
      - uses _stringify_ function; defaults to 'string'
  - 'row'
    - parse
      - column is ignored
    - stringify
      - uses _stringifyRow_ function;
- _stringify_
  - function that takes value of _prop_ from the record and returns a string
  - only used when _type_ is 'custom'
- _parse_
  - function that takes csv string and returns the value of _prop_ to go on the record
  - only used when _type_ is 'custom'
- _stringifyRow_
  - function that takes the whole record and returns a string that will be put in _csvProp_ column
  - only used when _type_ is 'row'
- _csvProp_
- represents header in the csv
- when not specified defaults to _prop_
- when _type_ is row is required

#### CsvParams

```ts
interface CsvParams {
  delimiter?: string;
  quote?: string;
  escapeQuote?: string;
  rowSeparator?: string;
  ignoreUnderscoredProps?: boolean;
  dateOptions?: {
    locale?: string;
    timezoneOffset?: number | 'local';
    dst?: 'none' | 'eu' | 'us';
  };
  dateFormats?: {
    date?: string;
    dateTime?: string;
    dateTimeSeconds?: string;
    timestamp?: string;
  };
  dateFactory?: DateFactory;
  skipHeader?: boolean;
  useNullForEmpty?: boolean;
  titleCaseHeaders?: boolean;
}
```

Note: when specifying non-default _dateOptions_ or _dateFormats_ \_dateFactory needs to point to a constructor from an external library (see [p00dle/datex](https://github.com/p00dle/datex)), otherwise it will throw an error

- _delimiter_ - string that separates values in a row; default: ','
- _quote_ - string that wraps the value when value contains _delimiter_, _quote_, or _rowSeparator_; default: '"'
- _escapeQuote_ - string that is used for escaping quote; default: '""'
- _rowSeparator_ - string that separates rows; default: '\n'
- _ignoreUnderscoredProps_ - when columns are not specified during the stringifying process all props starting with an underscore will be ignored; has no effect on parsing; default: false
- _dateOptions_
  - _locale_ - determines things like month names, ordinals etc.
  - _timezoneOffset_ - timezone offset in hours or 'local' to use machine's local timezone offset
  - _dst_ - the daylight savings system used to determine when daylight savings are applied
- _dateFormats_
  - specify date format for specific column types
- \_dateFactory - specify when using an external library
- _skipHeader_ - when true headers will not be emitted when stringifying; no effect on parsing; default: false
- _useNullForEmpty_ - when true empty values will be parsed as null, otherwise as undefined; default: true
- _titleCaseHeaders_ - when columns are not specified the headers will be parsed from camel case to title case; only applies to stringifying; default: false
