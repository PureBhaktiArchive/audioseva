import { DevoteeRepository } from './DevoteeRepository';

global.watchUploads = () => {
  DevoteeRepository.all.forEach(devotee => {
    devotee.processUploads();
  });
};
