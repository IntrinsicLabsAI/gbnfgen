import {
  Grammar,
  GrammarElement,
  RuleReference,
  charPattern,
  literal,
  sequence,
  serializeGrammar,
} from "./grammar.js";
import { Interface, InterfaceProperty, PropertyType } from "./compiler.js";

// Create a new grammar type that can be used to extract shit from this other shit


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


export function toGrammar(iface: Interface): Grammar {
  const ws: GrammarElement = {
    identifier: "ws",
    alternatives: [charPattern(/[ \t\n]*/g)],
  };

  const stringElem: GrammarElement = {
    identifier: "string",
    alternatives: [
      sequence(
        literal(`"`),
        charPattern(/([^"]*)/g),
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
    alternatives: [
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
