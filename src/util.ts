import {
  GrammarElement,
  GrammarRule,
  RuleReference,
  alternatives,
  charPattern,
  group,
  literal,
  reference,
  sequence,
} from "./grammar.js";

// ----- Default Grammar Register ----- //

const WS_ELEM: GrammarElement = {
  identifier: "ws",
  alternatives: [charPattern(/[ \t\n]*/g)],
};

const STRING_ELEM: GrammarElement = {
  identifier: "string",
  alternatives: [
    sequence(
      literal(`"`),
      group(
        sequence(alternatives(
          charPattern(/[^"\x7F\x00-\x1F]/g), // Anything that's not a control sequence
          sequence(
            literal(`\\`), // Escape sequences
            alternatives(
              charPattern(/["\\/bfnrt]/g), // WS escape sequences
              sequence( // Unicode escape sequences
                literal(`u`),
                sequence(
                  charPattern(/[0-9a-fA-F]/g),
                  charPattern(/[0-9a-fA-F]/g),
                  charPattern(/[0-9a-fA-F]/g),
                  charPattern(/[0-9a-fA-F]/g))))))),
        "star"),
      literal(`"`))
  ],
};
const BOOLEAN_ELEM: GrammarElement = {
  identifier: "boolean",
  alternatives: [
    literal(`true`),
    literal(`false`),
  ]
}
const NUMBER_ELEM: GrammarElement = {
  identifier: "number",
  alternatives: [
    sequence(
      group(sequence(literal(`-`)), "optional"),
      charPattern(/[0-9]+/g),
      charPattern(/"."?/g),
      charPattern(/[0-9]*/g)
    ),
  ],
};

export const STRING_REF = reference(STRING_ELEM.identifier);
export const NUMBER_REF = reference(NUMBER_ELEM.identifier);
export const WS_REF: RuleReference = reference(WS_ELEM.identifier);

const NUMBERLIST_ELEM: GrammarElement = {
  identifier: "numberlist",
  alternatives: [
    // Empty list
    sequence(literal(`[`), WS_REF, literal(`]`)),

    // Non-empty list
    sequence(
      literal(`[`),
      WS_REF,
      STRING_REF,
      group(sequence(literal(`,`), WS_REF, NUMBER_REF), "star"),
      WS_REF,
      literal(`]`)
    ),
  ],
};
const STRINGLIST_ELEM: GrammarElement = {
  identifier: "stringlist",
  alternatives: [
    // Empty list
    sequence(literal(`[`), WS_REF, literal(`]`)),

    // Non-empty list
    sequence(
      literal(`[`),
      WS_REF,
      STRING_REF,
      group(sequence(literal(`,`), WS_REF, STRING_REF), "star"),
      WS_REF,
      literal(`]`)
    ),
  ],
};


export type GrammarRegister = Map<string, Array<GrammarRule>>;

/**
 * Create the default grammar element register.
 * Enables Enum add to the register when compiling the source file.
 * @returns The Default Grammar Element Register
 */
export function getDefaultGrammar(): GrammarRegister {
  const register = new Map<string, Array<GrammarRule>>();
  
  register.set(STRING_ELEM.identifier, STRING_ELEM.alternatives);
  register.set(BOOLEAN_ELEM.identifier, BOOLEAN_ELEM.alternatives);
  register.set(WS_ELEM.identifier, WS_ELEM.alternatives);
  register.set(NUMBER_ELEM.identifier, NUMBER_ELEM.alternatives);
  register.set(STRINGLIST_ELEM.identifier, STRINGLIST_ELEM.alternatives);
  register.set(NUMBERLIST_ELEM.identifier, NUMBERLIST_ELEM.alternatives);
  return register;
}

export function registerToGrammar(register: GrammarRegister): Array<GrammarElement> {
  return Array.from(register.entries()).map(([identifier, alternatives]) => ({ identifier, alternatives }));
}

// ----- Element Identifier Helpers ----- //
type ElementIdentifier = string;

export function toElementId(ifaceName: string): ElementIdentifier {
  const pattern = /[^a-zA-Z0-9]/g;
  return ifaceName.replace(pattern, "");
}

export function toListElementId(ifaceName: string): ElementIdentifier {
  return `${toElementId(ifaceName)}list`;
}