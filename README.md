# RegTracks (JavaScript implementation)

RegTracks lets you write readable regex.

Don't know what RegTracks is? [Read the super-quick introduction on the official repo!](https://github.com/regtracks/regtracks)

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [`class Track(schema: string)`](#class-trackschema-string)
    - [`Track.match(string: string, entryPoint: string, options?: object, variables?: object)?: object`](#trackmatchstring-string-entrypoint-string-options-object-variables-object-object)
    - [`Track.test(string: string, entryPoint: string, options?: object, variables?: object): bool`](#trackteststring-string-entrypoint-string-options-object-variables-object-bool)
    - [`Track.replace(string: string, entryPoint: string, replacementString: string, options?: object, variables?: object): string`](#trackreplacestring-string-entrypoint-string-replacementstring-string-options-object-variables-object-string)
- [Contributing](#contributing)

## Installation

RegTracks for JS is available via npm:

```bash
yarn add regtracks
# OR
npm install regtracks --save
```

## Usage

Simply `require` or `import` the `Track` object.

```js
const Track = require('regtracks');
// OR
import Track from 'regtracks';
```

If you need to define a schema in JS, you should use `String.raw`, so that everything is taken literally - escapes are handled by the RegTracks parser:

```js
const schema = String.raw`
  @my_pattern
  ||
  start
  or (,)
  any a to z, A to Z, digit as ident
    times forever
  ||
`;
```

Then create a `Track` from your schema:

```js
const myPattern = new Track(schema);
```

You can now make matches using either `match` or `test`:

```js
let testText = 'hello,world,34,55,chees3';

let result = myPattern.match(testText, 'my_pattern');
```

This will give a result object like:

```js
{
  match: 'hello',
  index: 0,
  collected: {
    ident: 'hello'
  }
}
```

To loop over all the matches, you can use the `global` flag and a `while` loop:

```js
let result;
let options = {
  global: true,
};

while (result = myPattern.match(testText, 'my_pattern', options)) {
  console.log(result.collected.ident);
}
```

This will give you:

```
hello
world
34
55
chees3
```

`test` in place of `match` can be invoked exactly the same, with the same options, but returns only `true` and `false` based on whether it matched or not.

`replace` will replace any matches with a given replacement string.

For a more detailed API description, please see below.

## API

### `class Track(schema: string)`

The `Track` object is a compiled RegTracks schema which can be executed on a string. If your schema is ill-formed, the `Track` constructor will throw an error.

#### `Track.match(string: string, entryPoint: string, options?: object, variables?: object)?: object`

Finds matches in the given `string` for the pattern defined under the identifier `entryPoint` in the `Track`'s schema.

Options is an object with the format:

```js
{
  global: bool
}
```

`global` defaults to `false` for this method. If the `global` option is set to `true`, the next time a function of `Track` is called, it will begin matching from the point immediately after the one where it last found a match.

`variables` is any object with `variable-name: value` pairs which will be subsituted into the schema.

This function returns an object of the form:

```js
{
  match: string,
  index: number,
  collected: {
    identName: string
  }
}
```

where:

- `match` is the full string that was matched by the pattern at `entryPoint`
- `index` is the index in the string that the match begins at
- `collected` is an object with ident-name: value pairs for strings collected during matching under the `as` directive

#### `Track.test(string: string, entryPoint: string, options?: object, variables?: object): bool`

Returns whether a match can be found in the given `string` for the pattern defined under the identifier `entryPoint` in the `Track`'s schema.

Options is an object with the format:

```js
{
  global: bool
}
```

`global` defaults to `false` for this method. If the `global` option is set to `true`, the next time a function of `Track` is called, it will begin matching from the point immediately after the one where it last found a match.

`variables` is any object with `variable-name: value` pairs which will be subsituted into the schema.

This function returns `true` if a match could be found, and `false` otherwise.

#### `Track.replace(string: string, entryPoint: string, replacementString: string, options?: object, variables?: object): string`

Returns a string with matches (for the pattern defined under the identifier `entryPoint` in the `Track`'s schema) replaced by the given string.

The `replacementString` may contain references to collected strings in the format `$(collectionIdent)`. If a string has been collected using `as` during
matching, it will be subsituted for the ident if specified like this in the replacementString. No substitution will be made for this format if no such ident exists.

Options is an object with the format:

```js
{
  global: bool
}
```

**`global` defaults to `true` for this method.** If the `global` option is set to `true`, the next time a function of `Track` is called, it will begin matching from the point immediately after the one where it last found a match.

`variables` is any object with `variable-name: value` pairs which will be subsituted into the schema.

This function returns the string with subsitutions made if possible.

## Contributing

Contributions are very much welcomed! Please, fork and make a PR. Issues are also appreciated.

This package uses `yarn`. Install with `yarn`. Run tests with `yarn test`.
