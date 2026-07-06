import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register ts-node/esm loader
register('ts-node/esm', pathToFileURL('./'));
