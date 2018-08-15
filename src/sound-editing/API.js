/*
 * sri sri guru gauranga jayatah
 */

import { DevoteeRepository } from './DevoteeRepository';
import { SoundEditingWorkflow } from './SoundEditingWorkflow';

export class SoundEditingAPI {
  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/devotees&role=TE
  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/devotees&role=FC
  static getDevotees(parameter) {
    return DevoteeRepository.all
      .filter(devotee => devotee.role === parameter.role)
      .map(devotee => ({
        emailAddress: devotee.emailAddress,
        name: devotee.name,
        status: devotee.status,
        uploadsFolderId: devotee.uploadsFolderId
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/lists
  static getLists() {
    return SoundEditingWorkflow.getTable('Tasks')
      .items.map(item => item.getFieldValue('Task ID').split('-')[0])
      .filter((value, index, self) => value !== '' && self.indexOf(value) === index) // Filled and Unique
      .sort();
  }

  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/tasks&language=English&list=ML2
  static getTasks(parameter) {
    if (!parameter.list) return [];

    const allottedIds = SoundEditingWorkflow.getTable('Allotments').items.map(item =>
      item.getFieldValue('Task ID')
    );

    return SoundEditingWorkflow.getTable('Tasks')
      .items.filter(
        item =>
          item.getFieldValue('Task ID').startsWith(parameter.list) &&
          (!parameter.language || item.getFieldValue('Language') === parameter.language) &&
          allottedIds.indexOf(item.getFieldValue('Task ID')) === -1
      )
      .map(item => ({
        id: item.getFieldValue('Task ID'),
        definition: item.getFieldValue('Task Definition'),
        action: item.getFieldValue('Action'),
        sourceFiles: [1, 2, 3].map(i => item.getFieldValue(`Source File ${i} Link`)).filter(s => s),
        language: item.getFieldValue('Language')
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, parameter.count || 20);
  }
}
