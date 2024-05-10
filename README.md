![logo](./logo.png)

[![npm](https://img.shields.io/npm/v/@intrinsicai%2Fgbnfgen.svg)](https://www.npmjs.com/package/@intrinsicai/gbnfgen)
[![NPM Publish](https://github.com/IntrinsicLabsAI/gbnfgen/actions/workflows/npm.yml/badge.svg)](https://github.com/IntrinsicLabsAI/gbnfgen/actions/workflows/npm.yml)


## What is it?

gbnfgen is a library for generating grammars based on your typed JSON objects, described through normal TypeScript interfaces and enums.

Generate API calls (and responses) parse free text into structured formats, and build your own llama.cpp-powered agents with ease!


Check out the [Live Demo](https://grammar.intrinsiclabs.ai/).



## Installation

```
npm i --save @intrinsicai/gbnfgen
```

## Quickstart


```typescript
import { compile, serializeGrammar } from "@intrinsicai/gbnfgen";

// Supporting Enum for multiple choices (cannot be numbers)
const grammar = compile(
    `enum Mood {
      Happy = "happy",
      Sad = "sad",
      Grateful = "grateful",
      Excited = "excited", 
      Angry = "angry", 
      Peaceful = "peaceful"
    }
    
    interface Person {
         name: string;
         occupation: string;
         age: number;
         mood: Mood,
     }`, "Person");
```


## Why?

Language models allow for open-ended generation of text via autoregressive execution, whereby they generate one token, feed it through a decoder
to get a probability distribution of follow-on tokens, and sample from that distribution in an iterative process to generate text.

This is great for activities like generating marketing prose or writing stories, but some of the most exciting usecases involve plugging autonomous
LLM agents into existing systems. Interacting with databases and REST APIs requires the model's output to fit a pre-existing schema, usually
serialized as JSON.

llama.cpp recently incorporated [grammar-based sampling](https://github.com/ggerganov/llama.cpp/pull/1773) as part of an effort to make it easier
to constrain LLM output. Users do this by authoring GBNF files, which are a constrained flavor of
[Backus-Naur notation](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form) for defining a context-free language.

`gbnfgen` takes the difficulty out of building grammars to let your LLM apps interact with external systems.


## What TypeScript types are supported?

Currently the library is narrowly focused, we only provide support for the following types

* `string` and `string[]`
* `number` and `number[]`
* `boolean`
* Interface types and single-dimensional arrays of interface types. These must be interface types that you define within a single call to `compile`
* String enums, as defined in [this section of the TypeScript handbook](https://www.typescriptlang.org/docs/handbook/enums.html#string-enums).


## Inspiration

Microsoft's [TypeChat](https://github.com/microsoft/typechat) is a similar solution but targeted at OpenAI and other cloud-hosted models. They effectively
take an interface definition from the user code, then generate text with GPT4. They use the TypeScript Compiler API to type-check the output of the code
to see if it's valid JSON that conforms to the typing.

Most users of llama.cpp are either using the C++ code directly or using it via the [llama-cpp-python](https://github.com/abetlen/llama-cpp-python) 
bindings to Python. TypeScript interfaces provide both humand and machine-friendly representations of typed objects that millions of users are
already familiar with, so we decided that it served as a great description format that users of llama.cpp could use to bridge between the other 

----

## Up Next

* Improved type-checking of code passed to `compile`. Currently we just extract the AST without doing any explicit type-checking, so things like duplicate
  property declarations and other simple mistakes will not be caught.
* Support for more type declarations
  * Literals
  * Union types
  * Type aliases
