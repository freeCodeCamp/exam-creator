import type { JsonObject, JsonValue } from "@prisma/client/runtime/library";
import { ObjectId } from "bson";

/**
 * Helper function to recursively convert deeply-nested { "$oid": "..." } to "..."
 * and rename "_id" to "id" within a JSON-deserialized value.
 *
 * This function handles the raw transformation of JsonValue.
 * The public `deserializeToPrisma` function will then cast the result to T.
 *
 * @param value The JSON-deserialized value to transform.
 * @returns A new value with the transformations applied.
 */
function _recursiveDeserialize(value: JsonValue): unknown {
  // If value is a string, and an ISO Date string, convert it to Date
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
    return value;
  }
  // Base case: If it's a primitive or null, return it directly.
  if (value === null || typeof value !== "object") {
    return value;
  }

  // If it's an array, map over its elements recursively.
  if (Array.isArray(value)) {
    return value.map((item) => _recursiveDeserialize(item));
  }

  // If it's an object, process its properties.
  let newObj: Record<string, unknown> = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      // SAFETY: hasOwnProperty ensures key exists in value, and `undefined` is not serializable.
      const propValue = value[key]!;

      // 1. Convert { "$oid": "..." } to "..." or { "$date": { "$numberLong": "..." } } to Date
      if (
        typeof propValue === "object" &&
        propValue !== null &&
        !Array.isArray(propValue) &&
        Object.keys(propValue).length === 1
      ) {
        // Assert to check for $oid
        if ((propValue as { $oid?: string })["$oid"] !== undefined) {
          newObj[key] = (propValue as { $oid: string })["$oid"]; // Assert to access $oid
        } else if (
          (propValue as { $date?: { $numberLong: string } })["$date"] !==
          undefined
        ) {
          // @ts-expect-error
          newObj[key] = new Date(Number(propValue["$date"]["$numberLong"]));
        }
      } else if (key === "$oid") {
        newObj = propValue as JsonObject;
      } else if (key === "$date") {
        // @ts-expect-error
        newObj = new Date(Number(propValue["$numberLong"]));
      } else {
        // Recursively transform nested objects/arrays
        newObj[key] = _recursiveDeserialize(propValue);
      }
    }
  }

  // 2. Rename "_id" to "id" if "_id" exists and "id" does not
  // Check if newObj._id exists and is a string (after potential $oid conversion)
  if (typeof newObj["_id"] === "string" && newObj["id"] === undefined) {
    newObj["id"] = newObj["_id"];
    delete newObj["_id"];
  }

  return newObj;
}

/**
 * Recursively converts deeply-nested { "$oid": "..." } to "..."
 * and renames "_id" to "id" within a JSON-deserialized object.
 * This function serves as the public API and casts the result to the desired type T.
 *
 * @param obj The JSON-deserialized object to transform, typically a JsonObject or JsonArray.
 * @returns A new object with the transformations applied, cast to type T.
 */
export function deserializeToPrisma<T>(obj: JsonValue): T {
  // The actual recursive transformation is done by the helper function.
  // We then cast the result to T, trusting that the consumer provides
  // a T that matches the transformed JsonValue structure.
  return _recursiveDeserialize(obj) as T;
}

/**
 * Helper function to recursively convert 'id' back to '_id' and
 * string IDs into { "$oid": "..." } for MongoDB compatibility.
 *
 * @param value The object to transform (Prisma-like structure).
 * @returns A new object with the transformations applied for backend/MongoDB.
 */
function _recursiveSerialize(value: any, depth = 0): JsonValue {
  // If value is an ObjectId, convert it
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return { $oid: value };
  }

  // Base case: If it's a primitive or null, return it directly.
  if (value === null || typeof value !== "object") {
    return value;
  }

  // If it's an array, map over its elements recursively.
  if (Array.isArray(value)) {
    return value.map((item) => _recursiveSerialize(item, depth + 1));
  }

  // If it's an object, process its properties.
  const newObj: JsonObject = {};

  // Handle renaming 'id' to '_id' first for the current level
  let idValue: string | undefined;
  if (typeof value["id"] === "string") {
    idValue = value["id"];
  } else if (typeof value["_id"] === "string") {
    // If somehow _id is still there, prioritize it
    idValue = value["_id"];
  }

  // If an 'id' (or '_id') was found, convert it to {$oid: ...} and assign to '_id'
  if (idValue !== undefined) {
    // id -> _id should only be done for first (model) level
    if (depth === 0) {
      newObj["_id"] = { $oid: idValue };
    } else {
      newObj["id"] = { $oid: idValue };
    }
  }

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      // Skip the original 'id' or '_id' key as it's handled above
      if (key === "id" || key === "_id") {
        continue;
      }

      const propValue = value[key];

      // Recursively transform nested objects/arrays
      newObj[key] = _recursiveSerialize(propValue, depth + 1);
    }
  }

  return newObj;
}

/**
 * Recursively converts a Prisma-like object (with 'id' fields) back to a
 * MongoDB-compatible object (with '_id' and { "$oid": "..." } structures).
 * This function serves as the public API for serialization.
 *
 * @param obj The object to transform, typically a Prisma-generated type.
 * @param startDepth Useful to pass `-1` in cases where the input is an array
 * @returns A new object with the transformations applied, ready for the backend.
 */
export function serializeFromPrisma<T>(obj: T, startDepth = 0): JsonValue {
  // The actual recursive transformation is done by the helper function.
  // We return a JsonValue as the output type is more dynamic than the input T.
  return _recursiveSerialize(obj, startDepth);
}
