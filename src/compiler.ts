import { EnumDeclaration, InterfaceDeclaration, Project, ts } from "ts-morph";
import { alternatives, Grammar, GrammarElement, GrammarRule, group, literal, reference, sequence, } from "./grammar.js";

import {
  getDefaultGrammar,
  GrammarRegister,
  registerToGrammar,
  toElementId,
  toListElementId,
  WS_REF,
} from "./util.js";

// Turn interface properties into Grammar References
export function toGrammar(iface: Interface): Grammar {

  function inferReferenceRule(propType: PropertyType) {
    if (propType.type === "simple") {
      return reference(propType.name);
    }

    if (propType.type === "array") {
      return reference(toListElementId(propType.reference));
    }

    throw new Error(`Expected a simple or array type, received ${propType}`);
  }

  function propertyRules(prop: InterfaceProperty): Array<GrammarRule> {
    const { name, type } = prop;
    let typeRef: GrammarRule;

    if (type.type === "union") {
      typeRef = alternatives(
        ...type.refs.map(propType => inferReferenceRule(propType))
      );
    } else {
      typeRef = inferReferenceRule(type);
    }

    return [WS_REF, literal(`"${name}":`), WS_REF, typeRef];
  }

  let propertyElems: GrammarRule[] = [];
  for (const prop of iface.properties) {
    if (propertyElems.length > 0) {
      propertyElems.push(literal(`,`));
    }
    propertyElems.push(sequence(...propertyRules(prop)));
  }
  const ifaceRule = sequence(literal(`{`), ...propertyElems, literal(`}`));
  const ifaceElem: GrammarElement = {
    identifier: toElementId(iface.name),
    alternatives: [ifaceRule],
  };

  const ifaceListElem: GrammarElement = {
    identifier: toElementId(iface.name) + "list",
    alternatives: [
      // Empty list
      literal(`[]`),
      // Non-empty list
      sequence(
        literal(`[`),
        WS_REF,
        reference(ifaceElem.identifier),
        group(
          sequence(literal(`,`), WS_REF, reference(ifaceElem.identifier)),
          "star"
        ),
        literal(`]`)
      ),
    ],
  };

  return {
    elements: [ifaceElem, ifaceListElem],
  };
}

// Parameterized list of things
export type PropertyType =
  | { type: "simple", name: string }
  | { type: "array", reference: string }
  | { type: "union", refs: PropertyType[] };

export interface InterfaceProperty {
  name: string;
  type: PropertyType;
}

export interface Interface {
  name: string;
  properties: Array<InterfaceProperty>;
}

function handleEnum(enumNode: EnumDeclaration): GrammarElement {
  // Get all the choices of the enum
  const choices: GrammarRule[] = [];
  if (enumNode && enumNode.getMembers().length > 0) {
    for (const member of enumNode.getMembers()) {
      // NOTE(aduffy): support union type literals as well.
      if (member.isKind(ts.SyntaxKind.EnumMember)) {
        // If initializer is String, we use the string value. Else, we assume a numeric value.
        const initializer = member.getInitializer();
        if (!initializer || !initializer.isKind(ts.SyntaxKind.StringLiteral)) {
          throw new Error(
            "Only string enums are supported. Please check the String enums section of the TypeScript Handbook at https://www.typescriptlang.org/docs/handbook/enums.html"
          );
        }
        choices.push(literal(initializer.getText()));
      }
    }
  }

  return { identifier: enumNode.getName(), alternatives: choices };
}

/**
 * Infer {@link PropertyType} from a declared property name or set of property names.
 */
function inferPropType(
  register: Map<string, Array<GrammarRule>>,
  propType: string,
  declaredTypes: Set<string>,
  declaredArrayTypes: Map<string, string>,
  propName: string
): PropertyType {
  if (register.has(propType)) {
    return { type: "simple", name: propType };
  } else if (propType === "string[]" || propType === "Array<string>") {
    return { type: "simple", name: "stringlist" };
  } else if (propType === "number[]" || propType === "Array<number>") {
    return { type: "simple", name: "numberlist" };
  } else if (declaredTypes.has(propType)) {
    return { type: "simple", name: propType };
  } else if (declaredArrayTypes.has(propType)) {
    const baseType = declaredArrayTypes.get(propType)!;
    return { type: "array", reference: baseType };
  }

  throw new Error(
    `Failed validating parameter ${propName}: unsupported type ${propType}`
  );
}

