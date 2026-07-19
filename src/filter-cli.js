import { runFilter } from './filter/run.js';

runFilter().catch((err) => {
  console.error(err);
  process.exit(1);
});
