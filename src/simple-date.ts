import type { DateClass, DateParams } from './types';

type FormatType = 'date' | 'datetime' | 'datetimes' | 'timestamp';

const formatTypeMap = {
  'YYYY-MM-DD': 'date',
  'YYYY-MM-DD HH:mm': 'datetime',
  'YYYY-MM-DD HH:mm:SS': 'datetimes',
  'YYYY-MM-DD HH:mm:SS.sss': 'timestamp',
} as const;

export class SimpleDate implements DateClass {
  private formatType: FormatType;
  constructor(params?: DateParams) {
    const format = (params && params.format) || 'YYYY-MM-DD HH:mm';
    if (!formatTypeMap[format as keyof typeof formatTypeMap])
      throw Error(`Format not supported; datex peer dependency required`);
    this.formatType = formatTypeMap[format as keyof typeof formatTypeMap];
    if (params && params.dst && params.dst !== 'none')
      throw Error('DST conversion not supported; datex peer dependency required');
    if (params && params.timezoneOffset) throw Error('Timezone offset not supported; datex peer dependency required');
  }

  parse(str: string) {
    if (typeof str !== 'string' || str === '') return NaN;
    return +new Date(str);
  }

  stringify(n: number) {
    const date = new Date(n);
    if (this.formatType === 'datetime') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
        2,
        '0'
      )} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (this.formatType === 'date') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
        2,
        '0'
      )}`;
    } else if (this.formatType === 'datetimes') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
        2,
        '0'
      )} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
        date.getSeconds()
      ).padStart(2, '0')}`;
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
        2,
        '0'
      )} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
        date.getSeconds()
      ).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
    }
  }
}
