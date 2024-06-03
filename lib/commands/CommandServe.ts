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
    });
export const handler = async(argv: Record<string, any>): Promise<void> => new Server({ config: argv.config }).serve();
