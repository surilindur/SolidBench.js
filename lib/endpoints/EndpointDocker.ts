import type Docker from 'dockerode';
import Dockerode from 'dockerode';
import { Endpoint } from './Endpoint';
import type { IEndpointOptions } from './Endpoint';

export class EndpointDocker extends Endpoint {
  protected readonly docker: Docker;
  protected readonly containerName: string;
  protected readonly containerImage: string;
  protected readonly containerCmd: string[];
  protected readonly containerWorkdir?: string;
  protected readonly containerEntrypoint?: string[];
  protected readonly dataSourceMountPath: string;

  protected container: Docker.Container | undefined;

  public constructor(options: IEndpointDockerOptions) {
    super(options);
    this.containerName = options.containerName;
    this.containerImage = options.containerImage;
    this.containerCmd = options.containerCmd;
    this.containerEntrypoint = options.containerEntrypoint;
    this.dataSourceMountPath = options.dataSourceMountPath;
    this.docker = new Dockerode();
  }

  public async start(): Promise<void> {
    await super.start();
    this.container = await this.docker.createContainer({
      name: this.containerName,
      Image: this.containerImage,
      Cmd: this.containerCmd,
      Entrypoint: this.containerEntrypoint,
      WorkingDir: this.containerWorkdir,
      Volumes: { [this.dataSource]: this.dataSourceMountPath },
    });
    await this.container.start({ abortSignal: this.abortController.signal });
  }

  public async stop(): Promise<void> {
    await super.stop();
    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
  }
}

export interface IEndpointDockerOptions extends IEndpointOptions {
  /**
   * The container name to create.
   */
  containerName: string;
  /**
   * The image to pull and use for this endpoint.
   */
  containerImage: string;
  /**
   * The CMD used when starting the container.
   */
  containerCmd: string[];
  /**
   * The ENTRYPOINT used to override the default one.
   */
  containerEntrypoint?: string[];
  /**
   * The WORKDIR used to override the default one.
   */
  containerWorkdir?: string;
  /**
   * The path to mount the source at.
   */
  dataSourceMountPath: string;
}
