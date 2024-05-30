import type { IEndpoint } from '../../lib/endpoints/Endpoint';
import { EndpointDocker } from '../../lib/endpoints/EndpointDocker';

const writeStreamMock: any = { destroy: () => jest.fn(), on: () => writeStreamMock };

jest.spyOn(writeStreamMock, 'destroy');
jest.spyOn(writeStreamMock, 'on').mockReturnValue(writeStreamMock);

const createWriteStreamMock = jest.fn().mockReturnValue(writeStreamMock);

const dockerodeContainerStopMock = jest.fn();
const dockerodeContainerRemoveMock = jest.fn();
const dockerodeContainerMock = jest.fn().mockImplementation(() => ({
  stop: dockerodeContainerStopMock,
  remove: dockerodeContainerRemoveMock,
}));
const dockerodeRunMock = jest.fn();
const dockerodeCreateContainerMock = jest.fn().mockResolvedValue(dockerodeContainerMock);

jest.mock<typeof import('node:fs')>('node:fs', () => <any> ({
  createWriteStream: (...args: any[]) => createWriteStreamMock(...args),
}));

jest.mock<typeof import('dockerode')>('dockerode', () => <any> jest.fn().mockImplementation(() => ({
  run: dockerodeRunMock,
  createContainer: dockerodeCreateContainerMock,
})));

describe('Endpoint', () => {
  const logFilePath = '/tmp/endpoint.log';
  const containerCmd = [ 'a', 'b' ];
  const containerImage = 'test:latest';
  const containerName = 'test';

  let endpoint: IEndpoint;

  beforeEach(() => {
    jest.resetAllMocks();
    endpoint = new EndpointDocker({
      logFilePath,
      containerCmd,
      containerImage,
      containerName,
    });
  });

  it('creates and destroys the log stream', async() => {
    expect(createWriteStreamMock).toHaveBeenCalledTimes(1);
    expect(createWriteStreamMock).toHaveBeenNthCalledWith(1, logFilePath, { encoding: 'utf-8' });
    expect(writeStreamMock.on).toHaveBeenCalledTimes(2);
    await endpoint.start();
    await endpoint.stop();
    expect(writeStreamMock.destroy).toHaveBeenCalledTimes(1);
  });

  it('creates and removes the containers', async() => {
    await endpoint.start();
    expect(dockerodeCreateContainerMock).toHaveBeenCalledTimes(1);
    expect(dockerodeCreateContainerMock).toHaveBeenNthCalledWith(1, {
      name: containerName,
      Image: containerImage,
      Cmd: containerCmd,
    });
    expect(dockerodeRunMock).toHaveBeenCalledTimes(1);
    expect(dockerodeRunMock).toHaveBeenNthCalledWith(1, containerImage, containerCmd, writeStreamMock);
    await endpoint.stop();
    expect(dockerodeContainerStopMock).toHaveBeenCalledTimes(1);
    expect(dockerodeContainerRemoveMock).toHaveBeenCalledTimes(1);
  });
});
