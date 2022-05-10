import { ONE_HOUR } from "lib/constants/time";
import { TachiConfig } from "lib/setup/config";
import { GetGameConfig } from "tachi-common";
import { exec } from "child_process";
import crypto from "crypto";
import { URL } from "url";
import type { Game, GamePTConfig, integer, Playtype } from "tachi-common";

// https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
// the developer of this has migrated everything to Force ES6 style modules,
// which really really messes with a lot of the ecosystem.
// shim.

export function EscapeStringRegexp(string: string) {
	if (typeof string !== "string") {
		throw new TypeError("Expected a string");
	}

	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it's always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns' stricter grammar.
	return string.replace(/[|\\{}()[\]^$+*?.]/gu, "\\$&").replace(/-/gu, "\\x2d");
}

/**
 * Takes a process.hrtime.bigint(), and returns the milliseconds elapsed since it.
 * This function will not work if more than 100(ish) days have passed since the first reference.
 */
export function GetMillisecondsSince(ref: bigint) {
	return Number(process.hrtime.bigint() - ref) / 1e6;
}

export function Random20Hex() {
	return crypto.randomBytes(20).toString("hex");
}

export function MStoS(ms: number) {
	return Math.floor(ms / 1000);
}

/**
 * Random From Array - Selects a random value from an array.
 */
export function RFA<T>(arr: Array<T>): T {
	return arr[Math.floor(Math.random() * arr.length)] as T;
}

/**
 * Splits an Authorization header into the token and the type.
 */
export function SplitAuthorizationHeader(authHeader: string) {
	const parts = authHeader.split(" ");

	return { type: parts[0], token: parts.slice(1).join(" ") };
}

/**
 * Utility Type Predicate.
 * Determines whether a key is an ownProperty on an object.
 *
 * @returns True if the object contains that key, and changes the type of
 * key to keyof T.
 * False if the object doesn't.
 */
export function HasOwnProperty<T>(obj: T, key: number | string | symbol): key is keyof T {
	return Object.prototype.hasOwnProperty.call(obj, key);
}

export function IsValidGame(str: string): str is Game {
	return !!TachiConfig.GAMES.includes(str as Game);
}

export function IsValidPlaytype(game: Game, str: string): str is Playtype {
	return GetGameConfig(game).validPlaytypes.includes(str as Playtype);
}

export function IsValidScoreAlg(
	gptConfig: GamePTConfig,
	str: unknown
): str is GamePTConfig["scoreRatingAlgs"][0] {
	return gptConfig.scoreRatingAlgs.includes(str as GamePTConfig["scoreRatingAlgs"][0]);
}

export function IsString(val: unknown): val is string {
	return typeof val === "string";
}

export function DedupeArr<T>(arr: Array<T>): Array<T> {
	return [...new Set(arr)];
}

export function StripUrl(url: string, userInput: string) {
	if (userInput.toLowerCase().includes(url)) {
		return userInput.split(url)[1]!;
	}

	return userInput;
}

// It's really hard to type this properly because iterating over
// object keys and then accessing the objects properties is a pain
// in typescript. My initial approach was to just use
// Record<string, unknown>, but then it mandates everything passed
// to it has string indexing.
// Since this is not possible, I've set it to any and just use
// runtime validation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DeleteUndefinedProps(record: any) {
	if (typeof record !== "object" || record === null || Array.isArray(record)) {
		throw new Error(`Non-object passed to DeleteUndefinedProps.`);
	}

	// asserted above
	const rec = record as Record<string, unknown>;

	for (const key of Object.keys(rec)) {
		if (rec[key] === undefined) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete rec[key];
		}
	}
}

export function IsValidURL(string: string) {
	try {
		const url = new URL(string);

		return url.protocol === "http:" || url.protocol === "https:";
	} catch (_err) {
		return false;
	}
}

export function Sleep(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

export function GetTimeXHoursAgo(hours: integer) {
	return Date.now() - ONE_HOUR * hours;
}

export function ApplyNTimes<T>(n: integer, fn: (i: integer) => T): Array<T> {
	const arr = [];

	for (let i = 0; i < n; i++) {
		arr.push(fn(i));
	}

	return arr;
}

export function RoundToNDecimalPlaces(value: number, n: integer) {
	return Number(value.toFixed(n));
}

export function OmitUndefinedKeys<T>(obj: Partial<T>): Partial<T> {
	const omittedObj: Partial<T> = {};

	for (const k of Object.keys(obj)) {
		const key = k as keyof T;

		// This looks to be a bug in the no-unnecessary-condition rule.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (obj[key] !== undefined) {
			omittedObj[key] = obj[key];
		}
	}

	return omittedObj;
}

/**
 * Exec shellcode asynchronously.
 *
 * **DO NOT PASS USER INPUT INTO THIS FUNCTION!**
 * **THIS EVALS A STRING AS BASH!**
 * @param command A bash command to execute on the system.
 * @returns stdout and stderr as strings.
 */
export function asyncExec(command: string) {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		exec(command, (err, stdout, stderr) => {
			if (err) {
				// eslint-disable-next-line prefer-promise-reject-errors
				reject({ err, stdout, stderr });
				return;
			}

			resolve({ stdout, stderr });
		});
	});
}

export function FormatBMSTables(bmsTables: Array<{ table: string; level: string }>) {
	if (bmsTables.length === 0) {
		return null;
	}

	return bmsTables.map((e) => `${e.table}${e.level}`).join(", ");
}

export function HumanisedJoinArray(arr: Array<string>, lastJoiner = "or") {
	return `${arr.slice(0, arr.length - 1).join(", ")} ${lastJoiner} ${arr[arr.length - 1]!}`;
}

export function FormatMaxDP(num: number, points = 2) {
	return parseFloat(num.toFixed(points)).toString();
}

/**
 * Returns whether this game is supported by this instance of tachi or not.
 */
export function IsSupported(game: Game) {
	return TachiConfig.GAMES.includes(game);
}

/**
 * Given two arrays, return all elements in arr2 that are not in arr1.
 * @param left - The array of original elements.
 * @param right - The right side of elements; everything in here not in left will be
 * returned.
 */
export function ArrayDiff<T>(left: Array<T>, right: Array<T>) {
	return right.filter((e) => !left.includes(e));
}

export function IsNonEmptyString(maybeStr: string | null | undefined): maybeStr is string {
	return maybeStr !== null && maybeStr !== "";
}

export function IsNullishOrEmptyStr(
	maybeStr: string | null | undefined
): maybeStr is "" | null | undefined {
	return maybeStr === null || maybeStr === undefined || maybeStr === "";
}

/**
 * Runtime non-null assertion.
 */
export function NotNullish<T>(maybeValue: T | null | undefined): T {
	if (maybeValue === null || maybeValue === undefined) {
		throw new Error(
			`NON-NULL ASSERTION FAILED: Expected Non-null/undefined value, got ${
				maybeValue as null | undefined
			}.`
		);
	}

	return maybeValue;
}

export function IsNullish<T>(maybeValue: T | null | undefined): maybeValue is null | undefined {
	return maybeValue === null || maybeValue === undefined;
}
