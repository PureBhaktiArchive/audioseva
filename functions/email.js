/*!
 * sri sri guru gauranga jayatah
 */

const Email = require('email-templates');
const { DateTime } = require('luxon');
const path = require('path');

console.log(path.resolve('emails'));
const email = new Email();

const globals = {
  DateTime,
  settings: {
    project: {
      domain: 'test',
    },
  },
};

const person = { name: 'AKD', emailAddress: 'akd@purebhakti.tv' };

const sqrAllotment = {
  template: 'sqr/allotment',
  message: { to: 'test@audioseva.com' },
  locals: {
    ...globals,
    repeated: true,
    date: '28.12',
    assignee: { name: 'AKD' },
    files: [
      {
        name: 'UMA-001A',
        links: { listen: 'http://listen', submission: 'http://submission' },
      },
      {
        name: 'UMA-001B',
        links: { listen: 'http://listen', submission: 'http://submission' },
      },
    ],
    comment: 'COMMENT',
    links: { selfTracking: 'http://self' },
  },
};

const donation = {
  template: 'donations/acknowledgement',
  message: { to: 'test@audioseva.com' },
  locals: { donation: { sum: { currency: 'INR', amount: 1000 } } },
};

const currentSet = [
  {
    fileName: 'UMA-001A',
    dateGiven: '11.12',
    status: 'Given',
    daysPassed: 14,
  },
  {
    fileName: 'UMA-001B',
    dateGiven: '11.12',
    status: 'Given',
    daysPassed: 14,
  },
];

const warnings = ['first warning', 'another!'];

const submission = {
  template: 'sqr/submission',
  message: { to: 'test@audioseva.com' },
  locals: {
    warnings,
    currentSet,
    allotmentLink: 'http://allot',
    updateLink: 'http://update',
    submission: {
      fileName: 'UMA-001B',
      unwantedParts: [
        {
          beginning: '01:13',
          ending: '05:18',
          type: 'glitch',
          description: 'Something',
        },
        {
          beginning: '01:13',
          ending: '05:18',
          type: 'blank',
        },
      ],
      // soundIssues: [
      //   {
      //     beginning: '01:13',
      //     ending: '05:18',
      //     type: 'noise',
      //     description: 'Loud',
      //   },
      //   {
      //     entireFile: true,
      //     type: 'hum',
      //   },
      // ],
      soundQualityRating: 'Good',
      duration: {
        beginning: '01:13',
        ending: '05:18',
      },
      comments: 'Haribol!',
      author: person,
      changed: 123,
      completed: 123,
    },
  },
};

const cancellation = {
  template: 'sqr/cancellation',
  locals: {
    fileName: 'UMA-001A',
    comments: 'Haribol',
    reason: 'Not my language',
    assignee: { name: 'AKD', emailAddress: 'akd@purebhakti.tv' },
    allotmentLink: 'http://allot',
    currentSet,
    warnings: ['first warning', 'another!'],
  },
};

const teAllotment = {
  template: 'track-editing/allotment',
  locals: {
    ...globals,
    tasks: [{ id: 'TEST-001-1' }, { id: 'TEST-001-2' }],
    assignee: person,
    comment: 'Haribol',
  },
};

const teFeedback = {
  template: 'track-editing/feedback',
  locals: {
    ...globals,
    task: { id: 'TEST-001-1' },
    resolution: { feedback: 'Please redo.' },
  },
};

const teUpload = {
  template: 'track-editing/upload',
  locals: {
    ...globals,
    task: {
      id: 'TEST-001-1',
      assignee: person,
      versions: [{ id: '1' }, { id: '2' }],
    },
    warnings,
  },
};

email
  .send(teUpload)
  .then(console.log)
  .catch(console.error);
