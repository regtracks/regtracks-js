# RegTracks (JavaScript implementation)

RegTracks lets you write readable regex.

Don't know what RegTracks is? [Read the super-quick introduction on the official repo!](https://github.com/regtracks/regtracks)

- [Installation](#installation)
- [Usage](#usage)
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

## Contributing

Contributions are very much welcomed! Please, fork and make a PR. Issues are also appreciated.

This package uses `yarn`. Install with `yarn`. Run tests with `yarn test`.
