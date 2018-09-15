import { SoundEditingAPI } from '../sound-editing/API';
import { Devotee } from '../Devotee';

// function getCachedOutput(source, key, expiration) {
//   const cache = CacheService.getScriptCache();
//   const cached = cache.get(key);
//   if (cached != null) return cached;

//   const output = JSON.stringify(source());
//   cache.put(key, output, expiration || 3600);
//   return output;
// }

function findSource(path) {
  switch (path) {
    case 'te/lists':
      return SoundEditingAPI.getLists;

    case 'te/tasks':
      return SoundEditingAPI.getTasks;

    case 'te/devotees':
      return SoundEditingAPI.getDevotees;

    // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=devotees&role=Listening%20service
    case 'devotees':
      return parameter =>
        Devotee.getByRole(parameter.role).map(devotee => ({
          emailAddress: devotee.emailAddress,
          name: devotee.name,
          languages: devotee.languages
        }));

    default:
      return null;
  }
}

export const doGet = e => {
  const output = JSON.stringify(findSource(e.parameter.path)(e.parameter));

  return ContentService.createTextOutput(
    e.parameter.callback ? `${e.parameter.callback}(${output})` : output
  ).setMimeType(
    e.parameter.callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON
  );
};
