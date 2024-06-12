import { resolve } from 'node:path';

export abstract class Module {
  protected static readonly COLOR_RESET: string = '\u001B[0m';
  protected static readonly COLOR_RED: string = '\u001B[31m';
  protected static readonly COLOR_GREEN: string = '\u001B[32m';
  protected static readonly COLOR_YELLOW: string = '\u001B[33m';
  protected static readonly COLOR_BLUE: string = '\u001B[34m';
  protected static readonly COLOR_MAGENTA: string = '\u001B[35m';
  protected static readonly COLOR_CYAN: string = '\u001B[36m';
  protected static readonly COLOR_GRAY: string = '\u001B[90m';

  protected readonly cwd: string;

  public constructor(options: IModuleOptions) {
    this.cwd = resolve(options.cwd);
  }

  protected log(phase: string, status: string): void {
    process.stdout.write(`${Module.withColor(`[${phase}]`, Module.COLOR_CYAN)} ${status}\n`);
  }

  /**
   * Return a string in a given color
   * @param str The string that should be printed in
   * @param color A given color
   */
  public static withColor(str: any, color: string): string {
    return `${color}${str}${Module.COLOR_RESET}`;
  }
}

export interface IModuleOptions {
  cwd: string;
}
