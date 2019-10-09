const Track = require('../../index');

describe('tests section 2 of the specification', () => {
  test('sections 2.2-3: rule order', () => {
    let schema = String.raw`
    @foobar
    ||
    (a)
    (b)
    any c, d, e
    ||
    `;

    let text1 = 'abd';
    let text2 = 'abf';
    let text3 = 'abfabe';

    const track = new Track(schema);

    expect(track.test(text1, 'foobar')).toBe(true);
    expect(track.test(text2, 'foobar')).toBe(false);
    expect(track.test(text3, 'foobar')).toBe(true);
  });

  test('section 2.4: pattern delimiters', () => {
    let schema = String.raw`
    @named_pattern
    ||
    (test?)
    none a to z
    ||
    `;

    const track = new Track(schema);
    expect(track.parser.tree.tree).toMatchSnapshot();
  });

  test('section 2.5: empty lines', () => {
    let schema = String.raw`
      @pattern
      ||

      (a)

      any digit

      ||


    `;

    let schema2 = String.raw`
      @pattern
      ||
      (a)
      any digit
      ||
    `;

    const track = new Track(schema);
    const track2 = new Track(schema2);

    expect(track.parser.tree.tree).toEqual(track2.parser.tree.tree);
  });

  test('section 2.6: pattern without symbol', () => {
    let schema = String.raw`
      ||
      (a)
      (b)
      any digit
      ||
    `;

    let text = 'ab5';

    const track = new Track(schema);
    expect(track.test(text)).toBe(true);
  });
});
