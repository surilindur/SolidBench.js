import { createWriteStream, type WriteStream } from 'node:fs';
import { resolve } from 'node:path';

export interface IEndpoint {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export class Endpoint implements IEndpoint {
  protected readonly abortController: AbortController;
  protected readonly logStream: WriteStream;
  protected readonly dataSource: string;
  protected readonly iri: string;

  public constructor(options: IEndpointOptions) {
    this.abortController = new AbortController();
    this.logStream = createWriteStream(options.logFile);
    this.dataSource = resolve(options.dataSource);
    this.iri = options.iri;
  }

  public async start(): Promise<void> {
    this.logStream.write(`Starting endpoint at <${this.iri}> from <${this.dataSource}>\n`);
  }

  public async stop(): Promise<void> {
    const message = `Stopping endpoint at <${this.iri}>`;
    this.abortController.abort(message);
    this.logStream.write(`${message}\n`);
  }
}

export interface IEndpointOptions {
  logFile: string;
  dataSource: string;
  iri: string;
}
