/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { globSync } from 'glob';
import _ = require('lodash');

type Step = () => Promise<void>;

export const applyMigrations = functions.pubsub
  .topic('database-migration')
  .onPublish(async () => {
    const migrations = globSync('./migrations/**/*.js', {
      cwd: __dirname,
    });

    const migrationsRef = admin.database().ref('/schema/migrations/');

    const completedMigrations = _((await migrationsRef.once('value')).val())
      .pickBy()
      .keys()
      .value();

    for (const file of migrations) {
      const migrationName = file.split('/').pop().split('.').shift();

      if (completedMigrations.includes(migrationName)) {
        console.info(
          `Skipping ${migrationName} as it is already applied to the database.`
        );
        continue;
      }

      const migration = (await import(file)) as Record<string, Step>;
      console.info(`Applying ${migrationName}.`);

      for (const stepName in migration) {
        if (!_.has(migration, stepName)) continue;

        const step = migration[stepName];
        if (!(step instanceof Function)) continue;
        console.info(`Running ${stepName} step.`);
        await step();
      }
      await migrationsRef.update({ [migrationName]: true });
    }
  });
