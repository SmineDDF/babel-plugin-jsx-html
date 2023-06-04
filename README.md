- [babel-plugin-jsx-html](#babel-plugin-jsx-html)
  - [Motivation](#motivation)
  - [What to use it for](#what-to-use-it-for)
- [Usage](#usage)
  - [Install](#install)
  - [Add plugin](#add-plugin)
  - [\[optional\] TypeScript](#optional-typescript)
  - [Create templates with JSX](#create-templates-with-jsx)
    - [Example](#example)
- [Contribution](#contribution)
  - [Prerequisites](#prerequisites)
  - [Testing \& linting](#testing--linting)

# babel-plugin-jsx-html
This plugin turns JSX into HTML template functions that return plain HTML string
when combined.

## Motivation
I wanted to create HTML template functions using familiar JSX syntax instead of
JS's native templating (`${}`) because it is too verbose at large scale and
does not look like HTML.

## What to use it for
The idea is to use it on server-side to render plain HTML without any view-level
frameworks.

# Usage

## Install
Note that this library has runtime dependency, so don't make it `devDependency`.

```bash
npm install babel-plugin-jsx-html
```
or
```bash
yarn babel-plugin-jsx-html
```

## Add plugin
In your babel.config.json (or any other way of configuring babel):

__note the omitted `babel-plugin` prefix__

```json
{
    "plugins": ["jsx-html"]
}
```

## [optional] TypeScript
If you are using TypeScript (`.tsx`), you will also need to extend your
`tsconfig` from the config at `babel-plugin-jsx-html/tsconfig`:

```json
{
    "extends": "babel-plugin-jsx-html/tsconfig"
}
```
This instructs TS to not assume that JSX syntax means "we are using react" and process it, leaving JSX to babel.

If you can't extend tsconfig for some reason, you can directly include needed
config parts:
```json
{
    "compilerOptions": {
        "jsx": "preserve"
    },
    "include": ["babel-plugin-jsx-html/types.d.ts"]
}
```

## Create templates with JSX
The templating rules are mostly similar to how it works in React
with one change: children are not appended to `props`, they are
passed as separate argument.

Also all properties are html properties, not React properties,
so you will need to type `class` instead of `className` - just like in plain HTML.

### Example
```jsx
const Foo = ({ style }, children) => {
    return (
        <div style={style}>
            Green text before children
            {...children}
        </div>
    );
}

const Bar = ({ src }) => {
    return (
        <div style="background:red;">
            <img src={src} style="opacity:0.7;" />
        </div>
    );
}

const Baz = () => {
    return (
        <Foo style="color:green;">
            <div>
                Something before Bar
            </div>
            <Bar src="/some-image.png" />
        </Foo>
    );
}
```

Running transpiled `Baz` will return you this (as string):
```html
<!-- 
    Actual outcome will not have line breaks and indentation,
    it will just be a one-line string,
    see ./tests/test-readme-example/expected.html
-->
<div style="color:green;">
    Green text before children
    <div>Something before Bar</div>
    <div style="background:red;">
        <img src="/some-image.png" style="opacity:0.7;"></img>
    </div>
</div>
```

# Contribution
## Prerequisites
1. Clone the repository
2. `cd babel-plugin-jsx-html`
3. `npm install`
4. `npm run build`

## Testing & linting
Don't forget to test changes before pushing them:

1. `npm run build` to rebuild the lib
2. `npm run test`
3. `npm run lint`
