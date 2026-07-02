import { GenericContainer, type StartedTestContainer } from "testcontainers";

export class MongoDBAtlasLocalContainer {
  private readonly image: string;

  constructor(image = "mongodb/mongodb-atlas-local:8.0.0") {
    this.image = image;
  }

  async start(): Promise<StartedMongoDBAtlasLocalContainer> {
    const container = await new GenericContainer(this.image)
      .withExposedPorts(27017)
      .start();
    return new StartedMongoDBAtlasLocalContainer(container);
  }
}

export class StartedMongoDBAtlasLocalContainer {
  private readonly container: StartedTestContainer;

  constructor(container: StartedTestContainer) {
    this.container = container;
  }

  getConnectionString(): string {
    return `mongodb://${this.container.getHost()}:${this.container.getMappedPort(
      27017,
    )}/?directConnection=true`;
  }

  async stop(): Promise<void> {
    await this.container.stop();
  }
}
