import jsx from "@babel/plugin-syntax-jsx";
import { declare } from "@babel/helper-plugin-utils";
import * as t from "@babel/types";
import type { NodePath } from "@babel/traverse";
import { PluginPass } from "@babel/core";

const RUNTIME_IMPORT_SOURCE = t.stringLiteral("babel-plugin-jsx-html/runtime");
const RUNTIME_IMPORT_NAME = t.identifier("_babel_plugin_jsx_html_runtime");
const CREATE_NATIVE_ELEMENT_FUNC = t.memberExpression(
  RUNTIME_IMPORT_NAME,
  t.identifier("createNativeElement")
);

const JSX_TO_JS = {
  // All "children" jsx elements and fragments
  // should have been processed at this point already
  // eslint-disable-next-line no-unused-vars
  JSXElement: (e: any): any => {
    throw new Error("never");
  },
  // eslint-disable-next-line no-unused-vars
  JSXFragment: (e: any): any => {
    throw new Error("never");
  },
  //
  JSXText: (jsxText: t.JSXText) => t.stringLiteral(jsxText.value.trim()),
  JSXExpressionContainer: (jsxExprContainer: t.JSXExpressionContainer) =>
    jsxExprContainer.expression.type === "JSXEmptyExpression"
      ? null
      : jsxExprContainer.expression,
  JSXSpreadChild: (jsxSpreadChild: t.JSXSpreadChild) =>
    t.spreadElement(jsxSpreadChild.expression),
  JSXSpreadAttribute: (jsxSpreadAttribute: t.JSXSpreadAttribute) =>
    t.spreadElement(jsxSpreadAttribute.argument),
  StringLiteral: (strLiteral: t.StringLiteral) => strLiteral,
  JSXIdentifier: (jsxIdent: t.JSXIdentifier) => {
    if (t.isValidIdentifier(jsxIdent.name, false)) {
      // @ts-expect-error cast AST type to Identifier
      jsxIdent.type = "Identifier";
      return jsxIdent as unknown as t.Identifier;
    } else {
      return t.stringLiteral(jsxIdent.name);
    }
  },
  JSXMemberExpression: (
    jsxMemberExpr: t.JSXMemberExpression
  ): t.MemberExpression =>
    t.memberExpression(
      jsxToJs(jsxMemberExpr.object),
      jsxToJs(jsxMemberExpr.property)
    ),
  JSXNamespacedName: (jsxNamespacedName: t.JSXNamespacedName) =>
    t.stringLiteral(
      `${jsxNamespacedName.namespace.name}:${jsxNamespacedName.name.name}`
    ),
} as const;

function jsxToJs<JSX extends { type: keyof typeof JSX_TO_JS }>(
  jsx: JSX
): ReturnType<(typeof JSX_TO_JS)[JSX["type"]]> {
  return JSX_TO_JS[jsx.type](jsx);
}

function hasValue(node: t.Expression | null): boolean {
  if (!node) {
    return false;
  }

  if (node.type === "StringLiteral" && !node.value) {
    return false;
  }

  return true;
}

export function JSXAttributesToObjectExpression(
  attributes: t.JSXElement["openingElement"]["attributes"]
): t.ObjectExpression {
  const objExpression = t.objectExpression([]);

  attributes.forEach((attribute) => {
    if (attribute.type === "JSXSpreadAttribute") {
      objExpression.properties.push(jsxToJs(attribute));
    } else {
      let key: Parameters<typeof t.objectProperty>[0];

      const rawAttributeName = attribute.name.name.toString();

      if (t.isValidIdentifier(rawAttributeName)) {
        key = t.identifier(rawAttributeName);
      } else {
        key = t.stringLiteral(rawAttributeName);
      }

      const value = attribute.value
        ? jsxToJs(attribute.value)
        : t.booleanLiteral(true);

      const property = t.objectProperty(key, value);

      objExpression.properties.push(property);
    }
  });

  return objExpression;
}

export function JSXChildrenToArrayExpression(
  children: t.JSXElement["children"]
): t.ArrayExpression {
  const arrExpression = t.arrayExpression(
    children.map(jsxToJs).filter(hasValue)
  );

  return arrExpression;
}

export function convertJSXIdentifier(
  node: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
): t.StringLiteral | t.MemberExpression | t.Identifier {
  return jsxToJs(node);
}

export function getElementNameString(
  element: t.StringLiteral | t.MemberExpression | t.Identifier
): string {
  switch (element.type) {
    case "StringLiteral": {
      return element.value;
    }
    case "Identifier": {
      return element.name;
    }
    case "MemberExpression": {
      const chain: string[] = [];
      let current: t.MemberExpression | t.Identifier =
        element.object as t.MemberExpression;

      while (current.type === "MemberExpression") {
        chain.unshift(
          getElementNameString(
            current.property as t.StringLiteral | t.Identifier
          )
        );

        current = current.object as t.MemberExpression | t.Identifier;
      }

      chain.unshift(current.name);

      return chain.join(".");
    }
  }
}

