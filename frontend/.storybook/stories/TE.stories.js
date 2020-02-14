import { storyFactory } from "../util/helpers";
import { boolean, object, text } from "@storybook/addon-knobs";
import { action } from "@storybook/addon-actions";
import TaskOutput from "../../src/components/TE/Output";
import TaskDefinition from "../../src/components/TE/TaskDefinition";
import Resolution from "../../src/components/TE/Resolution";
import UploadFiles from "../../src/components/TE/UploadFilesList";
import "../../src/styles/subtext.css";

export default { title: "Track Editing" };

const story = storyFactory({
  TaskDefinition,
  TaskOutput,
  Resolution,
  UploadFiles
});

const chunks = [
  {
    fileName: "file-1",
    unwantedParts:
      "\n7-81: irrelevant - unwanted description" +
      "\n4-56: blank space - \n61-107: irrelevant - unwanted description",
    beginning: 56,
    ending: 72
  }
];

export const taskDefinition = () =>
  story({
    props: {
      item: {
        default: {
          chunks: object("chunks", chunks)
        }
      }
    },
    template: `<task-definition :item="item"></task-definition>`
  });

const versions = [
  {
    timestamp: 1573234120570,
    uploadPath: "upload-path",
    resolution: {
      timestamp: 1573234161738
    }
  },
  {
    timestamp: 1573234120570,
    uploadPath: "upload-path",
    resolution: {
      isApproved: true,
      feedback: "feedback here",
      timestamp: 1573234161738
    }
  }
];

export const resolution = () =>
  story({
    props: {
      showReviewButton: boolean("showReviewButton", true),
      item: {
        default: {
          ".key": "item-1",
          status: text("status", "WIP"),
          versions: object("versions", versions)
        }
      }
    },
    template: `<resolution :item="item" :showReviewButton="showReviewButton"></resolution>`
  });

const uploadingFiles = [
  [
    { name: "list2-007-1.flac", upload: { uuid: 1 } },
    { error: "You have uploaded this file already" }
  ],
  [
    { name: "list2-008-1.flac", upload: { uuid: 2 } },
    { uploading: true, progress: 30 }
  ],
  [
    { name: "list2-009-1.flac", upload: { uuid: 3 } },
    { uploading: true, retrying: true }
  ]
];

const queuedFiles = [
  { name: "list2-001-1.flac", upload: { uuid: 4 } },
  { name: "list2-002-1.flac", upload: { uuid: 5 } }
];

const completedFiles = [
  { name: "list2-003-1.flac", upload: { uuid: 6 } },
  { name: "list2-004-1.flac", upload: { uuid: 7 } }
];

export const fileUploads = () =>
  story({
    props: {
      completedFiles: { default: completedFiles },
      queuedFiles: { default: queuedFiles },
      uploadingFiles: { default: uploadingFiles }
    },
    methods: {
      deleteFile: action("removeFile"),
      cancelFile: action("cancelFile"),
      cancelQueuedFile: action("cancelQueuedFile")
    },
    template: `
<upload-files
  @delete-file="deleteFile"
  @cancel-file="cancelFile"
  @cancel-queued-file="cancelQueuedFile"
  :completedFiles="completedFiles" 
  :queuedFiles="queuedFiles" 
  :uploadingFiles="uploadingFiles"
>
</upload-files>
`
  });
