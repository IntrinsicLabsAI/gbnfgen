import {
  Grammar,
  GrammarElement,
  GrammarRule,
  RuleCharRange,
  RuleLiteral,
  RuleReference,
  RuleSequence,
  serializeGrammar,
} from "./grammar.js";

// Create a new grammar type that can be used to extract shit from this other shit

// Parameterized list of things
type PropertyType = "string" | "number" | "Array<string>" | "Array<number>";

interface InterfaceProperty {
  name: string;
  type: PropertyType;
}

interface Interface {
  name: string;
  properties: Array<InterfaceProperty>;
}

// Grammar rules are either patterns, or sequences of strings.
// If we have a char range then that would indicate the set of valid formats we can use here...etc.

const iface: Interface = {
  name: "ResumeApplicant",
  properties: [
    {
      name: "applicantName",
      type: "string",
    },
    {
      name: "applicantYearsOfExperience",
      type: "number",
    },
  ],
};

function literal(value: string): RuleLiteral {
  return {
    type: "literal",
    literal: value,
  };
}

function charPattern(value: string): RuleCharRange {
  return {
    type: "char-range",
    range: value,
  };
}

function sequence(...values: Array<GrammarRule>): RuleSequence {
  return {
    type: "sequence",
    rules: values,
  };
}

export function toGrammar(iface: Interface): Grammar {
  const ws: GrammarElement = {
    identifier: "ws",
    rules: [charPattern(`([ \\t\\n] ws)?`)],
  };

  const stringElem: GrammarElement = {
    identifier: "string",
    rules: [
      sequence(
        literal(`"`),
        charPattern(`([^"]*)`),
        literal(`"`)
      ),
    ],
  };

  const stringRef: RuleReference = {
    type: "reference",
    referee: stringElem.identifier,
  };

  const wsRef: RuleReference = {
    type: "reference",
    referee: "ws",
  };
  const root: GrammarElement = {
    identifier: "root",
    rules: [
      sequence(
        literal("{"),
        wsRef,
        literal(`"applicantName":`),
        wsRef,
        stringRef,
        wsRef,
        literal("}")
      ),
    ],
  };

  return {
    elements: [root, ws, stringElem],
  };
}

// Array of some other type of object that we've already defined here instead...etc.
// If this is a reference to another type that we've declared, we should be able to make references at will instead.

const grammar = toGrammar({
  name: "DeliveryInformation",
  properties: [
    {
      name: "tracking_number",
      type: "string",
    },
    {
      name: "status",
      type: "string",
    },
    {
      name: "weight",
      type: "string",
    },
    {
      name: "submitted_ts",
      type: "number",
    },
  ],
});

console.log(serializeGrammar(grammar));
