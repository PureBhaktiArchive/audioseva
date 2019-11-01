import { action } from "@storybook/addon-actions";
import { storyFactory } from "../util/helpers";
import PaginationControls from "../../src/components/TE/PaginationControls";
import {number} from "@storybook/addon-knobs";

export default { title: "PaginationControls" }

const story = storyFactory({
  PaginationControls
});

export const asDefault = () => story({
  props: {
    value: { default: 50 },
    lastPageNumber: { default: number("last page number", 2) },
    pagination: { default: { page: number("page number", 2) } }
  },
  methods: {
    handlePageSizeChange: action("page size change"),
    handlePreviousPage: action("previous page"),
    handleNextPage: action("next page")
  },
  template: `
    <pagination-controls 
      :pagination="pagination"
      :lastPageNumber="lastPageNumber"
      :value="50"
      @input="handlePageSizeChange"
      @previousPage="handlePreviousPage"
      @nextPage="handleNextPage"
    ></pagination-controls>
`
});
