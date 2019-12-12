import { storyFactory } from "../util/helpers";
import { boolean, object, text } from "@storybook/addon-knobs";
import TaskOutput from "../../src/components/TE/Output";
import TaskDefinition from "../../src/components/TE/TaskDefinition";
import Resolution from "../../src/components/TE/Resolution";
import "../../src/styles/subtext.css";

export default { title: "Track Editing" };

const story = storyFactory({
  TaskDefinition,
  TaskOutput,
  Resolution
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
