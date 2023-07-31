import ts  from "typescript";

export interface InMemoryCompilerHost extends ts.CompilerHost {
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
