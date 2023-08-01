import ts, { InterfaceDeclaration } from "typescript";

// Parameterized list of things
export type PropertyType =
  | "string"
  | "number"
  | "Array<string>"
  | "Array<number>";

export interface InterfaceProperty {
  name: string;
  type: PropertyType;
}

export interface Interface {
  name: string;
  properties: Array<InterfaceProperty>;
}
interface InMemoryCompilerHost extends ts.CompilerHost {
  addSource(fileName: string, code: string): void;
}

class InMemoryCompilerHostImpl implements InMemoryCompilerHost {
  private files: Map<string, ts.SourceFile> = new Map<string, ts.SourceFile>();

  addSource(fileName: string, code: string) {
    if (this.files.has(fileName)) {
      throw new Error(`File already exists: ${fileName}`);
    }
    this.files.set(
      fileName,
      ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext)
    );
  }

  getSourceFile = (fileName: string): ts.SourceFile | undefined => {
    return this.files.get(fileName);
  };
  getDefaultLibFileName = () => "lib.d.ts";
  writeFile = () => {
    throw new Error("writeFile not implemented");
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

const HOST = createInMemoryCompilerHost();

const SVC = ts.createLanguageService({
  getDefaultLibFileName: () => "lib.d.ts",
  getCompilationSettings: () => ({}),
  getScriptFileNames: () => [],
  getScriptVersion: () => "0.1.0",
  getScriptSnapshot: () => undefined,
  getCurrentDirectory: () => ".",
  readFile: () => undefined,
  fileExists: () => true,
});

function handleInterface(
  iface: InterfaceDeclaration,
  srcFile: ts.SourceFile
): Interface {
  if (iface.typeParameters) {
    throw new Error(
      `${iface.name.getText(srcFile)}: interfaces cannot have type parameters`
    );
  }
  const ifaceName = iface.name.getText(srcFile);
  const props: Array<InterfaceProperty> = [];
  for (const child of iface.getChildren()) {
    if (ts.isPropertySignature(child)) {
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
        propTypeValidated = "Array<number>";
      } else {
        throw new Error(`Failed validating parameter ${propName}: unsupported type ${propType}`);
      }
      props.push({
        name: propName,
        type: propTypeValidated,
      });
    } else {
      // TODO(aduffy): Handle
    }
  }
  return {
    name: ifaceName,
    properties: props,
  }
}

// Add root.ts which must contain exactly one type that depends on the rest of the files.
// Have one specific type marked as the root type somehow...I think?

HOST.addSource("source.ts", ` interface Person { name: string; age: number; }`);

const program = ts.createProgram(["source.ts"], {}, HOST);
const checker = program.getTypeChecker();
for (const mod of checker.getAmbientModules()) {
  console.log("ambient module:", mod);
}
for (const srcFile of program.getSourceFiles()) {
  srcFile.forEachChild((child) => {
    if (ts.isInterfaceDeclaration(child)) {
    }
  });
}
