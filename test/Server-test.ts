import Dockerode from 'dockerode';
import DockerodeCompose from 'dockerode-compose';
import { Server } from '../lib/Server';

const mockPull = jest.fn();
const mockUp = jest.fn();
const mockDown = jest.fn();

jest.mock('dockerode');
jest.mock<typeof import('dockerode-compose')>('dockerode-compose', () => jest.fn().mockImplementation(() => ({
  pull: mockPull,
  up: mockUp,
  down: mockDown,
})));

describe('Server', () => {
  const cwd = 'CWD';
  const name = 'SOLIDBENCH';
  const config = 'CONFIG';

  let server: Server;

  beforeEach(() => {
    mockPull.mockReset();
    mockDown.mockReset();
    mockUp.mockReset();
    server = new Server({ cwd, name, config });
  });

  it('calls Dockerode and DockerodeCompose when created', async() => {
    expect(Dockerode).toHaveBeenCalledTimes(1);
    expect(DockerodeCompose).toHaveBeenCalledTimes(1);
  });

  it('calls dockerode-compose pull and up', async() => {
    await server.start();
    expect(mockPull).toHaveBeenCalledTimes(1);
    expect(mockUp).toHaveBeenCalledTimes(1);
  });

  it('calls dockerode-compose down', async() => {
    await server.stop();
    expect(mockDown).toHaveBeenCalledTimes(1);
  });
});