function handleInterface(
  iface: InterfaceDeclaration,
  declaredTypes: Set<string>,
  register: GrammarRegister
): Interface {
  // Support array versions of each of the required types as well.
  const declaredArrayTypes: Map<string, string> = new Map();
  for (const declType of declaredTypes) {
    declaredArrayTypes.set(`${declType}[]`, declType);
    declaredArrayTypes.set(`Array<${declType}>`, declType);
  }

  if (iface.getTypeParameters().length > 0) {
    console.log(iface.getFullText());
    throw new Error(
      `${iface.getName()}: interfaces cannot have type parameters`
    );
  }
  const ifaceName = iface.getName();
  const props: Array<InterfaceProperty> = [];
  for (const child of iface.getMembers()) {
    if (!child.isKind(ts.SyntaxKind.PropertySignature)) {
      throw new Error(
        `Invalid interface member: interfaces must only contain properties, contained ${child}`
      );
    }
    const propName = child.getName();
    const propType = child.getType().getText();

    const unionTypes = (child.getType().isUnion() && !child.getType().isEnum() && !child.getType().isBoolean())
      ? child.getType().getUnionTypes().map(typ => typ.getText(child))
      : [];

    // Properties can either be simple singular types, or union types
    let propTypeValidated: PropertyType = unionTypes.length === 0
      ? inferPropType(register, propType, declaredTypes, declaredArrayTypes, propName)
      : {
        type: "union",
        refs: unionTypes.map(typ => inferPropType(register, typ, declaredTypes, declaredArrayTypes, propName))
      };

    props.push({
      name: propName,
      type: propTypeValidated,
    });
  }

  return {
    name: ifaceName,
    properties: props,
  };
}

/**
 * Async variant of main compilation function, targeting {@link Grammar} type from raw TypeScript interface source code.
 * @returns
 */
export async function compile(
  source: string,
  rootType: string
): Promise<Grammar> {
  return new Promise((resolve, reject) => {
    try {
      const grammar = compileSync(source, rootType);
      resolve(grammar);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Sync variant of main compilation function, targeting {@link Grammar} type from raw TypeScript interface source code.
 * @param source
 * @returns
 */
export function compileSync(source: string, rootType: string): Grammar {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      lib: ["lib.es5.d.ts"],
    },
  });

  // Import the file from local node_modules and import at build time.
  const srcFile = project.createSourceFile("source.ts", source);

  const emitResult = project.emitToMemory();

  // const emitResult = program.emit();
  const diagnostics = project
    .getPreEmitDiagnostics()
    .concat(emitResult.getDiagnostics());
  if (diagnostics.length > 0) {
    const errors = diagnostics
      .filter((diag) => diag.getCategory() === ts.DiagnosticCategory.Error)
      .map((err) => err.getMessageText())
      .join("\n");

    throw new Error(`Compilation failed: ${errors}`);
  }

  // Find all the declared interfaces and enums.
  let declaredTypes: Set<string> = new Set();
  srcFile.forEachChild((child) => {
    if (child.isKind(ts.SyntaxKind.InterfaceDeclaration)) {
      declaredTypes.add(child.getName());
    }

    // Add the Enum to Grammar Register
    else if (child.isKind(ts.SyntaxKind.EnumDeclaration)) {
      declaredTypes.add(child.getName());
    }
  });

  // Get the default Grammar Register
  const register = getDefaultGrammar();

  // Import default grammar rules
  const grammar: Grammar = {
    elements: [...registerToGrammar(register)],
  };

  srcFile.forEachChild((child) => {
    switch (child.getKind()) {
      case ts.SyntaxKind.InterfaceDeclaration:
        const iface = handleInterface(
          child as InterfaceDeclaration,
          declaredTypes,
          register
        );
        const ifaceGrammar = toGrammar(iface);
        grammar.elements.unshift(...ifaceGrammar.elements);
        break;
      case ts.SyntaxKind.EnumDeclaration:
        const enumGrammar = handleEnum(child as EnumDeclaration);
        grammar.elements.unshift(enumGrammar);
        break;
      case ts.SyntaxKind.EndOfFileToken:
      case ts.SyntaxKind.EmptyStatement:
        break;
      default:
        throw new Error(
          `Invalid top-level declaration of kind ${child.getKindName()}: ${child.getText()}`
        );
    }
  });

  // Reject when the root type is not found
  if (!declaredTypes.has(rootType)) {
    throw new Error(
      `Root type ${rootType} is not one of the declared types ${Array.from(
        declaredTypes.values()
      )}`
    );
  }

  grammar.elements.unshift({
    identifier: "root",
    alternatives: [reference(toElementId(rootType))],
  });

  return grammar;
}
