declare module 'lunar-javascript' {
  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInChinese(): string;
    getSolar(): Solar;
    getJieQiTable(): Record<string, Solar>;
    toString(): string;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromDate(date: Date): Solar;
    getLunar(): Lunar;
    toYmd(): string;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
  }
}
