declare module 'lunar-javascript' {
  export class Lunar {
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInChinese(): string;
    toString(): string;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromDate(date: Date): Solar;
    getLunar(): Lunar;
  }
}
