import { Component, Mixins } from "vue-property-decorator";
import _ from "lodash";
import FormField from "@/mixins/FormField";

@Component
export default class SoundIssuesMixin extends Mixins(FormField) {
  updatePath = "";
  prefix: string | undefined;

  style = {
    minWidth: "150px"
  };

  formProps = {
    updateForm: this.updateForm,
    updatePath: this.updatePath
  };

  get componentData() {
    return {
      beginning: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            placeholder: "(h:)mm:ss format",
            rules: [(value: any) => !!value || 'Required']
          }
        },
        style: this.style
      },
      ending: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            placeholder: "(h:)mm:ss format",
            rules: [(value: any) => !!value || 'Required']
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
            class: "pa-2",
            rules: [(value: any) => !!value || 'Required']
          }
        },
        style: this.style
      },
      type: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            rules: [(value: any) => !!value || 'Required']
          }
        }
      }
    };
  };

  headers = [
    {
      text: "Beginning",
      value: "beginning",
      width: "25%"
    },
    {
      text: "Ending",
      value: "ending",
      width: "25%"
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

  get items() {
    return [];
  }

  addField() {
    this.updateForm(`${this.updatePath}.${_.uniqueId(this.prefix || `${this.updatePath}_`)}`, {});
  }
}