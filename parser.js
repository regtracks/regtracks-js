/**
 * Parser for RegTracks. Copyright 2019 James Thistlewood.
 */

const Tree = require('./tree');
const types = require('./treeTypes');

function escapeRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}


class Parser {
  constructor(schema) {
    this.schema = schema;
    this.at = 0;
    this.ch = this.schema[this.at];

    this.tree = new Tree();

    this.lastSymbolName = undefined;
    this.optional = false;
    this.afterRepeat = false;
    this.forks = false;

    this.regex = {
      charsetAccept: /[^[\]{}()#@$]/,
      symbolAccept: /[a-zA-Z0-9_]/,
      literalAccept: /[^[\]{}()#\\@$]/,
    }

    this.parse();
  }

  error(message) {
    // Find the start and end of the line
    let start = 0;
    let end = -1;
    for (let i = this.at - 1; ; i--) {
      if (this.schema[i] == '\n' || i == -1) {
        start = i + 1;
        break;
      }
    }
    for (let i = this.at; ; i++) {
      if (this.schema[i] == '\n' || !this.schema[i]) {
        end = i;
        break;
      }
    }

    // Give a precise indication of where the error occurred
    let line = this.schema.slice(start, end);
    let offset = this.at - start + 1;

    message += '\n\n';
    message += line + '\n';
    message += Array(offset).join(' ') + '^';
    message += '\nAt character ' + this.at;

    let e = Error(message);
    e.name = 'RegTracks syntax error';

    // this.tree.dump();
    throw e;
  }

  /**
   * Reset the prefix flags to their initial values.
   */
  resetPrefixFlags() {
    this.optional = false;
    this.afterRepeat = false;
    this.forks = false;
  }

  /**
   * Check that the prefix flags are set in a valid configuration, and throw an error
   * if this is not the case.
   */
  verifyPrefixFlags() {
    // After repeat and forks are mutually exclusive
    if (this.afterRepeat && this.forks) {
      this.error('Cannot use after and or in conjunction');
    }
  }

  /**
   * Skip any whitespace excluding newlines - don't use this if
   * whitespace is important in a context.
   */
  whitespace() {
    while (this.ch && this.ch <= ' ' && this.ch !== '\n') {
      this.next();
    }
  }

  /**
   * Skip any whitespace _including_ newlines. Only to be used in contexts where newlines
   * don't have any significance.
   */
  allSpace() {
    while (this.ch && this.ch <= ' ') {
      this.next();
    }
  }

  /**
   * If possible, skip over any whitespace and comments to the end of the line. After execution
   * returns from this function, the parser will be left at a newline.
   */
  skipToEndOfLine() {
    this.whitespace();
    switch (this.ch){
      case '#':
        this.comment();
        break;
      case '\n':
        break;
      default:
        this.error('Unexpected character');
    }
  }

  /**
   * Parse a symbol name and store it temporarily.
   */
  symbol() {
    this.next('@');

    if (this.lastSymbolName) {
      this.error('Cannot define symbol here');
    }

    let name = '';
    while (this.ch && this.regex.symbolAccept.test(this.ch)) {
      name += this.ch;
      this.next();
    }

    if (name.length < 2) {
      this.error('Symbol name must be at least 2 characters long');
    }

    if (!isNaN(name[0])) {
      this.error('Symbol cannot begin with a number');
    }

    if (!this.tree.isValidSymbolName(name)) {
      this.error('Symbol name is not allowed (either reserved or previously defined)');
    }

    // Allow whitespace
    this.skipToEndOfLine();
    this.lastSymbolName = name;
    this.lineEnd();
  }

  /**
   * Parse a pattern.
   */
  pattern() {
    this.next('|');
    this.next('|');

    this.skipToEndOfLine();

    switch (this.ch) {
      case '\n':
        this.tree.addPattern(this.lastSymbolName);
        // Make sure to clear the symbol so we don't define it twice
        this.lastSymbolName = undefined;
        this.lineEnd();
        break;
      default:
        this.error('Unexpected character');
    }

    // Loop over all the rules inside the pattern.
    let doEnd = false;
    while (this.ch && !doEnd) {
      this.allSpace();

      switch (this.ch) {
        case '|':
          // A pipe delimits the end of a pattern
          this.next();
          this.next('|');
          this.skipToEndOfLine();
          doEnd = true;
          break;

        case '#':
          this.skipToEndOfLine();
          this.lineEnd();
          break;

        default:
          this.rule();
      }
    }
  }

  /**
   * Parse a rule.
   */
  rule() {
    let symbolName = '';

    let success = false;
    // Skip empty lines
    while (this.ch) {
      this.whitespace();
      if (this.ch === '#') {
        this.comment();
      }

      if (this.ch !== '\n') {
        break;
      }
      this.lineEnd();
    }

    while (this.ch) {
      switch (this.ch) {
        case '#':
          this.comment();
          break;
        case '(':
          this.tree.addMatchingRule(this.forks, this.optional, true, this.afterRepeat);
          this.resetPrefixFlags();
          this.literal();
          success = true;
          break;
        case '{':
          if (success) {
            this.error('Cannot open block after rule on same line');
          }
          this.block();
          success = true;
          break;
        case '}':
          success = true;
          break;
        case ' ':
        case '\n':
          break;
        default:
          if (this.regex.symbolAccept.test(this.ch)) {
            symbolName += this.ch;
            this.next();
          } else {
            this.error('Unexpected character');
          }
      }

      if ((this.ch === ' ' || this.ch === '\n') && symbolName) {
        if (success && symbolName.toLowerCase() !== 'as') {
          // We already have added a rule this line, so this is invalid
          this.error('Invalid rule (too many symbols)');
        }

        switch (symbolName.toLowerCase()) {
          case 'or':
            this.forks = true;
            this.verifyPrefixFlags();
            this.next();
            break;
          case 'optionally':
            this.optional = true;
            this.verifyPrefixFlags();
            this.next();
            break;
          case 'after':
            this.afterRepeat = true;
            this.verifyPrefixFlags();
            this.next();
            break;
          case 'any':
            this.tree.addMatchingRule(this.forks, this.optional, true, this.afterRepeat);
            this.resetPrefixFlags();
            this.next();
            this.charset();
            success = true;
            break;
          case 'none':
            this.tree.addMatchingRule(this.forks, this.optional, false, this.afterRepeat);
            this.resetPrefixFlags();
            this.next();
            this.charset();
            success = true;
            break;
          case 'times':
            if (this.optional || this.afterRepeat || this.forks) {
              this.error('Cannot apply prefix to repeat rule');
            }
            this.next();
            this.repeatRule();
            success = true;
            break;
          case 'as':
            if (!success) {
              this.error('Collection must come after a rule');
            }
            this.suffix();
            break;
          case 'start':
          case 'end':
            this.tree.addMatchingRule(this.forks, this.optional, true, this.afterRepeat);
            this.tree.addMatchingCriterion(types.CRITENDPOINT, symbolName.toLowerCase());
            this.resetPrefixFlags();
            success = true;
            break;
          default:
            this.tree.addPatternReference(symbolName, this.forks, this.optional, this.afterRepeat);
            this.resetPrefixFlags();
            success = true;
            // no need to advance on, whitespace will deal with anything else
            break;
        }
        symbolName = '';
      }

      this.whitespace();
      if (this.ch === '\n' || this.ch === '}') {
        // Either a newline or close block means this rule has ended
        break;
      }
    }

    if (!success) {
      this.error('Invalid rule');
    }

    if (this.ch === '\n') {
      this.lineEnd();
    }
  }

  /**
   * Parse a range of numbers/`forever` and add a repetition rule to the tree.
   */
  repeatRule() {
    const digitMatch = /[\d]/;
    if (this.ch === 'f') {
      this.next();
      this.next('o');
      this.next('r');
      this.next('e');
      this.next('v');
      this.next('e');
      this.next('r');

      this.tree.addModRepeat([1, -1]);
    } else if (digitMatch.test(this.ch)) {
      let start = this.ch;
      while (this.ch) {
        this.next();
        if (digitMatch.test(this.ch)) {
          start += this.ch;
        } else {
          break;
        }
      }

      start = parseInt(start);
      if (start < 1) {
        this.error('Start must be greater than 0');
      }

      if (this.ch !== ' ') {
        this.tree.addModRepeat([start, start]);
        // Early exit
        return;
      }

      this.next(' ');

      // Try to parse whitespace. If we end up at a different character to the one we left off at,
      // then end parsing of the repetition.
      let currentChar = this.ch;
      this.whitespace();
      if (currentChar !== this.ch) {
        this.tree.addModRepeat([start, start]);
        // Another early exit
        return;
      }

      this.next('t');
      this.next('o');
      this.next(' ');

      let end;
      if (this.ch === 'f') {
        // The keyword `forever` is allowed as an endpoint
        this.next();
        this.next('o');
        this.next('r');
        this.next('e');
        this.next('v');
        this.next('e');
        this.next('r');

        end = -1;
      } else if (digitMatch.test(this.ch)) {
        end = this.ch;
        while (this.ch) {
          this.next();
          if (digitMatch.test(this.ch)) {
            end += this.ch;
          } else {
            break;
          }
        }
        end = parseInt(end);
      } else {
        this.error('Invalid range');
      }

      if (start > end && end !== -1) {
        this.error('Start of range cannot be greater than end');
      }

      this.tree.addModRepeat([start, end]);
    } else {
      this.error('Invalid range');
    }
  }

  /**
   * Parse a literal (contained inside brackets)
   */
  literal() {
    // TODO: allow letiables
    this.next('(');

    let literal = '';
    let variable;

    while (this.ch) {
      if (this.ch === ')') {
        this.next();
        break;
      }

      if (this.ch === '$' && !variable) {
        variable = this.variable();
        this.next(')');
        break;
      }

      if (this.regex.literalAccept.test(this.ch)) {
        literal += this.ch;
        this.next();
      } else if (this.ch === '\\') {
        literal += this.escaped();
        this.next();
      } else {
        this.error('Character must be escaped in literal');
      }
    }

    if (literal) {
      this.tree.addMatchingCriterion(types.CRITLITERAL, literal);
    } else if (variable) {
      this.tree.addMatchingCriterion(types.CRITVARIABLE, variable);
    } else {
      this.error('Must be at least one character inside literal brackets');
    }
  }

  variable() {
    this.next('$');
    let name = '';

    while (this.ch) {
      if (this.regex.symbolAccept.test(this.ch)) {
        name += this.ch;
      } else {
        return name;
      }
      this.next();
    }
  }

  /**
   * Parse a charset, either coming after an `any` or `none` rule or on its own.
   */
  charset() {
    // Purposefully doesn't include backslash
    while (this.ch) {
      this.whitespace();

      // Parse the current element
      this.charsetElement();

      // Finish off this element of the charset
      this.whitespace();
      if (this.ch !== ',') {
        // Only continue if there is a comma, otherwise let the invoking function deal with the rest
        // of the line
        break;
      }
      this.next(',');
    }
  }

  /**
   * Parse an item in a charset
   */
  charsetElement() {
    if (this.ch === '(') {
      this.literal();
    } else if (this.ch === '\n') {
      this.error('Invalid rule');
    } else if (this.regex.charsetAccept.test(this.ch)) {
      let char = this.ch;
      if (this.ch === '\\') {
        char = this.escaped();
      }

      this.next();
      if (this.ch === ' ') {
        this.next();

        if (this.ch === 't') {
          this.next('t');
          this.next('o');
          this.next(' ');

          if (!this.regex.charsetAccept.test(this.ch)) {
            this.error('Character must be escaped');
          }

          let char2 = this.ch;
          if (this.ch === '\\') {
            char2 = this.escaped();
          }

          if (char.charCodeAt(0) > char2.charCodeAt(0)) {
            // Swap around to make regex work
            let temp2 = char2;
            char2 = char;
            char = temp2;
          }

          let regex = RegExp(`[${escapeRegex(char)}-${escapeRegex(char2)}]`);
          this.tree.addMatchingCriterion(types.CRITRANGE, regex);
          this.next();
        } else {
          this.tree.addMatchingCriterion(types.CRITLITERAL, char);
        }
      } else if (this.regex.symbolAccept.test(char)) {
        // Parse a reference to a charset defined elsewhere
        let symbol = char;
        while (this.ch) {
          if (this.regex.symbolAccept.test(this.ch)) {
            symbol += this.ch;
          } else {
            // Any character that can't be in a symbol delimits the end of the symbol
            break;
          }
          this.next();
        }

        // if we've only parsed one character of a symbol, it must be a character literal
        if (symbol.length === 1) {
          this.tree.addMatchingCriterion(types.CRITLITERAL, symbol);
        } else {
          this.tree.addMatchingCriterion(types.CRITSYMBOL, symbol);
        }
      } else {
        this.tree.addMatchingCriterion(types.CRITLITERAL, char);
      }
    } else {
      this.error('Character must be escaped');
    }
  }

  /**
   * Get an escaped character.
   */
  escaped() {
    this.next('\\');

    const escapable = /[[\]{}()#\\@$utrn]/;
    if (escapable.test(this.ch)) {
      switch (this.ch) {
        case 'n':
          return '\n';
        case 't':
          return '\t';
        case 'r':
          return '\r';
        case 'u':
          let hex = '';
          const acceptableHex = /[a-f0-9]/i;
          for (let i = 0; i < 4; i++) {
            this.next();
            if (acceptableHex.test(this.ch)) {
              hex += this.ch;
            } else {
              this.error('Invalid unicode hex');
            }
          }
          return String.fromCharCode(parseInt(hex, 16));
        default:
          return this.ch;
      }
    } else {
      this.error('Tried to escape inescapable character');
    }
  }

  /**
   * Parse a block.
   */
  block() {
    this.tree.addBlock(this.forks, this.optional, this.afterRepeat);
    this.resetPrefixFlags();
    this.next('{');

    while (this.ch) {
      if (this.ch == '}') {
        this.tree.endBlock();
        this.next();
        this.whitespace();
        if (this.ch == 'a') {
          this.next();
          this.next('s');
          this.suffix();
          this.skipToEndOfLine();
        }
        // Execution now returns to where the block started
        break;
      } else {
        this.rule();
      }
    }
  }

  /**
   * Parse a suffix. This will return at a newline.
   *
   * Must be called after parsing `as` characters (i.e. at whitespace).
   */
  suffix() {
    this.next(' ');
    this.whitespace();

    let ident = '';
    while (this.ch) {
      if (this.regex.symbolAccept.test(this.ch)) {
        ident += this.ch;
        this.next();
      } else {
        break;
      }
    }

    this.tree.collectAs(ident);
  }

  lineEnd() {
    this.next('\n');
  }

  /**
   * Skip over a comment.
   */
  comment() {
    this.next('#');
    while (this.ch) {
      if (this.ch === '\n') {
        return;
      }
      this.next();
    }
  }

  /**
   * Begin parsing of the schema.
   */
  parse() {
    this.allSpace();

    while (this.ch) {
      switch (this.ch) {
        case '@':
          this.symbol();
          break;
        case '|':
          this.pattern();
          break;
        case '#':
          this.comment();
          break;
        default:
          if (this.lastSymbolName) {
            this.tree.addCharset(this.lastSymbolName);
            this.lastSymbolName = '';
            this.charset();
          } else {
            this.error('Unexpected character');
          }
      }

      // At this point, we should be outside any context, so it's ok to skip all space
      this.allSpace();
    }
  }

  /**
   * Advance the parser one character further through the schema.
   * Returns the new character.
   *
   * @param char (optional) the character that should be at the current position before moving on.
   */
  next(char) {
    if (char && char !== this.ch) {
      this.error(`Expected ${ JSON.stringify(char) }, found instead ${ JSON.stringify(this.ch) }`);
    }

    this.at += 1;
    this.ch = this.schema[this.at];
    return this.ch;
  }
}

module.exports = Parser;
