const Track = require('../../index');

describe('tests section 7 of the specification', () => {
  test('section 7.1: variables from collection', () => {
    let schema = String.raw`
    @vars
    ||
    {
      any a to z as str
      ($str)
      }
      times forever
    ||
    `;

    const track = new Track(schema);

    const good = 'aababcabc';
    const bad = 'adada';

    expect(track.test(good, 'vars')).toBe(true);
    expect(track.test(bad, 'vars')).toBe(false);
  });

  test('section 7.2: variables passed to parser', () => {
    let schema = String.raw`
    @vars
    ||
    any a to z
      times forever
        after ($delim)
    ($end)
    ||
    `;

    const track = new Track(schema);
    expect(track.parser.tree.tree).toMatchSnapshot();

    const vars = {
      delim: ',',
      end: '.',
    };

    let good = 'a,b,c,d.';
    let good2 = 'x.';
    let bad = 'e-b-d,';
    let bad2 = 'e,b,d';

    expect(track.test(good, 'vars', {}, vars)).toBe(true);
    expect(track.test(good2, 'vars', {}, vars)).toBe(true);
    expect(track.test(bad, 'vars', {}, vars)).toBe(false);
    expect(track.test(bad2, 'vars', {}, vars)).toBe(false);

    expect(() => track.test(good, 'vars')).toThrow();
  });

  test('section 7.3: variable names', () => {
    let illFormedSchema = String.raw`
      @morevars
      ||
      ($bad!name)
      ||
    `;

    let illFormedSchema2 = String.raw`
      @morevars
      ||
      ($not.allowed)
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
    expect(() => new Track(illFormedSchema2)).toThrow();
  });
});
