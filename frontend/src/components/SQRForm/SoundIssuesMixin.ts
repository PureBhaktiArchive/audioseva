import { Component, Mixins } from "vue-property-decorator";
import _ from "lodash";
import FormField from "@/mixins/FormField";
import { required, validateDuration } from "@/validation";

@Component
export default class SoundIssuesMixin extends Mixins(FormField) {
  updatePath = "";
  prefix: string | undefined;

  style = {
    minWidth: "75px"
  };

  formProps = {
    updateForm: this.updateForm,
    updatePath: this.updatePath
  };

  get componentData() {
    return {
      beginning: {
        class: {
          timeField: true
        },
        props: {
          ...this.formProps,
          form: this.form,
          styles: {
            timeField: true
          },
          fieldProps: {
            label: "Beginning",
            outline: true,
            placeholder: "(h:)mm:ss",
            rules: [required, validateDuration]
          }
        },
        style: this.style
      },
      ending: {
        props: {
          ...this.formProps,
          form: this.form,
          styles: {
            timeField: true
          },
          fieldProps: {
            label: "Ending",
            outline: true,
            placeholder: "(h:)mm:ss",
            rules: [required, validateDuration]
          }
        },
        style: this.style
      },
      actions: {
        props: {
          removeField: this.removeField,
          updatePath: this.updatePath
        }
      },
      description: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            box: true,
            label: "Description",
            outline: true,
            rules: [required]
          }
        },
        style: this.style
      },
      type: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            rules: [required]
          }
        }
      }
    };
  }

  headers = [
    {
      text: "Beginning",
      value: "beginning",
      width: "15%"
    },
    {
      text: "Ending",
      value: "ending",
      width: "15%"
    },
    {
      text: "Type",
      value: "type",
      width: "25%"
    },
    {
      text: "Description",
      value: "description",
      width: "25%"
    },
    {
      value: "actions"
    }
  ];

  get mappedHeaders() {
    return this.headers.map((header: any) => ({ ...header, sortable: false }));
  }

  get items(): any {
    return [];
  }

  addField() {
    this.updateForm(
      `${this.updatePath}.${_.get(this.form, this.updatePath, []).length}`,
      {}
    );
  }
}
