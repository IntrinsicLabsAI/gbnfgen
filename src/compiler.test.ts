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
boolean ::= "true" | "false"
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
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`);
});

test("Jsonformer car example", () => {
  const grammar = compile(
    `
  interface CarAndOwner {
    car: Car;
    owner: Owner;
  }
    
  interface Car {
    make: string;
    model: string;
    year: number;
    colors: string[];
    features: Features;
  }
  
  interface Owner {
    firstName: string;
    lastName: string;
    age: number;
  }
  
  interface Features {
    audio: AudioFeature;
    safety: SafetyFeature;
    performance: PerformanceFeature;
  }
  
  interface AudioFeature {
    brand: string;
    speakers: number;
    hasBluetooth: boolean;
  }
  
  interface SafetyFeature {
    airbags: number;
    parkingSensors: number;
    laneAssist: number;
  }
  
  interface PerformanceFeature {
    engine: string;
    horsepower: number;
    topSpeed: number;
  }`,
    "CarAndOwner"
  );

  expect(serializeGrammar(grammar).trimEnd()).toEqual(
    String.raw`
root ::= CarAndOwner
PerformanceFeature ::= "{"   ws   "\"engine\":"   ws   string   ","   ws   "\"horsepower\":"   ws   number   ","   ws   "\"topSpeed\":"   ws   number   "}"
PerformanceFeaturelist ::= "[]" | "["   ws   PerformanceFeature   (","   ws   PerformanceFeature)*   "["
SafetyFeature ::= "{"   ws   "\"airbags\":"   ws   number   ","   ws   "\"parkingSensors\":"   ws   number   ","   ws   "\"laneAssist\":"   ws   number   "}"
SafetyFeaturelist ::= "[]" | "["   ws   SafetyFeature   (","   ws   SafetyFeature)*   "["
AudioFeature ::= "{"   ws   "\"brand\":"   ws   string   ","   ws   "\"speakers\":"   ws   number   ","   ws   "\"hasBluetooth\":"   ws   boolean   "}"
AudioFeaturelist ::= "[]" | "["   ws   AudioFeature   (","   ws   AudioFeature)*   "["
Features ::= "{"   ws   "\"audio\":"   ws   AudioFeature   ","   ws   "\"safety\":"   ws   SafetyFeature   ","   ws   "\"performance\":"   ws   PerformanceFeature   "}"
Featureslist ::= "[]" | "["   ws   Features   (","   ws   Features)*   "["
Owner ::= "{"   ws   "\"firstName\":"   ws   string   ","   ws   "\"lastName\":"   ws   string   ","   ws   "\"age\":"   ws   number   "}"
Ownerlist ::= "[]" | "["   ws   Owner   (","   ws   Owner)*   "["
Car ::= "{"   ws   "\"make\":"   ws   string   ","   ws   "\"model\":"   ws   string   ","   ws   "\"year\":"   ws   number   ","   ws   "\"colors\":"   ws   stringlist   ","   ws   "\"features\":"   ws   Features   "}"
Carlist ::= "[]" | "["   ws   Car   (","   ws   Car)*   "["
CarAndOwner ::= "{"   ws   "\"car\":"   ws   Car   ","   ws   "\"owner\":"   ws   Owner   "}"
CarAndOwnerlist ::= "[]" | "["   ws   CarAndOwner   (","   ws   CarAndOwner)*   "["
string ::= "\""   ([^"]*)   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`.trim()
  );
});
