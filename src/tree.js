/**
 * AST for RegTracks JS parser. Copyright 2019 James Thistlewood.
 */

const types = require('./treeTypes');

const RESERVED_SYMBOLS = [
  'after',
  'as',
  'any',
  'anything',
  'digit',
  'end',
  'forever',
  'none',
  'not',
  'optionally',
  'or',
  'space',
  'start',
  'times',
  'to',
  'whitespace',
];

/**
 * The tree's format can be found by looking at how objects are created. Each object
 * has a type. Some objects have children. Others have values. Some have other things.
 */

class Tree {
  constructor() {
    this.tree = {};
    this.current = {
      charset: undefined,
      pattern: undefined,
      block: undefined,
      rule: undefined,
      repeat: undefined,
    };

    this.lastUnnamed = -1;
  }

  /**
   * Print the tree in debuggable JSON form. Should only be used when finished, or after an error,
   * because certain elements are deleted.
   */
  dump() {
    for (let patternName in this.tree) {
      this.removeParents(this.tree[patternName].root);
    }
    console.log(JSON.stringify(this.tree, null, 4));
  }

  /**
   * Debug only. Remove a block's parents so that the tree is no longer circular.
   *
   * @param obj the object to try to remove parents from
   */
  removeParents(obj) {
    if (obj && obj.type === types.BLOCK) {
      obj.parent = undefined;
      for (let child of obj.children) {
        this.removeParents(child);
      }
    }
  }

  /**
   * Assert that a condition is truthy.
   *
   * @param condition the condition that must evaluate as truthy to pass
   * @param message (optional) the message to use when throwing an error
   */
  assert(condition, message) {
    if (!condition) {
      let error = Error(message || 'An assertion condition was not met');
      error.name = 'RegTracks internal error';
      // this.dump(); // TODO remove before prod
      throw error;
    }
  }

  /**
   * Semantically not different to `assert`, but more readable
   */
  assertExists(obj) {
    this.assert(obj);
  }

  /**
   * Check if a symbol name is valid when defined.
   *
   * @param name the symbol name
   */
  isValidSymbolName(name) {
    return !RESERVED_SYMBOLS.includes(name) && this.tree[name] === undefined;
  }

  /**
   * Add a pattern to the top level of the tree.
   *
   * @param name (optional) the pattern name as determined by a symbol
   */
  addPattern(name) {
    if (!name) {
      this.lastUnnamed += 1;
      name = this.lastUnnamed.toString();
    }

    let pattern = {
      type: types.PATTERN,
      name,
      root: undefined,
    };

    this.tree[name] = pattern;
    this.current.pattern = pattern;
    this.current.charset = undefined;
    this.current.rule = undefined;
    this.current.block = undefined;
    this.current.repeat = undefined;

    // Add a root-level block so that everything is easily contained
    this.addBlock();
  }

  /**
   * Add a block to the current pattern or, if in a block, the current block.
   *
   * @param forks (optional, default `false`) whether this block can be matched instead of the previous rule/block.
   * @param optional (optional, default `false`) whether this block is optional and can be skipped
   * @param afterRepeat (optional, default `false`) whether this block comes after the `after` keyword
   * @param notMatch (optional, default `false`) whether this block must not be matched for parsing to continue
   */
  addBlock(forks = false, optional = false, afterRepeat = false, notMatch = false) {
    this.assertExists(this.current.pattern);
    let block = {
      type: types.BLOCK,
      parent: this.current.block,
      children: [],
      repeat: undefined,
      forks,
      optional,
      notMatch,
      collectionIdent: undefined,
    };


    if (afterRepeat) {
      this.assertExists(this.current.repeat);
      this.assert(forks === false, 'After block cannot fork');
      this.current.repeat.after = block;
    } else if (this.current.block) {
      if (this.current.block.children.length === 0) {
        this.assert(forks === false, 'First rule in block cannot fork');
      }
      this.current.block.children.push(block);
    } else {
      this.assert(forks === false, 'First rule in pattern cannot fork');

      // Base case: add a block to the pattern root
      this.current.pattern.root = block;
    }

    this.current.block = block;
    this.current.rule = undefined;
    this.current.repeat = undefined;
  }

  endBlock() {
    this.assertExists(this.current.block);
    this.assert(this.current.block.children.length > 0, 'Must be at least one matching rule in block');
    this.current.block = this.current.block.parent;
    this.current.rule = undefined;
    this.current.repeat = undefined;
  }

  /**
   * Add a reference to another pattern in the schema as a rule
   *
   * @param name the symbol name
   * @param forks (optional, default `false`) whether this pattern can be used alternatively to the last rule/block
   * @param optional (optional, default `false`) whether this pattern is optional and can be skipped
   * @param afterRepeat (optional, default `false`) whether this pattern comes after the `after` keyword
   * @param notMatch (optional, default `false`) whether this block must not be matched for parsing to continue
   */
  addPatternReference(name, forks = false, optional = false, afterRepeat = false, notMatch = false) {
    this.assertExists(this.current.block);

    let ref = {
      type: types.PATTERNREF,
      name,
      forks,
      optional,
      notMatch,
      repeat: undefined,
      collectionIdent: undefined,
    };

    if (afterRepeat) {
      this.assertExists(this.current.repeat);
      this.assert(forks === false, 'After pattern cannot fork');
      this.current.repeat.after = ref;
    } else {
      if (this.current.block.children.length === 0) {
        this.assert(forks === false, 'First rule in block cannot fork');
      }
      this.current.block.children.push(ref);
    }
    this.current.rule = ref;
    this.current.repeat = undefined;
  }

