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
    timestampGiven: 1556476200000,
    status: 'Given',
  },
  {
    fileName: 'UMA-001B',
    timestampGiven: 1557496200000,
    status: 'Given',
  },
];

const warnings = ['first warning', 'another!'];

const sqrSubmission = {
  template: 'sqr/submission',
  message: { to: 'test@audioseva.com' },
  locals: {
    ...globals,
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
    task: {
      id: 'TEST-001-1',
      assignee: { name: 'Assignee' },
      versions: {
        '-M32eFVWKzJQJqyx0jOj': {
          resolution: {
            author: {},
            feedback:
              '1s gap between files missing at 45:58 on the edited file. Rest is fine.',
            isApproved: false,
            timestamp: 1588483134292,
          },
          timestamp: 1584904338974,
          uploadPath:
            'TwCkuLuxejdQ7qOcOwgluZzrXlv1/1584902849151/UMA-170-1.flac',
        },
        v2: { uploadPath: '/path', resolution: { feedback: 'Again redo' } },
      },
    },
    resolution: { feedback: 'Again redo.' },
  },
};

const teUpload = {
  template: 'track-editing/upload',
  locals: {
    ...globals,

    task: {
      id: 'TEST-001-1',
      assignee: person,
      versions: {
        '-M32eFVWKzJQJqyx0jOj': {
          resolution: {
            author: {},
            feedback:
              '1s gap between files missing at 45:58 on the edited file. Rest is fine.',
            isApproved: false,
            timestamp: 1588483134292,
          },
          timestamp: 1584904338974,
          uploadPath:
            'TwCkuLuxejdQ7qOcOwgluZzrXlv1/1584902849151/UMA-170-1.flac',
        },
        '-MEnVDFzCgJNltWq95jJ': {
          timestamp: 1597518173253,
          uploadPath:
            'TwCkuLuxejdQ7qOcOwgluZzrXlv1/1597517749657/UMA-170-1.flac',
        },
      },
    },
    warnings,
  },
};

email.send(teFeedback).then(console.log).catch(console.error);
email.send(teUpload).then(console.log).catch(console.error);
