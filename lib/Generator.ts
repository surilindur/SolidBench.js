import { stat, unlink, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { request } from 'node:https';
import { join } from 'node:path';
import Dockerode from 'dockerode';
import { runConfig as runEnhancer } from 'ldbc-snb-enhancer';
import { runConfig as runValidationGenerator } from 'ldbc-snb-validation-generator';
import { runConfig as runFragmenter } from 'rdf-dataset-fragmenter';
import { runConfig as runQueryInstantiator } from 'sparql-query-parameter-instantiator';
import { Extract } from 'unzipper';
import { Module, type IModuleOptions } from './Module';

/**
 * Generates decentralized social network data in different phases.
 */
export class Generator extends Module {
  public static readonly LDBC_SNB_DATAGEN_DOCKER_IMAGE: string = 'rubensworks/ldbc_snb_datagen:latest';

  protected readonly verbose: boolean;
  protected readonly overwrite: boolean;
  protected readonly scale: string;
  protected readonly enhancementConfig: string;
  protected readonly fragmentConfig: string;
  protected readonly queryConfig: string;
  protected readonly validationParams: string;
  protected readonly validationConfig: string;
  protected readonly hadoopMemory: string;
  protected readonly mainModulePath: string;

  public constructor(options: IGeneratorOptions) {
    super(options);
    this.verbose = options.verbose;
    this.overwrite = options.overwrite;
    this.scale = options.scale;
    this.enhancementConfig = options.enhancementConfig;
    this.fragmentConfig = options.fragmentConfig;
    this.queryConfig = options.queryConfig;
    this.validationParams = options.validationParams;
    this.validationConfig = options.validationConfig;
    this.hadoopMemory = options.hadoopMemory;
    this.mainModulePath = join(__dirname, '..');
  }

  protected async targetExists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  protected async runPhase(name: string, directory: string, runner: () => Promise<void>): Promise<void> {
    if (this.overwrite || !await this.targetExists(join(this.cwd, directory))) {
      this.log(name, 'Started');
      const timeStart = process.hrtime();
      await runner();
      const timeEnd = process.hrtime(timeStart);
      this.log(name, `Done in ${timeEnd[0] + (timeEnd[1] / 1_000_000_000)} seconds`);
    } else {
      this.log(name, `Skipped (/${directory} already exists, remove to regenerate)`);
    }
  }

  /**
   * Run all generator phases.
   */
  public async generate(): Promise<void> {
    const timeStart = process.hrtime();
    await this.runPhase('SNB dataset generator', 'out-snb', () => this.generateSnbDataset());
    await this.runPhase('SNB dataset enhancer', 'out-enhanced', () => this.enhanceSnbDataset());
    await this.runPhase('SNB dataset fragmenter', 'out-fragments', () => this.fragmentSnbDataset());
    await this.runPhase('SPARQL query instantiator', 'out-queries', () => this.instantiateQueries());
    await this.runPhase('SNB validation downloader', 'out-validate-params', () => this.downloadValidationParams());
    await this.runPhase('SNB validation generator', 'out-validate', () => this.generateValidation());
    const timeEnd = process.hrtime(timeStart);
    this.log('All', `Done in ${timeEnd[0] + (timeEnd[1] / 1_000_000_000)} seconds`);
  }

  /**
   * Invoke the LDBC SNB generator.
   */
  public async generateSnbDataset(): Promise<void> {
    // Create params.ini file
    const paramsTemplate = await readFile(join(__dirname, '../templates/params.ini'), 'utf8');
    const paramsPath = join(this.cwd, 'params.ini');
    await writeFile(paramsPath, paramsTemplate.replaceAll('SCALE', this.scale), 'utf8');

    // Pull the base Docker image
    const dockerode = new Dockerode();
    const buildStream = await dockerode.pull(Generator.LDBC_SNB_DATAGEN_DOCKER_IMAGE);
    await new Promise((resolve, reject) => {
      dockerode.modem.followProgress(buildStream, (err: Error | null, res: any[]) => err ? reject(err) : resolve(res));
    });

    // Start Docker container
    const container = await dockerode.createContainer({
      Image: Generator.LDBC_SNB_DATAGEN_DOCKER_IMAGE,
      Tty: true,
      AttachStdout: true,
      AttachStderr: true,
      Env: [ `HADOOP_CLIENT_OPTS=-Xmx${this.hadoopMemory}` ],
      HostConfig: {
        Binds: [
          `${this.cwd}/out-snb/:/opt/ldbc_snb_datagen/out`,
          `${paramsPath}:/opt/ldbc_snb_datagen/params.ini`,
        ],
      },
    });
    await container.start();

    // Stop process on force-exit
    let containerEnded = false;
    // eslint-disable-next-line ts/no-misused-promises
    process.on('SIGINT', async() => {
      if (!containerEnded) {
        await container.kill();
        await cleanup();
      }
    });
    async function cleanup(): Promise<void> {
      await container.remove();
      await unlink(paramsPath);
    }

    // Attach output to stdout
    const out = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
    if (this.verbose) {
      out.pipe(process.stdout);
    } else {
      out.resume();
    }

    // Wait until generation ends
    await new Promise((resolve, reject) => {
      out.on('end', resolve);
      out.on('error', reject);
    });
    containerEnded = true;

    // Cleanup
    await cleanup();
  }

  /**
   * Enhance the generated LDBC SNB dataset.
   */
  public async enhanceSnbDataset(): Promise<void> {
    // Create target directory
    await mkdir(join(this.cwd, 'out-enhanced'));

    // Run enhancer
    const oldCwd = process.cwd();
    process.chdir(this.cwd);
    await runEnhancer(this.enhancementConfig, { mainModulePath: this.mainModulePath });
    process.chdir(oldCwd);
  }

  /**
   * Fragment the generated and enhanced LDBC SNB datasets.
   */
  public async fragmentSnbDataset(): Promise<void> {
    const oldCwd = process.cwd();
    process.chdir(this.cwd);

    // Initial fragmentation
    await runFragmenter(this.fragmentConfig, { mainModulePath: this.mainModulePath });

    process.chdir(oldCwd);
  }

  /**
   * Instantiate queries based on the LDBC SNB datasets.
   */
  public async instantiateQueries(): Promise<void> {
    // Create target directory
    await mkdir(join(this.cwd, 'out-queries'));

    // Run instantiator
    const oldCwd = process.cwd();
    process.chdir(this.cwd);
    await runQueryInstantiator(this.queryConfig, { mainModulePath: this.mainModulePath }, {
      variables: await this.generateVariables(),
    });
    process.chdir(oldCwd);
  }

  /**
   * Download validation parameters
   */
  public async downloadValidationParams(): Promise<void> {
    // Create target directory
    const target = join(this.cwd, 'out-validate-params');
    await mkdir(target);

    // Download and extract zip file
    return new Promise((resolve, reject) => {
      request(this.validationParams, (res) => {
        res
          .on('error', reject)
          .pipe(Extract({ path: target }))
          .on('error', reject)
          .on('close', resolve);
      }).end();
    });
  }

  /**
   * Generate validation queries and results.
   */
  public async generateValidation(): Promise<void> {
    // Create target directory
    await mkdir(join(this.cwd, 'out-validate'));

    // Run generator
    const oldCwd = process.cwd();
    process.chdir(this.cwd);
    await runValidationGenerator(this.validationConfig, { mainModulePath: this.mainModulePath }, {
      variables: await this.generateVariables(),
    });
    process.chdir(oldCwd);
  }

  protected async generateVariables(): Promise<Record<string, string>> {
    return Object.fromEntries((await readdir(join(__dirname, '../templates/queries/')))
      .map(name => [ `urn:variables:query-templates:${name}`, join(__dirname, `../templates/queries/${name}`) ]));
  }
}

export interface IGeneratorOptions extends IModuleOptions {
  verbose: boolean;
  overwrite: boolean;
  scale: string;
  enhancementConfig: string;
  fragmentConfig: string;
  queryConfig: string;
  validationParams: string;
  validationConfig: string;
  hadoopMemory: string;
}
