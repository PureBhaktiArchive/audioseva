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

  shouldValidateField(value: string, item: any) {
    const part = _.get(this.form, `${this.updatePath}.${item}`);
    return Object.values(part).some(fieldValue => !!fieldValue);
  }

  get customData(): { [key: string]: any } {
    return {};
  }

  getTimeFieldProps(label: string) {
    return {
      props: {
        ...this.formProps,
        form: this.form,
        fieldProps: {
          label,
          outlined: true,
          placeholder: "(h:)mm:ss",
          rules: this.getValidators([required, validateDuration])
        }
      },
      style: this.style
    };
  }

  getFieldProps(value: string, item: any) {
    const hasRules = this.shouldValidateField(value, item);
    const props = this.customData[value].props;
    const rules = _.get(props, "fieldProps.rules", []);
    return {
      ...props,
      item,
      value,
      fieldProps: {
        ..._.get(props, "fieldProps", {}),
        rules: hasRules ? rules : []
      }
    };
  }

  get componentData() {
    return {
      beginning: this.getTimeFieldProps("Beginning"),
      ending: this.getTimeFieldProps("Ending"),
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
            filled: true,
            label: "Description",
            outlined: true
          }
        },
        style: this.style
      },
      type: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            rules: this.getValidators([required])
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

  get validateFields() {
    const data = _.get(this.form, this.updatePath);
    if (!data) return false;

    if (data.length <= 1) {
      const { id, ...field } = _.get(data, "0", {});
      const fieldValues = Object.values(field);
      return fieldValues.length;
    }
    return true;
  }

  getValidators(validators: any[]) {
    return this.validateFields ? validators : [];
  }

  addField() {
    this.updateForm(
      `${this.updatePath}.${_.get(this.form, this.updatePath, []).length}`,
      { id: _.uniqueId() }
    );
  }
}
