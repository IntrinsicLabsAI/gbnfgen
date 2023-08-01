import ts, { InterfaceDeclaration } from "typescript";
import {
  Grammar,
  GrammarElement,
  GrammarRule,
  RuleReference,
  charPattern,
  group,
  literal,
  reference,
  sequence,
  serializeGrammar,
} from "./grammar.js";
import { ElementIdentifier } from "./grammarTest.js";

function toElementId(ifaceName: string): ElementIdentifier {
  const pattern = /[^a-zA-Z0-9]/g;
  return ifaceName.replace(pattern, "");
}

const WS_ELEM: GrammarElement = {
  identifier: "ws",
  alternatives: [charPattern(/[ \t\n]*/g)],
};

const STRING_ELEM: GrammarElement = {
  identifier: "string",
  alternatives: [sequence(literal(`"`), charPattern(/([^"]*)/g), literal(`"`))],
};
const NUMBER_ELEM: GrammarElement = {
  identifier: "number",
  alternatives: [
    sequence(
      charPattern(/[0-9]+/g),
      charPattern(/"."?/g),
      charPattern(/[0-9]*/g)
    ),
  ],
};
const STRING_REF = reference(STRING_ELEM.identifier);
const NUMBER_REF = reference(NUMBER_ELEM.identifier);
const WS_REF: RuleReference = reference(WS_ELEM.identifier);
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
const STRINGLIST_REF = reference(STRINGLIST_ELEM.identifier);
const NUMBERLIST_REF = reference(NUMBERLIST_ELEM.identifier);

export function toGrammar(iface: Interface): Grammar {
  function propertyRules(prop: InterfaceProperty): Array<GrammarRule> {
    const { name, type } = prop;
    let typeRef: RuleReference;
    switch (type) {
      case "string":
        typeRef = STRING_REF;
        break;
      case "number":
        typeRef = NUMBER_REF;
        break;
      case "Array<string>":
        typeRef = STRINGLIST_REF;
        break;
      case "Array<number>":
        typeRef = NUMBERLIST_REF;
        break;
      default:
        typeRef = reference(toElementId(type.reference));
        break;
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
  // console.dir(ifaceElem.alternatives[0]);

  return {
    elements: [ifaceElem],
  };
}

// Parameterized list of things
export type PropertyType =
  | "string"
  | "number"
  | "Array<string>"
  | "Array<number>"
  | { reference: string };

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

function baseGrammar(): Grammar {
  return {
    elements: [
      STRING_ELEM,
      WS_ELEM,
      NUMBER_ELEM,
      STRINGLIST_ELEM,
      NUMBERLIST_ELEM,
    ],
  };
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

function handleInterface(
  iface: InterfaceDeclaration,
  srcFile: ts.SourceFile,
  declaredTypes: Set<string>,
  typeChecker: ts.TypeChecker
): Interface {
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
    if (propType === "string") {
      propTypeValidated = "string";
    } else if (propType === "number") {
      propTypeValidated = "number";
    } else if (propType === "Array<string>" || propType === "string[]") {
      propTypeValidated = "Array<string>";
    } else if (propType === "Array<number>" || propType === "number[]") {
      const type = typeChecker.getTypeAtLocation(child.type!);
      // console.log(`TYPE: ${type}`);
      propTypeValidated = "Array<number>";
    } else if (declaredTypes.has(propType)) {
      propTypeValidated = { reference: propType };
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

  // Run the compiler to ensure that the
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

  let declaredTypes: Set<string> = new Set();
  srcFile.forEachChild((child) => {
    if (ts.isInterfaceDeclaration(child)) {
      declaredTypes.add(child.name.getText(srcFile));
    }
  });

  if (!declaredTypes.has(rootType)) {
    throw new Error(
      `Root type ${rootType} is not one of the declared types ${declaredTypes}`
    );
  }

  const grammar = baseGrammar();

  srcFile.forEachChild((child) => {
    if (ts.isInterfaceDeclaration(child)) {
      const iface = handleInterface(
        child,
        srcFile,
        declaredTypes,
        program.getTypeChecker()
      );
      const ifaceGrammar = toGrammar(iface);
      grammar.elements.unshift(...ifaceGrammar.elements);
    }
  });

  grammar.elements.unshift({
    identifier: "root",
    alternatives: [reference(toElementId(rootType))],
  });

  return grammar;
}
