import './polyfills';
import { doGet } from './server/webapp';
import { DevoteeRepository } from './DevoteeRepository';

global.doGet = doGet;

global.watchUploads = () => {
  DevoteeRepository.all.forEach(devotee => {
    devotee.processUploads();
  });
};
