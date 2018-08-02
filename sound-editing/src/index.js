import { Devotee } from './Devotee';

global.test = () => {
  console.log(Devotee.all);
};

global.watchUploads = () => {
  Devotee.all.forEach(devotee => {
    devotee.processUploads();
  });
};
