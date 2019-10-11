const Track = require('../../index');

describe('tests section 3 of the specification', () => {
  test('section 3.1.1: literals', () => {
    let schema = String.raw`
    @literal
    ||
    (cheese bar! Yes.)
    ( )
    (END)
    ||

    @escapes
    ||
    (\n\#yep\})
    ||
    `;

    let good = 'cheese bar! Yes. END';
    let bad = 'cheese bar! Yes.END';

    const track = new Track(schema);

    expect(track.test(good, 'literal')).toBe(true);
    expect(track.test(bad, 'literal')).toBe(false);

    let good2 = '\n#yep}';
    expect(track.test(good2, 'escapes')).toBe(true);
  });

  test('sections 3.1.2.1-2: matching sets', () => {
    let schema = String.raw`
      @sets
      ||
      any a, b,c,  d  ,(mouse)
      any \n, \t, \u13AF
      ||
    `;

    let good = 'a\n';
    let good2 = 'mouse\t';
    let good3 = 'cᎯ';
    let bad = 'mous\n';
    let bad2 = 'd\r';


    const track = new Track(schema);

    expect(track.test(good, 'sets')).toBe(true);
    expect(track.test(good2, 'sets')).toBe(true);
    expect(track.test(good3, 'sets')).toBe(true);
    expect(track.test(bad, 'sets')).toBe(false);
    expect(track.test(bad2, 'sets')).toBe(false);
  });

  test('section 3.1.2.3: character ranges', () => {
    let schema = String.raw`
      @sets
      ||
      any a to g
      ||
    `;

    let good = 'b';
    let bad = 'h';

    const track = new Track(schema);

    expect(track.test(good, 'sets')).toBe(true);
    expect(track.test(bad, 'sets')).toBe(false);
  });

  test('sections 3.1.2.4 and 3.1.2.7: character ranges', () => {
    let schema = String.raw`
      @sets
      ||
      any my_set
      ||

      @my_set
      a to c, z to x
    `;

    let good = 'b';
    let good2 = 'z';
    let bad = 'h';
    let bad2 = '6';

    const track = new Track(schema);

    expect(track.test(good, 'sets')).toBe(true);
    expect(track.test(good2, 'sets')).toBe(true);
    expect(track.test(bad, 'sets')).toBe(false);
    expect(track.test(bad2, 'sets')).toBe(false);
  });

  test('section 3.1.2.5: no value between commas', () => {
    let illFormedSchema = String.raw`
      @foo
      ||
      any a,,b,c
      ||
    `;

    let illFormedSchema2 = String.raw`
      @bar
      x,,5 to 9
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
    expect(() => new Track(illFormedSchema2)).toThrow();
  });

  test('section 3.1.2.6: none sets', () => {
    let schema = String.raw`
      @not_one
      ||
      (!)
      none f to h, (cat), z
      ||

      @lineend
      ||
      none a
      ||
    `;

    let good = '!m';
    let bad = '!cat';
    let bad2 = '!g';

    const track = new Track(schema);

    expect(track.test(good, 'not_one')).toBe(true);
    expect(track.test(bad, 'not_one')).toBe(false);
    expect(track.test(bad2, 'not_one')).toBe(false);

    let good2 = 'b';
    let good3 = '\n';
    expect(track.test(good2, 'lineend')).toBe(true);
    expect(track.test(good3, 'lineend')).toBe(true);
  });

  test('section 3.1.3: start and end', () => {
    let schema = String.raw`
      @strings
      ||
      start
      (yes)
      end
      ||
    `;

    let good = 'yes';
    let bad = ' yes';
    let bad2 = 'yes ';
    let bad3 = 'no';

    const track = new Track(schema);

    expect(track.test(good, 'strings')).toBe(true);
    expect(track.test(bad, 'strings')).toBe(false);
    expect(track.test(bad2, 'strings')).toBe(false);
    expect(track.test(bad3, 'strings')).toBe(false);
  });

  test('section 3.1.4: pattern references', () => {
    let schema = String.raw`
      @ref
      ||
      abc
      ||

      @abc
      ||
      (a)
      (b)
      (c)
      ||
    `;

    let good = 'abc';
    let bad = 'ab c';
    let bad2 = '';

    const track = new Track(schema);

    expect(track.test(good, 'ref')).toBe(true);
    expect(track.test(bad, 'ref')).toBe(false);
    expect(track.test(bad2, 'ref')).toBe(false);
  });

  test('section 3.2.1 and 3.2.2.1.1: repetition rules', () => {
    let schema = String.raw`
      @repeats
      ||
      any a to z
        times 3
      ||

      @blockRepeats
      ||
      {
        any a to z
        any digit
        }
        times 2
      ||
    `;

    let good = 'aby';
    let bad = 'cv6';
    let bad2 = 'ab';

    const track = new Track(schema);

    expect(track.test(good, 'repeats')).toBe(true);
    expect(track.test(bad, 'repeats')).toBe(false);
    expect(track.test(bad2, 'repeats')).toBe(false);

    let good2 = 'a5c8';
    let bad3 = 'h0';
    let bad4 = 'h0iz';
    expect(track.test(good2, 'blockRepeats')).toBe(true);
    expect(track.test(bad3, 'blockRepeats')).toBe(false);
    expect(track.test(bad4, 'blockRepeats')).toBe(false);

    let illFormedSchema = String.raw`
      @foo
      ||
      any a to z
        times 0
      ||
    `;

    let illFormedSchema2 = String.raw`
      @foo
      ||
      times 3
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
    expect(() => new Track(illFormedSchema2)).toThrow();
  });

  test('section 3.2.2.1.2: repetition ranges', () => {
    let schema = String.raw`
      @range_fixed
      ||
      (a)
        times 2 to 5
      ||

      @range_min
      ||
      (b)
        times 3 to forever
      ||
    `;

    const track = new Track(schema);

    let good = 'aa.';
    let good2 = 'aaaaa';
    let bad = 'a';
    let bad2 = 'ababababa';

    expect(track.test(good, 'range_fixed')).toBe(true);
    expect(track.test(good2, 'range_fixed')).toBe(true);
    expect(track.test(bad, 'range_fixed')).toBe(false);
    expect(track.test(bad2, 'range_fixed')).toBe(false);

    let good3 = 'bbb';
    let good4 = 'bbbbbbbbbbbbbbbbbb';
    let bad3 = 'bb';
    let bad4 = 'aaaaaa';

    expect(track.test(good3, 'range_min')).toBe(true);
    expect(track.test(good4, 'range_min')).toBe(true);
    expect(track.test(bad3, 'range_min')).toBe(false);
    expect(track.test(bad4, 'range_min')).toBe(false);

    let illFormedSchema = String.raw`
      @bad
      ||
      (a)
        times 3 to 2
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('secetion 3.2.2.1.3: forever', () => {
    let schema = String.raw`
      @range_forever
      ||
      (c)
        times forever
      ||
    `;

    const track = new Track(schema);

    let good = 'c';
    let good2 = 'ccccccccccccccccccc';
    let bad = '';
    let bad2 = 'ffffffffffffff';

    expect(track.test(good, 'range_forever')).toBe(true);
    expect(track.test(good2, 'range_forever')).toBe(true);
    expect(track.test(bad, 'range_forever')).toBe(false);
    expect(track.test(bad2, 'range_forever')).toBe(false);
  });

  test('section 3.3.1: prefix only before matching rule', () => {
    let illFormedSchema = String.raw`
      @bad
      ||
      (a)
        optionally times 3
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('sections 3.3.2-4: optionally', () => {
    let schema = String.raw`
      @opt
      ||
      any a to z
      optionally (?)
      optionally (!)
      ||

      @opt_block
      ||
      any a to z
      optionally {
        (?)
        (!)
        }
      ||
    `;

    const track = new Track(schema);

    let good = 'f?';
    let good2 = 'f!';
    let good3 = 'f';
    let bad = '';

    expect(track.test(good, 'opt')).toBe(true);
    expect(track.test(good2, 'opt')).toBe(true);
    expect(track.test(good3, 'opt')).toBe(true);
    expect(track.test(bad, 'opt')).toBe(false);

    let good4 = 'x?!';
    let good5 = 'x';
    let bad2 = 'x!?';
    let bad3 = 'x?';
    let bad4 = 'x!';

    expect(track.match(good4, 'opt_block').match).toBe(good4);
    expect(track.match(good5, 'opt_block').match).toBe(good5);
    expect(track.match(bad2, 'opt_block').match).toBe('x');
    expect(track.match(bad3, 'opt_block').match).toBe('x');
    expect(track.match(bad4, 'opt_block').match).toBe('x');
  });

  test('section 3.3.5: or', () => {
    let schema = String.raw`
      @foobar
      ||
      (a)
      or (b)
      or any !, ?, .
      ||

      @block
      ||
      (a)
      or {
        (:)
        any b to z
        }
      ||
    `;

    const track = new Track(schema);

    let good = 'a';
    let good2 = 'b';
    let good3 = '?';
    let bad = 'c';
    let bad2 = ',';

    expect(track.test(good, 'foobar')).toBe(true);
    expect(track.test(good2, 'foobar')).toBe(true);
    expect(track.test(good3, 'foobar')).toBe(true);
    expect(track.test(bad, 'foobar')).toBe(false);
    expect(track.test(bad2, 'foobar')).toBe(false);

    let matching = 'a?';
    expect(track.match(matching, 'foobar').match).toBe('a');

    let good4 = 'a';
    let good5 = ':f';
    let bad3 = 'b';
    let matching2 = ':a';

    expect(track.test(good4, 'block')).toBe(true);
    expect(track.test(good5, 'block')).toBe(true);
    expect(track.test(bad3, 'block')).toBe(false);
    expect(track.match(matching2, 'block').match).toBe('a');

    let illFormedSchema = String.raw`
      @bad
      ||
      or any a to z
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('section 3.3.6: after', () => {
    let schema = String.raw`
      @post
      ||
      any a to z
        times forever
          after (,)
      ||

      @post_block
      ||
      any a to z
        times forever
          after {
            (,)
            any whitespace
            }
      ||
    `;

    const track = new Track(schema);

    let good = 'a,b,c,d';
    let good2 = 'f';
    let bad = 'a,c,de';
    let bad2 = 'x.y.z';

    expect(track.match(good, 'post').match).toBe(good);
    expect(track.match(good2, 'post').match).toBe(good2);
    expect(track.match(bad, 'post').match).toBe('a,c,d');
    expect(track.match(bad2, 'post').match).toBe('x');

    let good3 = 'a, b, c,\td';
    let good4 = 'p';
    let bad3 = 'a,c,d';
    let bad4 = 'x y, z';

    expect(track.match(good3, 'post_block').match).toBe(good3);
    expect(track.match(good4, 'post_block').match).toBe(good4);
    expect(track.match(bad3, 'post_block').match).toBe('a');
    expect(track.match(bad4, 'post_block').match).toBe('x');

    let illFormedSchema = String.raw`
      @bad
      ||
      any a to z
        after (,)
      ||
    `;

    let illFormedSchema2 = String.raw`
      @bad
      ||
      after any digit
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
    expect(() => new Track(illFormedSchema2)).toThrow();
  });

  test('section 3.3.8: not prefix', () => {
    let schema = String.raw`
      @no_match
      ||
      (a)
      not {
        (!) as exclam
        (?)
        }
      any a to z, !, ? as text
        times forever
      ||

      @position
      ||
      not {
        (a)
        any b to z
        }
      ||
    `;

    const track = new Track(schema);

    let good = 'a!b!?';
    let bad = 'a!?b';

    expect(track.match(good, 'no_match').match).toBe(good);
    expect(track.match(good, 'no_match').collected.exclam).toBeUndefined();
    expect(track.match(good, 'no_match').collected.text).toBe('!b!?');
    expect(track.test(bad, 'no_match')).toBe(false);

    let testText = 'aa';
    track.test(testText, 'position');
    expect(track.lastIndex).toBe(0);

    let illFormedSchema = String.raw`
      @bad
      ||
      (b)
      optionally not (a)
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('section 3.4.1: as identifier', () => {
    let schema = String.raw`
      @collect
      ||
      any a to z as let_ter
      any digit as number
        times forever
      ||
    `;

    let track = new Track(schema);

    let good = 'g253';
    expect(track.match(good, 'collect').collected.let_ter).toBe('g');
    expect(track.match(good, 'collect').collected.number).toBe('253');

    let illFormedSchema = String.raw`
      @bad
      ||
      any a to z as my!
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('section 3.4.2: same identifier in multiple places', () => {
    let schema = String.raw`
      @collect
      ||
      any a to z as ident
      any digit as ident
        times forever
      ||
    `;

    let track = new Track(schema);

    let good = 'x90002';
    expect(track.match(good, 'collect').collected.ident).toBe(good);
  });

  test('section 3.4.3: no collected when no match', () => {
    let schema = String.raw`
      @collect
      ||
      any a to z as ident
      any digit as ident
        times forever
      ||
    `;

    let track = new Track(schema);

    let bad = 'g';
    expect(track.match(bad, 'collect')).toBeNull();
  });

  test('section 3.4.4: multiple identifiers', () => {
    let schema = String.raw`
      @collect
      ||
      {
        any digit, x as num
          times 1 to 3
            after (.)
        } as complete
      ||
    `;

    let track = new Track(schema);

    let good = '3.7.1';
    expect(track.match(good, 'collect').collected.num).toBe('371');
    expect(track.match(good, 'collect').collected.complete).toBe('3.7.1');
  });

  test('sections 3.5.1-2, 3.5.4: blocks', () => {
    let schema = String.raw`
      @blocks
      ||
      optionally {
        any a to z
        }

      { any a to z }
      ||

      @blocks2
      ||
      {
        (?)
        {
          (!)
          {
            (.)
            }
          }
        }
      ||
    `;

    let track = new Track(schema);
    expect(track.parser.tree.tree).toMatchSnapshot();

    let illFormedSchema = String.raw`
      @bad
      ||
      any a to z {
        (.)
        }
      ||
    `;

    let illFormedSchema2 = String.raw`
      @bad
      ||
      any a to z
        {
        times forever
          }
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
    expect(() => new Track(illFormedSchema2)).toThrow();
  });

  test('section 3.5.3: closing blocks', () => {
    let schema = String.raw`
      @good
      ||
      {
        any digit}

      {
        any a to z
        } as this
      ||
    `;

    let track = new Track(schema);
    expect(track.parser.tree.tree).toMatchSnapshot();

    let illFormedSchema = String.raw`
      @good
      ||
      {
        any digit
        any } a to z
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });

  test('section 3.5.5: no empty blocks', () => {
    let illFormedSchema = String.raw`
      @good
      ||
      { }
      ||
    `;

    expect(() => new Track(illFormedSchema)).toThrow();
  });
});
