import type { DateClass, DateParams } from './types';
export declare class SimpleDate implements DateClass {
    private formatType;
    constructor(params?: DateParams);
    parse(str: string): number;
    stringify(n: number): string;
}
//# sourceMappingURL=simple-date.d.ts.map