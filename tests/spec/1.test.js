const Track = require('../../index');

describe('tests section 1 of the specification', () => {
  test('section 1.1: unicode', () => {
    let schema = String.raw`
    @foobar
    ||
    any Ϣ, ח, ඐ, a, b, c, (䔘䬨)
    or (䰅䰅䰅)
    ||
    `;

    const track = new Track(schema);

    expect(track.parser.tree.tree).toMatchSnapshot();
  });
});
