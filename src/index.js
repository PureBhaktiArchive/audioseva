import './polyfills';
import { doGet } from './server/webapp';
import { DevoteeRepository } from './sound-editing/DevoteeRepository';

global.doGet = doGet;

global.watchUploads = () => {
  DevoteeRepository.all.forEach(devotee => {
    devotee.processUploads();
  });
};

global.setupWorkspaces = () => {
  DevoteeRepository.all.forEach(devotee => {
    devotee.setupWorkspace();
  });
};
