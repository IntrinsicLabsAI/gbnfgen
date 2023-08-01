export interface Grammar {
  elements: Array<GrammarElement>;
}

export interface GrammarElement {
  identifier: string;
  alternatives: Array<GrammarRule>;
}

export type GrammarRule =
  | RuleSequence
  | RuleGroup
  | RuleLiteral
  | RuleReference
  | RuleCharRange;

export interface RuleSequence {
  type: "sequence";
  rules: Array<GrammarRule>;
}

export interface RuleGroup {
  type: "group";
  rules: RuleSequence;
  optional: boolean;
}

export interface RuleLiteral {
  type: "literal";
  literal: string;
}

export interface RuleReference {
  type: "reference";
  referee: string;
}

export interface RuleCharRange {
  type: "char-range";
  pattern: RegExp;
}

// TODO(aduffy): Finish constrained char range DSL
// export enum CharRange {
//   SPACE = "space",
//   TAB = "tab",
//   NEWLINE = "newline",
//   ALPHA_LOWER = "alpha-lower",
//   ALPHA_UPPER = "alpha-upper",
//   DIGITS = "digits",
//   HEX_LETTERS = "hex-letters",
//   NOT_QUOTE = "not-quote",
// }

export function isSequence(rule: GrammarRule): rule is RuleSequence {
  return rule.type === "sequence";
}

export function isGroup(rule: GrammarRule): rule is RuleGroup {
  return rule.type === "group";
}

export function isLiteral(rule: GrammarRule): rule is RuleLiteral {
  return rule.type === "literal";
}

export function isReference(rule: GrammarRule): rule is RuleReference {
  return rule.type === "reference";
}

export function isCharRange(rule: GrammarRule): rule is RuleCharRange {
  return rule.type === "char-range";
}

function serializeRule(rule: GrammarRule): string {
  if (isSequence(rule)) {
    return serializeSequence(rule);
  } else if (isGroup(rule)) {
    return serializeGroup(rule);
  } else if (isLiteral(rule)) {
    return serializeLiteralRule(rule);
  } else if (isReference(rule)) {
    return serializeReference(rule);
  } else if (isCharRange(rule)) {
    return serializeCharRange(rule);
  }
  throw new Error(`Unknown rule ${rule}`);
}

function serializeSequence(rule: RuleSequence): string {
  return rule.rules.map(serializeRule).join("   ");
}

function serializeGroup(rule: RuleGroup): string {
  return `(${serializeSequence(rule.rules)})${rule.optional && "?"}`;
}

function serializeLiteralRule(rule: RuleLiteral): string {
  return JSON.stringify(rule.literal);
}

function serializeReference(rule: RuleReference): string {
  return rule.referee;
}

function serializeCharRange(rule: RuleCharRange): string {
    return rule.pattern.source;
}

export function serializeElement(
  grammarElement: GrammarElement,
  declaredTypes: Set<string>
) {
  if (!grammarElement.identifier.match(`^[a-zA-Z]+$`)) {
    throw new Error(
      `Rule name ${grammarElement.identifier} must match pattern [a-zA-Z] and cannot contain special characters`
    );
  }
  const invalidReferences = new Set(
    grammarElement.alternatives
      .filter(isReference)
      .map((referenceRule) => referenceRule.referee)
      .filter((ref) => !declaredTypes.has(ref))
  );
  if (invalidReferences.size > 0) {
    throw new Error(`Invalid references in ruleset: ${invalidReferences}`);
  }
  const rules = grammarElement.alternatives.map(serializeRule).join(`\n| `);
  return `${grammarElement.identifier} ::= ${rules}`;
}

export function serializeGrammar(grammar: Grammar): string {
  let out = "";
  const declaredTypes = new Set<string>(
    grammar.elements.map((elem) => elem.identifier)
  );
  grammar.elements.forEach((element) => {
    out += serializeElement(element, declaredTypes);
    out += "\n";
  });
  return out;
}

export function literal(value: string): RuleLiteral {
  return {
    type: "literal",
    literal: value,
  };
}

export function charPattern(pattern: RegExp): RuleCharRange {
  return {
    type: "char-range",
    pattern,
  };
}

export function sequence(...values: Array<GrammarRule>): RuleSequence {
  return {
    type: "sequence",
    rules: values,
  };
}
