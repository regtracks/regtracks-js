/**
 * Track object for RegTracks. Copyright 2019 James Thistlewood.
 */

const Parser = require('./parser');
const types = require('./treeTypes');


class Track {
  constructor(schema) {
    this.parser = new Parser(schema);
    this.tree = this.parser.tree.tree;

    this.lastIndex = 0;

    this.at = -1;
    this.ch = '';
    this.string = undefined;
    this.options = {};

    this.collected = {};

    this.matches = {};

    this.regex = {
      digit: /[0-9]/,
      variableInReplacement: /\$\(([a-z0-9_]+)\)/ig,
    };
  }

  /**
   * Throw an error.
   *
   * @param message the error message
   */
  error(message) {
    let error = Error(message);
    error.name = 'RegTracks runtime error';
    throw error;
  }

  /**
   * Move on one character in the string.
   *
   * @param config the config object
   */
  next(config) {
    // Store character if needed
    for (let ident of config.collection) {
      if (!this.collected[ident]) {
        this.collected[ident] = '';
      }
      this.collected[ident] += this.ch;
    }
    this.at += 1;
    this.ch = this.string[this.at];

    return this.ch;
  }

  /**
   * Go back to the last set checkpoint, and discard any matches made since then.
   */
  windback(checkpoint) {
    this.at = checkpoint.pos;
    this.ch = this.string[this.at];
    this.collected = {};

    for (let ident in checkpoint.collected) {
      this.collected[ident] = checkpoint.collected[ident];
    }

    return this.ch;
  }

  /**
   * Set a checkpoint at the current position.
   */
  setCheckpoint() {
    let checkpoint = {
      pos: this.at,
      collected: {},
    };

    for (let ident in this.collected) {
      checkpoint.collected[ident] = this.collected[ident];
    }

    return checkpoint;
  }

  /**
   * Verify that a symbol with a given name exists.
   *
   * @param name the symbol identifier
   * @param type (optional) the type that the value under the symbol should be
   */
  verifySymbolExists(name, type) {
    if (!this.tree.hasOwnProperty(name)) {
      this.error(`Symbol '${name}' does not exist`);
    }

    if (this.tree[name].type !== type) {
      let typeName;
      switch (type) {
        case types.PATTERN:
          typeName = 'a pattern';
          break;
        case types.CHARSET:
          typeName = 'a character set';
          break;
        default:
          typeName = type;
          break;
      }
      this.error(`Symbol ${name} is not ${typeName}`);
    }
  }

  /**
   * Find matches in a string. Returns a match object or null.
   *
   * @param string the string in which to find matches
   * @param entryPoint the pattern to use during matching
   * @param options the options object
   * @param variables the object of variables
   */
  match(string, entryPoint, options, variables) {
    return this.genericMatch(false, string, entryPoint, variables, options);
  }

  /**
   * Tests for matches in a string. Returns a boolean.
   *
   * @param string the string in which to find matches
   * @param entryPoint the pattern to use during matching
   * @param options the options object
   * @param variables the object of variables
   */
  test(string, entryPoint, options, variables) {
    return this.genericMatch(true, string, entryPoint, variables, options);
  }

  /**
   * Replaces matches in a string with the provided replacement string.
   * Note: the option `global` defaults to true when using this function.
   *
   * @param string the string in which to find matches
   * @param entryPoint the pattern to use during matching
   * @param replacementString the string with which to replace matches
   * @param options the options object
   * @param variables the object of variables
   */
  replace(string, entryPoint, replacementString, options, variables) {
    options = {
      global: true,
      ...(options || {})
    };

    const replacements = [];
    let match;
    while (match = this.genericMatch(false, string, entryPoint, variables, options)) {
      const newMatch = {
        pos: match.index,
        length: match.match.length,
        collected: match.collected,
      };


      if (replacements.length > 0) {
        let last = replacements[replacements.length - 1];
        if (last.pos + last.length > newMatch.pos) {
          continue;
        }
      }

      replacements.push(newMatch);

      if (!this.options.global) {
        break;
      }
    }

    // Ordered by pos, so loop backwards
    for (let i = replacements.length - 1; i > -1; --i) {
      const replacement = replacements[i];
      let replaceWith = replacementString;
      let match;
      while (match = this.regex.variableInReplacement.exec(replacementString)) {
        if (!replacement.collected.hasOwnProperty(match[1])) {
          continue;
        }
        replaceWith = replaceWith.replace(match[0], replacement.collected[match[1]]);
      }
      string = string.slice(0, replacement.pos) + replaceWith + string.slice(replacement.pos + replacement.length, string.length);
    }

    return string;
  }