  /**
   * Add a 'matching' rule to the current pattern/block.
   *
   * @param forks (optional, default `false`) whether this rule can be used alternatively to the last rule/block
   * @param optional (optional, default `false`) whether this rule is optional and can be skipped
   * @param isInclusive (optional, default `true`) if not a literal, whether the set
   *  is an 'any' (inclusive) set, or a 'none' set.
   * @param afterRepeat (optional, default `false`) whether this block comes after the `after` keyword
   * @param notMatch (optional, default `false`) whether this block must not be matched for parsing to continue
   */
  addMatchingRule(forks = false, optional = false, isInclusive = true, afterRepeat = false, notMatch = false) {
    this.assertExists(this.current.block);

    let match = {
      type: types.RLMATCH,
      inclusive: isInclusive,
      forks,
      optional,
      notMatch,
      matches: [],
      repeat: undefined,
      collectionIdent: undefined,
    };

    if (afterRepeat) {
      this.assertExists(this.current.repeat);
      this.assert(forks === false, 'After pattern cannot fork');
      this.current.repeat.after = match;
    } else {
      if (this.current.block.children.length === 0) {
        this.assert(forks === false, 'First rule in block cannot fork');
      }
      this.current.block.children.push(match);
    }
    this.current.rule = match;
    this.current.repeat = undefined;
  }

  /**
   * Add a criterion to the last matching rule added, or if a charset came last, the last charset.
   *
   * @param type the type of criterion
   * @param value the value of the criterion. For literals/chars, this should be a string, for ranges a regexp
   *  object, and for symbols just a string with the symbol identifier. For endpoints, it should be
   * one of the strings 'start' or 'end'.
   */
  addMatchingCriterion(type, value) {
    let criterion = {
      type,
      matches: value,
    };

    if (this.current.rule) {
      this.assert(this.current.rule.type === types.RLMATCH);
      this.current.rule.matches.push(criterion);
    } else if (this.current.charset) {
      this.assert(!(type === types.CRITSYMBOL && value === this.current.charset.name), 'Cannot include charset in itself');
      this.current.charset.matches.push(criterion);
    } else {
      this.assert(false);
    }
  }

  /**
   * Specify that the last rule or block (depending on what came last) should be collected under an identifier.
   *
   * @param collectionIdent the name to collect matches to this rule under
   */
  collectAs(collectionIdent) {
    this.assertExists(this.current.block);

    if (this.current.rule) {
      this.current.rule.collectionIdent = collectionIdent;
    } else {
      let children = this.current.block.children;
      let lastChild = children[children.length - 1];
      this.assert(lastChild.type === types.BLOCK);
      lastChild.collectionIdent = collectionIdent;
    }
  }

  /**
   * Add a repeat modification to the last rule or block, depending on whichever came last.
   *
   * @param times how to repeat. Should be an array of [start, end]. Use [-1, -1] for `forever`.
   */
  addModRepeat(times) {
    this.assertExists(this.current.block);
    let children = this.current.block.children;
    let lastChild = children[children.length - 1];

    let repeatObj = {
      type: types.MODREPEAT,
      times,
      after: undefined,
    };

    this.assert(lastChild.type === types.BLOCK || lastChild.type === types.RLMATCH || lastChild.type === types.PATTERNREF, 'Repeat invalid in this position');

    let final = this.findFinalRuleWithNoRepeat(lastChild);

    this.assert(final, 'Cannot repeat a repeat');

    this.assert(!final.notMatch, 'Cannot repeat a negative match');

    final.repeat = repeatObj;
    this.current.repeat = repeatObj;
  }

  /**
   * Traverse a rule-repeat-after tree to find the final rule that has no repeat.
   *
   * @param rule the rule object
   */
  findFinalRuleWithNoRepeat(rule) {
    if (!rule.repeat) {
      return rule;
    } else if (rule.repeat.after) {
      return this.findFinalRuleWithNoRepeat(rule.repeat.after);
    } else {
      return null;
    }
  }

  /**
   * Add a charset to the root tree. Items can be added with `addCharsetCriterion`.
   *
   * @param name the symbol name to assign to this charset
   */
  addCharset(name) {
    this.current.pattern = undefined;
    this.current.block = undefined;
    this.current.rule = undefined;
    this.current.repeat = undefined;

    let charset = {
      type: types.CHARSET,
      name,
      matches: [],
    }

    this.tree[name] = charset;
    this.current.charset = charset;
  }
}

module.exports = Tree;
