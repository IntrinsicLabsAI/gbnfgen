import ts from "typescript";

import { createInMemoryCompilerHost } from "./inMemoryHost.js";


// Visit the program and actually instantiate all of the values there instead.
class ProgramVisitor {

}

const host = createInMemoryCompilerHost();


const sourceCode = `
enum TransactionType {
    // Simple enums and other types
    DEBIT = "DEBIT",
    CREDIT = "CREDIT",
}

interface Transaction {
   /** Unique identifier of the transaction */
   txn_id: string;
   /** Amount of the transaction */
   txn_amount: number;
   /** Sender ID */
   sender_id: string;
   /** Recipient ID */
   recipient_id: string;
   /** Time that the transaction was submitted, as a Unix Epoch millisecond timestamp.  * 
   submit_ts: number;
   txn_type: TransactionType;
}

 `;

host.addSource("types.ts", sourceCode);

const program = ts.createProgram(["types.ts"], {}, host);

console.log("diagnostics:");
program.getDeclarationDiagnostics().forEach(diag => {
    console.log(diag);
});
console.log("end diagnostics:");
const checker = program.getTypeChecker();


const srcFile = ts.createSourceFile(
  "source.ts",
  sourceCode,
  ts.ScriptTarget.ESNext
);

// Process an InterfaceDeclaration AST
function processInterface(iface: ts.InterfaceDeclaration): void {
  console.log(`${iface.name.text}`);
  iface.forEachChild((child) => {
    if (ts.isIdentifier(child)) {
      console.log(`ID: ${child.text}`);
    } else if (ts.isPropertySignature(child)) {
      // Why are the comments not being parsed?
      const commentRanges = ts.getLeadingCommentRanges(srcFile.text, child.pos);
      const comment =
        commentRanges?.length &&
        srcFile
          .getFullText()
          .substring(commentRanges[0].pos, commentRanges[0].end);
      console.log(
        JSON.stringify({
          name: child.name.getText(srcFile),
          type: child.type!.getText(srcFile),
          comment,
        })
      );
    } else if (ts.isPropertyDeclaration(child)) {
      console.log("PROPERTY:", child.type!);
    } else {
      console.log(child.kind);
    }
  });
}

function process(node: ts.Node, indentation: number): void {
  const indent = " ".repeat(indentation);
  console.log(`${indent}${ts.SyntaxKind[node.kind]}`);
  node.forEachChild((child) => process(child, indentation + 1));
}

function processEnum(enumDecl: ts.EnumDeclaration): void {
  enumDecl.forEachChild((child) => {
    if (ts.isIdentifier(child)) {
        console.log("ENUM: " + child.text);
    } else if (ts.isEnumMember(child)) {
        console.log(" MEMBER: name=" + child.name.getText(srcFile) + " INIT=" + (child.initializer?.getText(srcFile) || "none"));
    }
  });
}

// Generate an identifer enum for this stuff here.

// Be able to generate the bnf grammar notation file from the inputs.
// Once we have the file we need to process it instead.

srcFile.forEachChild((node) => {
  if (ts.isInterfaceDeclaration(node)) {
    processInterface(node);
//   } else if (ts.isEnumDeclaration(node)) {
//     processEnum(node);
  } else {
    process(node, 0);
  }

  if (ts.isEnumDeclaration(node)) {
    processEnum(node);
  }
});
