/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bills from "../bills.js";
import type * as clients from "../clients.js";
import type * as http from "../http.js";
import type * as logs from "../logs.js";
import type * as otherIncome from "../otherIncome.js";
import type * as pay from "../pay.js";
import type * as profile from "../profile.js";
import type * as spending from "../spending.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bills: typeof bills;
  clients: typeof clients;
  http: typeof http;
  logs: typeof logs;
  otherIncome: typeof otherIncome;
  pay: typeof pay;
  profile: typeof profile;
  spending: typeof spending;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
