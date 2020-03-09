import { storyFactory } from "../util/helpers";
import { action } from "@storybook/addon-actions";
import { boolean, object, text } from "@storybook/addon-knobs";
import _ from "lodash";
import TaskOutput from "../../src/components/TE/Output";
import TaskDefinition from "../../src/components/TE/TaskDefinition";
import Resolution from "../../src/components/TE/Resolution";
import UploadFileList from "../../src/components/TE/UploadFileList";
import "../../src/styles/subtext.css";

export default { title: "Track Editing" };

const story = storyFactory({
  TaskDefinition,
  TaskOutput,
  Resolution,
  UploadFileList
});

const chunks = [
  {
    fileName: "file-1",
    unwantedParts:
      "\n7-81: irrelevant - unwanted description" +
      "\n4-56: blank space - \n61-107: irrelevant - unwanted description",
    beginning: 56,
    ending: 72
  },
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
          isRestored: boolean("isRestored", false),
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
      author: {
        name: "author1"
      },
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

const getFileName = () => _.uniqueId("file-");

const files = [
  [
    { upload: { uuid: _.uniqueId() }, name: getFileName() },
    { state: "uploading", progress: 20 }
  ],
  [
    { upload: { uuid: _.uniqueId() }, name: getFileName() },
    { state: "uploading", progress: 30, retrying: true }
  ],
  [
    { upload: { uuid: _.uniqueId() }, name: getFileName() },
    { state: "uploading", retrying: true, error: "Error message" }
  ],
  [
    { upload: { uuid: _.uniqueId() }, name: getFileName() },
    { state: "queued" }
  ],
  [
    { upload: { uuid: _.uniqueId() }, name: getFileName() },
    { state: "completed" }
  ],
  [
    { upload: { uuid: _.uniqueId() }, name: getFileName() },
    { state: "completed" }
  ]
];

export const upload = () =>
  story({
    props: {
      files: {
        default: files
      }
    },
    methods: {
      cancelFile: action("cancel-file"),
      deleteFile: action("delete-file")
    },
    template: `
      <upload-file-list 
        :files="files"
        @cancel-file="cancelFile"
        @delete-file="deleteFile"
      ></upload-file-list>
    `
  });
