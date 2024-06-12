import { resolve } from 'node:path';
import Dockerode from 'dockerode';
import DockerodeCompose from 'dockerode-compose';
import { Module, type IModuleOptions } from './Module';

/**
 * Serves generated fragments over HTTP.
 */
export class Server extends Module {
  private readonly name: string;
  private readonly config: string;
  private readonly docker: Dockerode;
  private readonly compose: DockerodeCompose;

  public constructor(options: IServerOptions) {
    super(options);
    this.name = options.name;
    this.config = resolve(this.cwd, options.config);
    this.docker = new Dockerode();
    this.compose = new DockerodeCompose(this.docker, this.config, this.name);
  }

  public async serve(): Promise<void> {
    await this.start();
    await new Promise((resolve) => {
      process.on('SIGKILL', resolve);
      process.on('SIGINT', resolve);
    });
    await this.stop();
  }

  protected log(status: string): void {
    super.log('Serve', status);
  }

  public async start(): Promise<void> {
    this.log(`Starting endpoints based on ${this.config}`);
    this.log('Pulling images used in the compose config');
    await this.compose.pull();
    this.log('Starting containers based on the configuration file...');
    await this.compose.up();
    this.log('Started containers successfully');
  }

  public async stop(): Promise<void> {
    this.log('Stopping containers...');
    await this.compose.down({ volumes: true });
    this.log('Containers stopped');
  }
}

export interface IServerOptions extends IModuleOptions {
  config: string;
  name: string;
}
