import { Devotee } from '../Devotee';
import { CRBackend } from '../CRBackend';
import { SQRBackend } from '../SQRBackend';

class WebApp {
  static get sources() {
    return {
      // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=cr/lists
      'cr/lists': p => WebApp.getCachedContent(p, CRBackend.getLists),

      // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=cr/files&list=JAG&language=English&count=50
      'cr/files': p => CRBackend.getFiles(p.list, p.language, p.count),

      // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=sqr/lists
      'sqr/lists': p => WebApp.getCachedContent(p, SQRBackend.getLists),

      // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=sqr/files&list=JAG&language=English&count=50
      'sqr/files': p => SQRBackend.getFiles(p.list, p.language, p.count),

      // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=devotees&role=CR
      devotees: p =>
        Devotee.getByRole(p.role).map(devotee => ({
          emailAddress: devotee.emailAddress,
          name: devotee.name,
          languages: devotee.languages
        }))
    };
  }

  static getCachedContent(parameter, source, expiration) {
    const cache = CacheService.getScriptCache();
    let content = cache.get(parameter.path);
    if (content != null) return content;

    content = JSON.stringify(source());
    cache.put(parameter.path, content, expiration || 3600);
    return content;
  }

  static getOutput(e) {
    let content = WebApp.sources[e.parameter.path](e.parameter);

    if (typeof content !== 'string' && !(content instanceof String))
      content = JSON.stringify(content);

    return ContentService.createTextOutput(
      e.parameter.callback ? `${e.parameter.callback}(${content})` : content
    ).setMimeType(
      e.parameter.callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON
    );
  }
}

export const doGet = e => WebApp.getOutput(e);