  /**
   * Actions to perform before parsing a string.
   */
  preparse(string, entryPoint, variables, options) {
    this.string = string;
    this.matches = {};
    this.variables = variables || {};
    this.collected = {};

    const defaultOptions = {
      global: false,
    };

    // Spread defaults and user options to overwrite defaults
    this.options = {
      ...defaultOptions,
      ...(options || {}),
    };

    if (!this.options.global) {
      this.lastIndex = 0;
    }

    this.verifySymbolExists(entryPoint, types.PATTERN);
  }

  /**
   * Generically match a string using the schema.
   *
   * @param {*} test whether this is a test or a match
   */
  genericMatch(test, string, entryPoint, variables, options) {
    if (!entryPoint) {
      // Use default entry point
      entryPoint = 0;
      try {
        this.verifySymbolExists(entryPoint, types.PATTERN);
      } catch {
        this.error('Must provide an entry point');
      }
    }

    this.preparse(string, entryPoint, variables, options);

    let pattern = this.tree[entryPoint];
    let startPoint = this.lastIndex;
    let success = false;
    while (startPoint < this.string.length) {
      // Init the index and current char
      this.at = startPoint;
      this.ch = this.string[this.at];

      // Try to parse the entry point pattern
      let status = this.pattern(pattern);

      // Save matches
      if (status && !test) {
        for (let ident in this.collected) {
          this.matches[ident] = this.collected[ident];
        }
      }

      // Save the location of the character after the last match if we matched,
      // or from the next character on if we didn't.
      if (status) {
        this.lastIndex = this.at;
        success = true;
        break;
      } else {
        startPoint += 1;
      }
    }

    if (!success) {
      this.lastIndex = 0;
    }

    if (test) {
      return success;
    } else {
      if (success) {
        return {
          match: this.string.slice(startPoint, this.at),
          index: startPoint,
          collected: this.matches,
        };
      } else {
        return null;
      }
    }
  }

  pattern(pattern, config) {
    let newConfig = {
      collection: config ? config.collection : [],
    };

    // Move into block matching
    let status = this.block(pattern.root, newConfig);

    return status;
  }

  repeat(repeat, config, func, ...args) {
    let matched = 0;
    let times = repeat.times;
    let lastAfterCheckpoint;
    while (true) {
      let status = func.apply(this, args);
      if (status) {
        matched += 1;
        if (matched === times[1]) {
          return true;
        }

        if (repeat.after) {
          let afterStatus;
          // Set a checkpoint before we parse 'after'
          lastAfterCheckpoint = this.setCheckpoint();

          afterStatus = this.genericRule(repeat.after, config);

          // With 'after', we only attempt to match. So, if there is no match, go back
          // to where we started.
          if (!afterStatus) {
            this.windback(lastAfterCheckpoint);

            // Only end repeat matching if the after rule wasn't matched and
            // wasn't optional.
            if (!repeat.after.optional) {
              break;
            }
          }
        }
      } else {
        // Reset back to before 'after', because we didn't match
        if (lastAfterCheckpoint) {
          this.windback(lastAfterCheckpoint);
        }
        break;
      }
    }

    return ((matched >= times[0]) && (matched <= times[1] || times[1] === -1));
  }

  block(block, config) {
    let newConfig = {
      collection: block.collectionIdent ? config.collection.concat(block.collectionIdent) : config.collection,
    };

    let checkpoint = this.setCheckpoint();

    let status = true;
    for (let child of block.children) {
      if (!status && !child.forks) {
        // Early exit: if the last rule didn't succeed and this rule doesn't fork from the last one,
        // end without success.
        this.windback(checkpoint);
        return false;
      }

      // Skip this rule if it forks from the last one, but the last one succeeded
      if (status && child.forks) {
        continue;
      }

      status = this.genericRule(child, newConfig);

      // We always succeed if the rule is optional
      if (!status && child.optional) {
        status = true;
      }
    }

    // In case this block was optional, wind back to where we started if the block didn't match
    if (!status) {
      this.windback(checkpoint);
    }

    return status;
  }