export function isIdentiferInScope(
  identifier: t.StringLiteral | t.MemberExpression | t.Identifier,
  scope: NodePath["scope"]
): boolean {
  const identifierString = getElementNameString(identifier);

  return scope.hasBinding(identifierString);
}

function identifierStartsWithCapitalLetter(
  identifier: t.StringLiteral | t.MemberExpression | t.Identifier
): boolean {
  const identifierString = getElementNameString(identifier);

  return (
    identifierString.charAt(0) === identifierString.charAt(0).toUpperCase()
  );
}

function convertJSXElementIntoFunctionCall(
  path: NodePath<t.JSXElement>,
  state: PluginPass
) {
  const propsObject = JSXAttributesToObjectExpression(
    path.node.openingElement.attributes
  );
  const childrenArray = JSXChildrenToArrayExpression(path.node.children);

  const element = convertJSXIdentifier(path.node.openingElement.name);
  const isTemplateElement =
    isIdentiferInScope(element, path.scope) &&
    identifierStartsWithCapitalLetter(element);

  let elementCreationCall;

  if (isTemplateElement) {
    // if element found in scope (e.g. imported)
    // consider it a template function and call
    // it directly:
    //
    // import TempateA from './template-a';
    // <TemplateA foo="bar">baz</TemplateA>
    // ↓↓↓ transpiled into ↓↓↓
    // TemplateA({foo: "bar"}, ["baz"])
    elementCreationCall = t.callExpression(element, [
      propsObject,
      childrenArray,
    ]);
  } else {
    state.fileHasNativeJSXElements = true;

    // if element is not found in scope, it is considered a
    // plain element that will be created by imported
    // "createNativeElement" function:
    //
    // <div foo="bar">baz</TemplateA>
    // ↓↓↓ transpiled into ↓↓↓
    // createNativeElement('div', {foo: "bar"}, ["baz"])
    elementCreationCall = t.callExpression(CREATE_NATIVE_ELEMENT_FUNC, [
      t.stringLiteral(getElementNameString(element)),
      propsObject,
      childrenArray,
    ]);
  }

  return elementCreationCall;
}

function createPlugin({ name }: { name: string }) {
  return declare(() => {
    return {
      name,
      inherits: jsx,
      visitor: {
        Program: {
          exit: (path, state) => {
            if (state.fileHasNativeJSXElements) {
              path.node.body.unshift(
                t.importDeclaration(
                  [t.importNamespaceSpecifier(RUNTIME_IMPORT_NAME)],
                  RUNTIME_IMPORT_SOURCE
                )
              );
            }
          },
        },

        JSXFragment: {
          exit(path) {
            const childrenArray = JSXChildrenToArrayExpression(
              path.node.children
            );

            const fragmentCreationCall = t.callExpression(
              t.memberExpression(childrenArray, t.identifier("join")),
              [t.stringLiteral("")]
            );

            const isNestedInsideJSX = path.parent.type === "JSXElement";

            path.replaceWith(
              t.inherits(
                isNestedInsideJSX
                  ? // at this point, parent JSX is not traversed and
                    // modified yet and will throw an error if it meets a
                    // function call (this one) not wrapped into {}
                    t.jsxExpressionContainer(fragmentCreationCall)
                  : fragmentCreationCall,
                path.node
              )
            );
          },
        },

        JSXElement: {
          exit(path, state) {
            const elementCreationCall = convertJSXElementIntoFunctionCall(
              path,
              state
            );

            const isNestedInsideJSX =
              path.parent.type === "JSXElement" ||
              path.parent.type === "JSXFragment";

            path.replaceWith(
              t.inherits(
                isNestedInsideJSX
                  ? // at this point, parent JSX is not traversed and
                    // modified yet and will throw an error if it meets a
                    // function call (this one) not wrapped into {}
                    t.jsxExpressionContainer(elementCreationCall)
                  : elementCreationCall,
                path.node
              )
            );
          },
        },

        JSXAttribute(path) {
          if (t.isJSXElement(path.node.value)) {
            // replacing
            // <A foo=<bar/> />
            // ↓↓↓
            // <A foo={<bar />} />
            // to avoid getting <A foo=createNativeElement(...) />
            // after JSXElement traverser processes the attribute
            const attributeWithWrappedValue = t.jsxAttribute(
              path.node.name,
              t.jsxExpressionContainer(path.node.value)
            );

            path.replaceWith(attributeWithWrappedValue);
          }
        },
      },
    };
  });
}

export default createPlugin({
  name: "jsx-html-template",
});
