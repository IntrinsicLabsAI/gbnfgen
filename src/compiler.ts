import ts, { InterfaceDeclaration, EnumDeclaration } from "typescript";
import {
  Grammar,
  GrammarElement,
  GrammarRule,
  RuleReference,
  group,
  literal,
  reference,
  sequence,
} from "./grammar.js";

import {
  toElementId,
  toListElementId,
  WS_REF,
  getDefaultGrammar,
  GrammarRegister,
  registerToGrammar,
} from "./util.js";

// Turn interface properties into Grammar References
export function toGrammar(iface: Interface): Grammar {
  function propertyRules(prop: InterfaceProperty): Array<GrammarRule> {
    const { name, type } = prop;
    let typeRef: RuleReference;

    // TODO: Throw exception error if grammar type not found ?
    if (typeof type === "string") {
      typeRef = reference(type);
    } else if (type.isArray) {
      typeRef = reference(toListElementId(type.reference));
    } else {
      typeRef = reference(toElementId(type.reference));
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
export type PropertyType = string | { reference: string; isArray: boolean };

export interface InterfaceProperty {
  name: string;
  type: PropertyType;
}

export interface Interface {
  name: string;
  properties: Array<InterfaceProperty>;
}

interface InMemoryCompilerHost extends ts.CompilerHost {
  addSource(fileName: string, code: string): ts.SourceFile;
}

class InMemoryCompilerHostImpl implements InMemoryCompilerHost {
  private files: Map<string, ts.SourceFile> = new Map<string, ts.SourceFile>();

  addSource(fileName: string, code: string) {
    if (this.files.has(fileName)) {
      throw new Error(`File already exists: ${fileName}`);
    }
    const srcFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext);
    this.files.set(fileName, srcFile);
    return srcFile;
  }

  getSourceFile = (fileName: string): ts.SourceFile | undefined => {
    return this.files.get(fileName);
  };
  getDefaultLibFileName = () => "lib.d.ts";
  writeFile = () => {
    // Do nothing.
  };
  getCurrentDirectory = () => ".";
  getCanonicalFileName = (fileName: string) => fileName;
  useCaseSensitiveFileNames = () => true;
  getNewLine = () => `\n`;
  fileExists = (fileName: string) => this.files.has(fileName);
  readFile = (fileName: string) => {
    return this.files.get(fileName)?.getFullText();
  };
}

export function createInMemoryCompilerHost(): InMemoryCompilerHost {
  return new InMemoryCompilerHostImpl();
}

function handleEnum(enumNode: EnumDeclaration): GrammarElement {
  // Get all the choices of the enum
  const choices: GrammarRule[] = [];
  if (enumNode && enumNode.members) {
    for (const member of enumNode.members) {
      // NOTE(aduffy): support union type literals as well.
      if (ts.isEnumMember(member) && ts.isIdentifier(member.name)) {
        // If initializer is String, we use the string value. Else, we assume a numeric value.
        if (!member.initializer || !ts.isStringLiteral(member.initializer)) {
          throw new Error(
            "Only string enums are supported. Please check the String enums section of the TypeScript Handbook at https://www.typescriptlang.org/docs/handbook/enums.html"
          );
        }
        choices.push(literal(member.initializer.text, true));
      }
    }
  }

  return { identifier: enumNode.name.text, alternatives: choices };
}

function handleInterface(
  iface: InterfaceDeclaration,
  srcFile: ts.SourceFile,
  declaredTypes: Set<string>,
  register: GrammarRegister
): Interface {
  // Support array versions of each of the required types as well.
  const declaredArrayTypes: Map<string, string> = new Map();
  for (const declType of declaredTypes) {
    declaredArrayTypes.set(`${declType}[]`, declType);
  }

  if (iface.typeParameters) {
    throw new Error(
      `${iface.name.getText(srcFile)}: interfaces cannot have type parameters`
    );
  }
  const ifaceName = iface.name.getText(srcFile);
  const props: Array<InterfaceProperty> = [];
  for (const child of iface.members) {
    if (!ts.isPropertySignature(child)) {
      throw new Error(
        `Invalid interface member: interfaces must only contain properties, contained ${child}`
      );
    }
    const propName = child.name.getText(srcFile);
    const propType = child.type?.getText(srcFile) ?? "never";

    // Validate one of the accepted types
    let propTypeValidated: PropertyType;
    if (register.has(propType)) {
      propTypeValidated = propType;
    } else if (propType === "string[]" || propType === "Array<string>") {
      propTypeValidated = "stringlist";
    } else if (propType === "number[]" || propType === "Array<number>") {
      propTypeValidated = "numberlist";
    } else if (declaredTypes.has(propType)) {
      propTypeValidated = { reference: propType, isArray: false };
    } else if (declaredArrayTypes.has(propType)) {
      const baseType = declaredArrayTypes.get(propType)!;
      propTypeValidated = { reference: baseType, isArray: true };
    } else {
      throw new Error(
        `Failed validating parameter ${propName}: unsupported type ${propType}`
      );
    }
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
 * Main compilation function, targeting {@link Grammar} type from raw TypeScript interface source code.
 * @param source
 * @returns
 */
export function compile(source: string, rootType: string): Grammar {
  const host = createInMemoryCompilerHost();

  const srcFile = host.addSource("source.ts", source);
  const program = ts.createProgram({
    rootNames: ["source.ts"],
    options: {
      ...ts.getDefaultCompilerOptions(),
      // TODO(aduffy): Turn this back on to force failure on compile/type-checking errors.
      // noEmitOnError: true,
    },
    host,
  });

  // Get the default Grammar Register
  const register = getDefaultGrammar();

  // Run the compiler to ensure that the typescript source file is correct.
  const emitResult = program.emit();
  if (emitResult.diagnostics.length > 0) {
    const errors = emitResult.diagnostics
      .filter((diag) => diag.category === ts.DiagnosticCategory.Error)
      .map((err) => err.messageText)
      .join("\n");
    throw new Error(
      `Compilation or provided TypeScript source failed: ${errors}`
    );
  }

  // Find all the declared interfaces and enums.
  let declaredTypes: Set<string> = new Set();
  srcFile.forEachChild((child) => {
    if (ts.isInterfaceDeclaration(child)) {
      declaredTypes.add(child.name.getText(srcFile));
    }

    // Add the Enum to Grammar Register
    if (ts.isEnumDeclaration(child)) {
      declaredTypes.add(child.name.getText(srcFile));
    }
  });

  // Reject when the root type is not found
  if (!declaredTypes.has(rootType)) {
    throw new Error(
      `Root type ${rootType} is not one of the declared types ${declaredTypes}`
    );
  }

  // Import default grammar rules
  const grammar: Grammar = {
    elements: [...registerToGrammar(register)],
  };

  srcFile.forEachChild((child) => {
    if (ts.isInterfaceDeclaration(child)) {
      const iface = handleInterface(child, srcFile, declaredTypes, register);
      const ifaceGrammar = toGrammar(iface);
      grammar.elements.unshift(...ifaceGrammar.elements);
    } else if (ts.isEnumDeclaration(child)) {
      const enumGrammar = handleEnum(child);
      grammar.elements.unshift(enumGrammar);
    }
  });

  grammar.elements.unshift({
    identifier: "root",
    alternatives: [reference(toElementId(rootType))],
  });

  return grammar;
}
