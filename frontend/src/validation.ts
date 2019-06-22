export const validateDuration = (v: string) => {
  return v
    ? v.match("^(\\d[:.])?\\d{1,2}[:.]\\d{1,2}$")
      ? true
      : "Must match format (h:)mm:ss"
    : true;
};

export const required = (v: string) => !!v || "Required";