  genericRule(rule, config) {
    let status;
    let checkpoint;

    if (rule.notMatch) {
      checkpoint = this.setCheckpoint();
    }

    if (rule.type === types.RLMATCH || rule.type === types.PATTERNREF) {
      if (rule.repeat) {
        status = this.repeat(rule.repeat, config, this.rule, rule, config);
      } else {
        status = this.rule(rule, config);
      }
    } else if (rule.type === types.BLOCK) {
      if (rule.repeat) {
        status = this.repeat(rule.repeat, config, this.block, rule, config);
      } else {
        status = this.block(rule, config);
      }
    }

    // If this rule/block was a negative match, then reset and invert the status
    if (rule.notMatch) {
      this.windback(checkpoint);
      status = !status;
    }

    return status;
  }

  rule(rule, config) {
    let newConfig = {
      collection: rule.collectionIdent ? config.collection.concat(rule.collectionIdent) : config.collection,
    };

    if (rule.type === types.RLMATCH) {
      return this.matchingRule(rule, newConfig);
    } else if (rule.type === types.PATTERNREF) {
      this.verifySymbolExists(rule.name, types.PATTERN);
      return this.pattern(this.tree[rule.name], newConfig);
    }
  }

  matchingRule(rule, config) {
    // Optimization and fix: if there is an end matching rule, check it now so we don't have problems
    // with a null character.
    if (!this.ch) {
      if (rule.matches[0].type === types.CRITENDPOINT && rule.matches[0].matches === 'end') {
        return true;
      } else {
        return false;
      }
    }

    if (rule.inclusive) {
      return this.inclusiveMatchingRule(rule, config);
    } else {
      return this.exclusiveMatchingRule(rule, config);
    }
  }

  inclusiveMatchingRule(rule, config) {
    for (let criterion of rule.matches) {
      let status = this.criterion(criterion, config);
      if (status) {
        return true;
      }
    }

    return false;
  }

  exclusiveMatchingRule(rule, config) {
    let checkpoint = this.setCheckpoint();
    for (let criterion of rule.matches) {
      let status = this.criterion(criterion, config);
      this.windback(checkpoint);
      if (status) {
        return false;
      }
    }

    // TODO think about this. What happens if a none charset includes a literal with n characters
    // but there is also a single char? If we succeed, do we end up at one character on or n characters on?
    // For now, stick with one character. Consider making this part of the spec.
    this.next(config);
    return true;
  }

  criterion(criterion, config) {
    if (criterion.type === types.CRITLITERAL || criterion.type === types.CRITVARIABLE) {
      let matches;
      if (criterion.type === types.CRITVARIABLE) {
        matches = this.collected[criterion.matches] || this.variables[criterion.matches];
        if (!matches) {
          this.error(`No variable '${criterion.matches}' provided`);
        }
      } else {
        matches = criterion.matches;
      }

      let checkpoint = this.setCheckpoint();
      let success = true;
      for (let i = 0; i < matches.length; i++) {
        if (this.ch !== matches[i]) {
          success = false;
          break;
        }
        this.next(config);
      }

      if (!success) {
        this.windback(checkpoint);
      }

      return success;
    } else if (criterion.type === types.CRITRANGE) {
      let success = criterion.matches.test(this.ch);
      if (success) {
        this.next(config);
      }
      return success;
    } else if (criterion.type === types.CRITSYMBOL) {
      // Try to handle special sets first
      let symName = criterion.matches;
      if (symName === 'anything') {
        if (this.ch !== '\n') {
          this.next(config);
          return true;
        }
      } else if (symName === 'space') {
        if (this.ch === ' ') {
          this.next(config);
          return true;
        }
      } else if (symName === 'digit') {
        if (this.regex.digit.test(this.ch)) {
          this.next(config);
          return true;
        }
      } else if (symName === 'whitespace') {
        if (this.ch <= ' ') {
          this.next(config);
          return true;
        }
      } else {
        this.verifySymbolExists(symName, types.CHARSET);
        return this.charset(this.tree[symName], config);
      }
      return false;
    } else if (criterion.type === types.CRITENDPOINT) {
      if (criterion.matches === 'start') {
        if (this.at === 0) {
          // we don't advance with start
          return true;
        }
      } else if (criterion.matches === 'end') {
        if (!this.ch) {
          // we don't advance with end
          return true;
        }
      }
      return false;
    }

    this.error('Unhandled criterion!');
  }

  charset(charset, config) {
    for (let criterion of charset.matches) {
      let status = this.criterion(criterion, config);
      if (status) {
        return true;
      }
    }

    return false;
  }
}

module.exports = Track;
