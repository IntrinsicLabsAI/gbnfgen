import { expect, test } from "vitest";
import { baseGrammar, compile } from "./compiler.js";
import { Grammar, reference, serializeGrammar } from "./grammar.js";

test("Single interface generation", () => {
  const postalAddressGrammar = compile(
    `interface PostalAddress {
    streetNumber: number;
    street: string;
    city: string;
    state: string;
    postalCode: number;
  }`,
    "PostalAddress"
  );

  expect(serializeGrammar(postalAddressGrammar).trimEnd()).toEqual(
    String.raw`
root ::= PostalAddress
PostalAddress ::= "{"   ws   "\"streetNumber\":"   ws   number   ","   ws   "\"street\":"   ws   string   ","   ws   "\"city\":"   ws   string   ","   ws   "\"state\":"   ws   string   ","   ws   "\"postalCode\":"   ws   number   "}"
PostalAddresslist ::= "[]" | "["   ws   PostalAddress   (","   ws   PostalAddress)*   "["
string ::= "\""   ([^"]*)   "\""
ws ::= [ \t\n]*
number ::= [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`.trim()
  );
});

test("Single multiple interface with references generation", () => {
  const resumeGrammar = compile(
    `
  interface JobCandidate {
    name: string;
    jobs: WorkExperience[];
  }
  
  interface WorkExperience {
    company: string;
    jobTitle: string;
    startDate: string;
    endDate: string;
    skills: string[];
  }
  `,
    "JobCandidate"
  );

  expect(serializeGrammar(resumeGrammar).trimEnd())
    .toEqual(String.raw`root ::= JobCandidate
WorkExperience ::= "{"   ws   "\"company\":"   ws   string   ","   ws   "\"jobTitle\":"   ws   string   ","   ws   "\"startDate\":"   ws   string   ","   ws   "\"endDate\":"   ws   string   ","   ws   "\"skills\":"   ws   stringlist   "}"
WorkExperiencelist ::= "[]" | "["   ws   WorkExperience   (","   ws   WorkExperience)*   "["
JobCandidate ::= "{"   ws   "\"name\":"   ws   string   ","   ws   "\"jobs\":"   ws   WorkExperiencelist   "}"
JobCandidatelist ::= "[]" | "["   ws   JobCandidate   (","   ws   JobCandidate)*   "["
string ::= "\""   ([^"]*)   "\""
ws ::= [ \t\n]*
number ::= [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`);
});
