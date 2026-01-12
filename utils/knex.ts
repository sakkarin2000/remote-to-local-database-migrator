import knex, { Knex } from 'knex';

let sourceKnex: Knex | null = null;
let destinationKnex: Knex | null = null;

export const getSourceKnex = (config: Knex.Config): Knex => {
  if (!sourceKnex) {
    sourceKnex = knex(config);
  }
  return sourceKnex;
};

export const getDestinationKnex = (config: Knex.Config): Knex => {
  if (!destinationKnex) {
    destinationKnex = knex(config);
  }
  return destinationKnex;
};

export const destroyKnexInstances = async (): Promise<void> => {
  if (sourceKnex) {
    await sourceKnex.destroy();
    sourceKnex = null;
  }
  if (destinationKnex) {
    await destinationKnex.destroy();
    destinationKnex = null;
  }
};