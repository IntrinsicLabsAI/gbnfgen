import { expect, test } from "vitest";
import { compile, compileSync } from "./compiler.js";
import { serializeGrammar } from "./grammar.js";

test("union types", () => {
  const grammar = compileSync(`
  interface Person {
    age: number[] | string[];
  }
  `, "Person"
  );

  expect(serializeGrammar(grammar).trimEnd()).toEqual(
    String.raw`
root ::= Person
Person ::= "{"   ws   "\"age\":"   ws   (  stringlist | numberlist  )   "}"
Personlist ::= "[]" | "["   ws   Person   (","   ws   Person)*   "]"
string ::= "\""   ((  [^"\x7F\x00-\x1F] | "\\"   (  ["\\/bfnrt] | "u"   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]  )  ))*   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= ("-")?   [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`.trim())
});

test("Single interface generation", () => {
  const postalAddressGrammar = compileSync(
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
PostalAddresslist ::= "[]" | "["   ws   PostalAddress   (","   ws   PostalAddress)*   "]"
string ::= "\""   ((  [^"\x7F\x00-\x1F] | "\\"   (  ["\\/bfnrt] | "u"   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]  )  ))*   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= ("-")?   [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`.trim()
  );
});

test("Single interface with enum generation", () => {
  const postalAddressGrammar = compileSync(
    `enum AddressType { Business = "business", Home = "home" };
    interface PostalAddress {
    streetNumber: number;
    type: AddressType;
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
PostalAddress ::= "{"   ws   "\"streetNumber\":"   ws   number   ","   ws   "\"type\":"   ws   AddressType   ","   ws   "\"street\":"   ws   string   ","   ws   "\"city\":"   ws   string   ","   ws   "\"state\":"   ws   string   ","   ws   "\"postalCode\":"   ws   number   "}"
PostalAddresslist ::= "[]" | "["   ws   PostalAddress   (","   ws   PostalAddress)*   "]"
AddressType ::= "\"business\"" | "\"home\""
string ::= "\""   ((  [^"\x7F\x00-\x1F] | "\\"   (  ["\\/bfnrt] | "u"   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]  )  ))*   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= ("-")?   [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"
`.trim()
  );
});

test("Single multiple interface with references generation", () => {
  const resumeGrammar = compileSync(
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
WorkExperiencelist ::= "[]" | "["   ws   WorkExperience   (","   ws   WorkExperience)*   "]"
JobCandidate ::= "{"   ws   "\"name\":"   ws   string   ","   ws   "\"jobs\":"   ws   WorkExperiencelist   "}"
JobCandidatelist ::= "[]" | "["   ws   JobCandidate   (","   ws   JobCandidate)*   "]"
string ::= "\""   ((  [^"\x7F\x00-\x1F] | "\\"   (  ["\\/bfnrt] | "u"   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]  )  ))*   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= ("-")?   [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`);
});

test("Single multiple interface and enum with references generation", () => {
  const resumeGrammar = compileSync(
    `
    // Define an enum for product categories
    enum ProductCategory {
      Electronics = "Electronics",
      Clothing = "Clothing",
      Food = "Food"
    }
    
    // Define an interface for representing a product
    interface Product {
      id: number;
      name: string;
      description: string;
      price: number;
      category: ProductCategory;
    }
    
    // Define an enum for order statuses
    enum OrderStatus {
      Pending = "Pending",
      Shipped = "Shipped",
      Delivered = "Delivered",
      Canceled = "Canceled"
    }
    
    // Define an interface for representing an order
    interface Order {
      orderId: number;
      products: Product[];
      status: OrderStatus;
      orderDate: string;
    }
  `,
    "Order"
  );

  expect(serializeGrammar(resumeGrammar).trimEnd()).toEqual(
    String.raw`
root ::= Order
Order ::= "{"   ws   "\"orderId\":"   ws   number   ","   ws   "\"products\":"   ws   Productlist   ","   ws   "\"status\":"   ws   OrderStatus   ","   ws   "\"orderDate\":"   ws   string   "}"
Orderlist ::= "[]" | "["   ws   Order   (","   ws   Order)*   "]"
OrderStatus ::= "\"Pending\"" | "\"Shipped\"" | "\"Delivered\"" | "\"Canceled\""
Product ::= "{"   ws   "\"id\":"   ws   number   ","   ws   "\"name\":"   ws   string   ","   ws   "\"description\":"   ws   string   ","   ws   "\"price\":"   ws   number   ","   ws   "\"category\":"   ws   ProductCategory   "}"
Productlist ::= "[]" | "["   ws   Product   (","   ws   Product)*   "]"
ProductCategory ::= "\"Electronics\"" | "\"Clothing\"" | "\"Food\""
string ::= "\""   ((  [^"\x7F\x00-\x1F] | "\\"   (  ["\\/bfnrt] | "u"   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]  )  ))*   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= ("-")?   [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"
`.trim()
  );
});

