import type { Argv } from 'yargs';
import { Server } from '../Server';
import { Templates } from '../Templates';

export const command = 'serve';
export const desc = 'Serves the fragmented dataset via an HTTP server';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .options({
      config: {
        type: 'string',
        alias: 'c',
        describe: 'Path to Docker compose config',
        default: Templates.COMPOSE_CONFIG,
        defaultDescription: 'endpoints.yaml',
      },
      name: {
        type: 'string',
        alias: 'n',
        describe: 'Name of the Docker compose setup',
        default: 'solidbench',
        defaultDescription: 'solidbench',
      },
    });
export const handler = async(argv: Record<string, any>): Promise<void> => new Server({
  cwd: argv.cwd,
  name: argv.name,
  config: argv.config,
}).serve();
