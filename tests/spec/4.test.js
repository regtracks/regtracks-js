const Track = require('../../index');

describe('tests section 4 of the specification', () => {
  test('section 4: comments', () => {
    let schema = String.raw`
    # this is a comment!
    @foobar   # this is a comment!
    ||        # this is a comment!
    any a to z, A to Z    # this is a comment!
    (\#)# this is a comment!
    ||# this is a comment!
    # this is a comment!
    # this is a comment!
    `;

    const track = new Track(schema);

    expect(track.parser.tree.tree).toMatchSnapshot();
  });
});