test("Jsonformer car example", () => {
  const grammar = compileSync(
    `
  // The car and owner
  interface CarAndOwner {

    /*
     The car component
     */
    car: Car;
    owner: Owner;
  }
    
  // The car
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
PerformanceFeaturelist ::= "[]" | "["   ws   PerformanceFeature   (","   ws   PerformanceFeature)*   "]"
SafetyFeature ::= "{"   ws   "\"airbags\":"   ws   number   ","   ws   "\"parkingSensors\":"   ws   number   ","   ws   "\"laneAssist\":"   ws   number   "}"
SafetyFeaturelist ::= "[]" | "["   ws   SafetyFeature   (","   ws   SafetyFeature)*   "]"
AudioFeature ::= "{"   ws   "\"brand\":"   ws   string   ","   ws   "\"speakers\":"   ws   number   ","   ws   "\"hasBluetooth\":"   ws   boolean   "}"
AudioFeaturelist ::= "[]" | "["   ws   AudioFeature   (","   ws   AudioFeature)*   "]"
Features ::= "{"   ws   "\"audio\":"   ws   AudioFeature   ","   ws   "\"safety\":"   ws   SafetyFeature   ","   ws   "\"performance\":"   ws   PerformanceFeature   "}"
Featureslist ::= "[]" | "["   ws   Features   (","   ws   Features)*   "]"
Owner ::= "{"   ws   "\"firstName\":"   ws   string   ","   ws   "\"lastName\":"   ws   string   ","   ws   "\"age\":"   ws   number   "}"
Ownerlist ::= "[]" | "["   ws   Owner   (","   ws   Owner)*   "]"
Car ::= "{"   ws   "\"make\":"   ws   string   ","   ws   "\"model\":"   ws   string   ","   ws   "\"year\":"   ws   number   ","   ws   "\"colors\":"   ws   stringlist   ","   ws   "\"features\":"   ws   Features   "}"
Carlist ::= "[]" | "["   ws   Car   (","   ws   Car)*   "]"
CarAndOwner ::= "{"   ws   "\"car\":"   ws   Car   ","   ws   "\"owner\":"   ws   Owner   "}"
CarAndOwnerlist ::= "[]" | "["   ws   CarAndOwner   (","   ws   CarAndOwner)*   "]"
string ::= "\""   ((  [^"\x7F\x00-\x1F] | "\\"   (  ["\\/bfnrt] | "u"   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]  )  ))*   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= ("-")?   [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`.trim()
  );
});

test("compiler errors", () => {
  expect(() =>
    compileSync(
      `
    interface failure {
      name: string;
      name: number;
    }
    `,
      "failure"
    )
  ).toThrowError(`Duplicate identifier 'name'.`);

  expect(() =>
    compileSync(
      `
    interface failure {
      name1: string;
      name2: myfaketype;
    }
    `,
      "failure"
    )
  ).toThrowError(`Compilation failed: Cannot find name 'myfaketype'.`);

  expect(() =>
    compileSync(
      `
      const failure = {};
    `,
      "failure"
    )
  ).toThrowError(
    `Invalid top-level declaration of kind VariableStatement: const failure = {};`
  );

  // TODO(aduffy): fix when TypeAliasDeclaration support has been added.
  expect(() =>
    compileSync(
      `
      type Person = string;
      interface failure {
        name: Person;
      }
    `,
      "failure"
    )
  ).toThrowError(
    `Invalid top-level declaration of kind TypeAliasDeclaration: type Person = string;`
  );
});

test("async", async () => {
  await expect(
    compile(
      `
    type Person = string;
    interface failure {
      name: Person;
    }
  `,
      "failure"
    )
  ).rejects.toThrow(
    "Invalid top-level declaration of kind TypeAliasDeclaration: type Person = string;"
  );

  const grammar = await compile(
    `
// The car and owner
interface CarAndOwner {

  /*
   The car component
   */
  car: Car;
  owner: Owner;
}
  
// The car
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
PerformanceFeaturelist ::= "[]" | "["   ws   PerformanceFeature   (","   ws   PerformanceFeature)*   "]"
SafetyFeature ::= "{"   ws   "\"airbags\":"   ws   number   ","   ws   "\"parkingSensors\":"   ws   number   ","   ws   "\"laneAssist\":"   ws   number   "}"
SafetyFeaturelist ::= "[]" | "["   ws   SafetyFeature   (","   ws   SafetyFeature)*   "]"
AudioFeature ::= "{"   ws   "\"brand\":"   ws   string   ","   ws   "\"speakers\":"   ws   number   ","   ws   "\"hasBluetooth\":"   ws   boolean   "}"
AudioFeaturelist ::= "[]" | "["   ws   AudioFeature   (","   ws   AudioFeature)*   "]"
Features ::= "{"   ws   "\"audio\":"   ws   AudioFeature   ","   ws   "\"safety\":"   ws   SafetyFeature   ","   ws   "\"performance\":"   ws   PerformanceFeature   "}"
Featureslist ::= "[]" | "["   ws   Features   (","   ws   Features)*   "]"
Owner ::= "{"   ws   "\"firstName\":"   ws   string   ","   ws   "\"lastName\":"   ws   string   ","   ws   "\"age\":"   ws   number   "}"
Ownerlist ::= "[]" | "["   ws   Owner   (","   ws   Owner)*   "]"
Car ::= "{"   ws   "\"make\":"   ws   string   ","   ws   "\"model\":"   ws   string   ","   ws   "\"year\":"   ws   number   ","   ws   "\"colors\":"   ws   stringlist   ","   ws   "\"features\":"   ws   Features   "}"
Carlist ::= "[]" | "["   ws   Car   (","   ws   Car)*   "]"
CarAndOwner ::= "{"   ws   "\"car\":"   ws   Car   ","   ws   "\"owner\":"   ws   Owner   "}"
CarAndOwnerlist ::= "[]" | "["   ws   CarAndOwner   (","   ws   CarAndOwner)*   "]"
string ::= "\""   ((  [^"\x7F\x00-\x1F] | "\\"   (  ["\\/bfnrt] | "u"   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]   [0-9a-fA-F]  )  ))*   "\""
boolean ::= "true" | "false"
ws ::= [ \t\n]*
number ::= ("-")?   [0-9]+   "."?   [0-9]*
stringlist ::= "["   ws   "]" | "["   ws   string   (","   ws   string)*   ws   "]"
numberlist ::= "["   ws   "]" | "["   ws   string   (","   ws   number)*   ws   "]"`.trim()
  );
});
