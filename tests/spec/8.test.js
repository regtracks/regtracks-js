const Track = require('../../index');

describe('tests section 8 of the specification', () => {
  const schema = String.raw`
    @list
    ||
    start
    or (,)
    optionally any whitespace
      times forever
    any a to z, A to Z, digit as name
      times forever
        optionally after {
          any whitespace as name
            times forever
          }
    optionally any whitespace
      times forever
    ||
  `;

  test('section 8.2: match', () => {
    const track = new Track(schema);

    let good = 'hi there   , Testing, one two three, d';
    let bad = '!,:';

    let goodres = track.match(good, 'list');
    let badres = track.match(bad, 'list');

    expect(goodres.match).toBe('hi there   ');
    expect(goodres.index).toBe(0);
    expect(goodres.collected.name).toBe('hi there');
    expect(badres).toBeNull();
  });

  test('section 8.3: test', () => {
    const track = new Track(schema);

    let good = 'test, 123, etc';
    let bad = ':,@@@,? ';

    expect(track.test(good, 'list')).toBe(true);
    expect(track.test(bad, 'list')).toBe(false);
  });

  test('section 8.4: replace', () => {
    const track = new Track(String.raw`
      @simple_string
      ||
      (needle)
      ||

      @five_letters
      ||
      any a to z, A to Z
        times 5
      ||
    `);

    let startSimple = 'Find the needle in the haystack, or both the needles!';
    let simpleReplace = 'donkey';
    let endSimple = 'Find the donkey in the haystack, or both the donkeys!';
    let startFive = 'The quick brown fox jumps over the lazy dog.';
    let fiveReplace = 'REDACTED';
    let endFive = 'The REDACTED REDACTED fox REDACTED over the lazy dog.';
    let noChangeSimple = 'There are no sewing implements here, need dle?';
    let noChangeFive = 'Why say lot word when few word do tri ck?';
    let endSimpleNoGlobal = 'Find the donkey in the haystack, or both the needles!';

    expect(track.replace(startSimple, 'simple_string', simpleReplace)).toBe(endSimple);
    expect(track.replace(startFive, 'five_letters', fiveReplace)).toBe(endFive);
    expect(track.replace(noChangeSimple, 'simple_string', simpleReplace)).toBe(noChangeSimple);
    expect(track.replace(noChangeFive, 'five_letters', fiveReplace)).toBe(noChangeFive);
    expect(track.replace(startSimple, 'simple_string', simpleReplace, { global: false })).toBe(endSimpleNoGlobal);
  });

  test('section 8.5.1: global', () => {
    const track = new Track(schema);

    let good = 'hi there   , Testing, one two three, d';

    let res = track.match(good, 'list', { global: true }, {});
    expect(res.match).toBe('hi there   ');
    expect(res.index).toBe(0);
    expect(res.collected.name).toBe('hi there');

    res = track.match(good, 'list', { global: true }, {});
    expect(res.match).toBe(', Testing');
    expect(res.index).toBe(11);
    expect(res.collected.name).toBe('Testing');

    res = track.match(good, 'list', { global: true }, {});
    expect(res.match).toBe(', one two three');
    expect(res.index).toBe(20);
    expect(res.collected.name).toBe('one two three');

    res = track.match(good, 'list', { global: true }, {});
    expect(res.match).toBe(', d');
    expect(res.index).toBe(35);
    expect(res.collected.name).toBe('d');

    res = track.match(good, 'list', { global: true }, {});
    expect(res).toBeNull();

    // Should loop back around
    res = track.match(good, 'list', { global: true }, {});
    expect(res.match).toBe('hi there   ');
    expect(res.index).toBe(0);
    expect(res.collected.name).toBe('hi there');
  });
});
