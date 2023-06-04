type Prop = string | number | unknown;
type Props = Record<string, Prop>;

const ESC = {
  "<": "&lt;",
  ">": "&gt;",
  '"': "'",
  "&": "&amp;",
};

function escapeChar(a) {
  return ESC[a] || a;
}

function escape(s: string) {
  return s.replace(/[<>"&]/g, escapeChar);
}

const ALLOWED_PROP_TYPES = {
  string: 1,
  number: 1,
  object: 1,
  boolean: 1,
};

function stringifyProp<PropType>(key: string, value?: PropType): string {
  if (!value || value === true) {
    return key;
  }

  if (ALLOWED_PROP_TYPES[typeof value]) {
    return `${key}="${escape(String(value))}"`;
  }

  throw new Error(
    `Incorrect ${key} prop type: ${typeof value}, ` +
      "expected one of: string, number, object, boolean"
  );
}

function stringifyProps(props: Props): string[] {
  return Object.entries(props).map(([key, value]) => stringifyProp(key, value));
}

export function createNativeElement(
  element: string,
  props: Props,
  children: string[]
) {
  const stringifiedProps = stringifyProps(props).join(" ");
  const hasProps = stringifiedProps.length > 0;

  return `<${element}${hasProps ? " " : ""}${stringifiedProps}>${children.join(
    ""
  )}</${element}>`;
}
