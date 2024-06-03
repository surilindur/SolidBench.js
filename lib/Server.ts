import { resolve } from 'node:path';
import Dockerode from 'dockerode';
import DockerodeCompose from 'dockerode-compose';

/**
 * Serves generated fragments over HTTP.
 */
export class Server {
  private readonly config: string;

  public constructor(options: IServerOptions) {
    this.config = resolve(options.config);
  }

  public async serve(): Promise<void> {
    var docker = new Dockerode();
    var compose = new DockerodeCompose(docker, this.config, 'wordpress');
    await compose.pull();
    var state = await compose.up();
    console.log(state);
  }
}

export interface IServerOptions {
  config: string;
}
