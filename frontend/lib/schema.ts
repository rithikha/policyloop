import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import schema from "../public/schema/moenv-taipei.json";

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const validate = ajv.compile(schema);

export interface SchemaValidationResult<T> {
  valid: boolean;
  errors: string[];
  value?: T;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return [];
  return errors.map((err) => {
    const path = err.instancePath ? err.instancePath : err.schemaPath ?? "root";
    return `${path}: ${err.message ?? "invalid value"}`;
  });
}

export function validateMetadata<T>(data: unknown): SchemaValidationResult<T> {
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [], value: data as T };
  }
  return {
    valid: false,
    errors: formatErrors(validate.errors),
  };
}
