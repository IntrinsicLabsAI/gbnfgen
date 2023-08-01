import {
  serializeGrammar,
} from "./grammar.js";
import { Interface, InterfaceProperty, compile } from "./compiler.js";

export type ElementIdentifier = string;

interface DeliveryInformation {
  /* Tracking number for the delivery */
  tracking_number: string;
  /* Status of the delivery, one of "in-transit", "success", or "failed" */
  status: string;
  /* Weight of the package, e.g. "2oz" or "3lb" */
  weight: string;
  /* Weight of the package converted to number of ounces */
  weight_oz: number;
  /* ISO 8601 submission date time representation */
  submitted_ts: string;
}


// Array of some other type of object that we've already defined here instead...etc.
// If this is a reference to another type that we've declared, we should be able to make references at will instead.

const grammar = compile(`
interface DeliveryInformation {
  /* Tracking number for the delivery */
  tracking_number: string;
  /* Status of the delivery, one of "in-transit", "success", or "failed" */
  status: string;
  /* Weight of the package, e.g. "2oz" or "3lb" */
  weight: string;
  /* Weight of the package converted to number of ounces */
  weight_oz: number;
  /* ISO 8601 submission date time representation */
  submitted_ts: string;
}`, "DeliveryInformation");

console.log(serializeGrammar(grammar));
