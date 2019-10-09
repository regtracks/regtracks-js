const Track = require('../../index');

describe('tests section 6 of the specification', () => {
  test('section 6.1: charsets', () => {
    let schema = String.raw`
    @set
    a, b, (cheese), f to z, digit, whitespace
    `;

    const track = new Track(schema);
    expect(track.parser.tree.tree).toMatchSnapshot();

    let schema2 = schema + String.raw`
      @matching
      ||
      any set
      ||
    `;

    let good = 'b';
    let good2 = 'cheese';
    let good3 = 'x';
    let bad = 'e';
    let bad2 = '!';

    const track2 = new Track(schema2);
    expect(track2.test(good, 'matching')).toBe(true);
    expect(track2.test(good2, 'matching')).toBe(true);
    expect(track2.test(good3, 'matching')).toBe(true);
    expect(track2.test(bad, 'matching')).toBe(false);
    expect(track2.test(bad2, 'matching')).toBe(false);
  });

  test('section 6.2: no recursion', () => {
    let illFormedSchema = String.raw`
      @foobar
      a, b, A to Z, foobar, digit
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });
});
