import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import { Endpoint } from './Endpoint';
import type { IEndpointOptions } from './Endpoint';

export class EndpointCli extends Endpoint {
  protected readonly command: string;
  protected readonly args: string[];

  protected childProcess: ChildProcessByStdio<null, null, null> | undefined;

  public constructor(options: IEndpointCliOptions) {
    super(options);
    this.command = options.command;
    this.args = options.args;
  }

  public async start(): Promise<void> {
    await super.start();
    this.childProcess = spawn(this.command, this.args, {
      signal: this.abortController.signal,
      detached: true,
      stdio: [ 'ignore', this.logStream, this.logStream ],
    });
    this.childProcess.on('close', (code) => {
      this.childProcess = undefined;
      this.logStream.write(`Child process exited with code ${code}\n`);
    });
  }
}

export interface IEndpointCliOptions extends IEndpointOptions {
  /**
   * The command to execute.
   */
  command: string;
  /**
   * The arguments to pass.
   */
  args: string[];
}
