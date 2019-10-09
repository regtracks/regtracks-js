const Track = require('../../index');

describe('tests section 5 of the specification', () => {
  test('section 5.1: symbols', () => {
    let schema = String.raw`
      @valid_23b2
      ||
      any a to z
      ||

      @againValid
      a, b, c, digit, space
    `;

    const track = new Track(schema);
    expect(track.parser.tree.tree).toMatchSnapshot();

    let illFormedSchema = String.raw`
      @name_not_before
      @symbol2
      ||
      any a to z
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('sections 5.2, 5.4-5: bad symbol names', () => {
    let illFormedSchema = String.raw`
      @pattern
      ||
      @not_here
      any a to z
      ||
    `;

    let illFormedSchema2 = String.raw`
      @a
      ||
      any a to z
      ||
    `;

    let illFormedSchema3 = String.raw`
      @5nonum
      ||
      any a to z
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
    expect(() => new Track(illFormedSchema2)).toThrow();
    expect(() => new Track(illFormedSchema3)).toThrow();
  });

  test('section 5.6: same symbol name more than once', () => {
    let illFormedSchema = String.raw`
      @pattern
      ||
      any a to z
      ||

      @pattern
      ||
      (:)
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('section 5.3: reserved symbol names', () => {
    const reserved = [
      'after',
      'as',
      'any',
      'anything',
      'digit',
      'end',
      'forever',
      'none',
      'optionally',
      'or',
      'space',
      'start',
      'times',
      'to',
      'whitespace',
    ];

    for (let name of reserved) {
      let illFormedSchema = String.raw`
        @${ name }
        ||
        any a to z
        ||
      `;
      expect(() => new Track(illFormedSchema)).toThrow();
    }
  });
});
