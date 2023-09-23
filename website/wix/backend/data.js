// sri sri guru gaurangau jayatah

import { fetch } from 'wix-fetch';

export function Registrations_afterInsert(item, context) {
  return fetch('https://hook.integromat.com/ab2n1jxjdn6gdre96j48cvib12emccqm', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: item.emailAddress,
      your_name: item.name,
      contact_number: item.phoneNumber,
      country: item.country,
      languages: item.languages.split(','),
      experience: item.experience,
      i_am_available_on_whatsapp: item.whatsApp,
      seva: item.seva.split(','),
      where_did_u_hear_about_this_seva: item.influencer,
      recommended_by: item.recommendedBy,
      completed: Math.floor(item._createdDate.getTime() / 1000),
    }),
  }).then((httpResponse) => {
    if (httpResponse.ok) {
      return item;
    }
    return Promise.reject(httpResponse);
  });
}
