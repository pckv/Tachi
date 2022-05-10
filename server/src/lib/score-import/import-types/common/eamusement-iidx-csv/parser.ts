import ScoreImportFatalError from "../../../framework/score-importing/score-import-error";
import { CSVParseError, NaiveCSVParse } from "utils/naive-csv-parser";
import type { ParserFunctionReturns } from "../types";
import type { EamusementScoreData, IIDXEamusementCSVContext, IIDXEamusementCSVData } from "./types";
import type { KtLogger } from "lib/logger/logger";

enum EAM_VERSION_NAMES {
	"1st&substream" = 1,
	"2nd style",
	"3rd style",
	"4th style",
	"5th style",
	"6th style",
	"7th style",
	"8th style",
	"9th style",
	"10th style",
	"IIDX RED",
	"HAPPY SKY",
	"DistorteD",
	"GOLD",
	"DJ TROOPERS",
	"EMPRESS",
	"SIRIUS",
	"Resort Anthem",
	"Lincle",
	"tricoro",
	"SPADA",
	"PENDUAL",
	"copula",
	"SINOBUZ",
	"CANNON BALLERS",
	"Rootage",
	"HEROIC VERSE",
	"BISTROVER",
	"CastHour",
}

const PRE_HV_HEADER_COUNT = 27;
const HV_HEADER_COUNT = 41;

// commented out for reference
// [
//     "version",
//     "title",
//     "genre",
//     "artist",
//     "playcount",
//     (?beginnerdata)
//     "normal-level",
//     "normal-exscore",
//     "normal-pgreat",
//     "normal-great",
//     "normal-bp",
//     "normal-lamp",
//     "normal-grade",
//     "hyper-level",
//     "hyper-exscore",
//     "hyper-pgreat",
//     "hyper-great",
//     "hyper-bp",
//     "hyper-lamp",
//     "hyper-grade",
//     "another-level",
//     "another-exscore",
//     "another-pgreat",
//     "another-great",
//     "another-bp",
//     "another-lamp",
//     "another-grade",
//     (?leggdata)
//     "timestamp",
// ];

export function ResolveHeaders(headers: Array<string>, logger: KtLogger) {
	if (headers.length === PRE_HV_HEADER_COUNT) {
		logger.verbose("PRE_HV csv received.");
		return {
			hasBeginnerAndLegg: false,
		};
	} else if (headers.length === HV_HEADER_COUNT) {
		logger.verbose("HV+ csv received.");
		return {
			hasBeginnerAndLegg: true,
		};
	}

	logger.info(`Invalid CSV header count of ${headers.length} received.`);
	throw new ScoreImportFatalError(
		400,
		"Invalid CSV provided. CSV does not have the correct amount of headers."
	);
}

export function IIDXCSVParse(csvBuffer: Buffer, logger: KtLogger) {
	let rawHeaders: Array<string>;
	let rawRows: Array<Array<string>>;

	try {
		({ rawHeaders, rawRows } = NaiveCSVParse(csvBuffer, logger));
	} catch (e) {
		if (e instanceof CSVParseError) {
			throw new ScoreImportFatalError(400, e.message);
		}

		throw e;
	}

	const { hasBeginnerAndLegg } = ResolveHeaders(rawHeaders, logger);

	const diffs = hasBeginnerAndLegg
		? (["beginner", "normal", "hyper", "another", "leggendaria"] as const)
		: (["normal", "hyper", "another"] as const);

	const iterableData = [];

	let gameVersion = 0;

	for (const cells of rawRows) {
		const version = cells[0];
		const title = cells[1]!.trim();
		const timestamp = cells[rawHeaders.length - 1]!.trim();

		// wtf typescript?? what's the point of enums?
		const versionNum = EAM_VERSION_NAMES[version as keyof typeof EAM_VERSION_NAMES];

		if (!versionNum) {
			logger.info(`Invalid/Unsupported EAM_VERSION_NAME ${version}.`);
			throw new ScoreImportFatalError(
				400,
				`Invalid/Unsupported Eamusement Version Name ${version}.`
			);
		}

		if (versionNum > gameVersion) {
			gameVersion = versionNum;
		}

		const scores: Array<EamusementScoreData> = [];

		for (let d = 0; d < diffs.length; d++) {
			const diff = diffs[d]!;
			const di = 5 + d * 7;

			// lazy non-null assertions here.
			// @todo refactor this?
			// We know for a fact that all of this stuff is non-null because of the CSV parser.
			scores.push({
				difficulty: diff.toUpperCase() as Uppercase<typeof diff>,
				bp: cells[di + 4]!,
				exscore: cells[di + 1]!,
				pgreat: cells[di + 2]!,
				great: cells[di + 3]!,
				lamp: cells[di + 5]!,
				level: cells[di]!,
			});
		}

		iterableData.push(
			...scores.map((e) => ({
				score: e,
				timestamp,
				title,
			}))
		);
	}

	if (!["26", "27", "28", "29"].includes(gameVersion.toString())) {
		throw new ScoreImportFatalError(400, `Only versions 26, 27, 28 and 29 are supported.`);
	}

	return {
		iterableData,
		version: gameVersion.toString() as "26" | "27" | "28" | "29",
		hasBeginnerAndLegg,
	};
}

/**
 * Parses a buffer of EamusementCSV data.
 * @param fileData - The buffer to parse.
 * @param body - The request body that made this file import request. Used to infer playtype.
 */
function GenericParseEamIIDXCSV(
	fileData: Express.Multer.File,
	body: Record<string, unknown>,
	service: string,
	logger: KtLogger
): ParserFunctionReturns<IIDXEamusementCSVData, IIDXEamusementCSVContext> {
	let playtype: "DP" | "SP";

	if (body.playtype === "SP") {
		playtype = "SP";
	} else if (body.playtype === "DP") {
		playtype = "DP";
	} else {
		logger.info(`Invalid playtype of ${body.playtype} passed to ParseEamusementCSV.`);
		throw new ScoreImportFatalError(400, `Invalid playtype of ${body.playtype} given.`);
	}

	const lowercaseFilename = fileData.originalname.toLowerCase();

	// prettier pls
	if (
		!body.assertPlaytypeCorrect &&
		((lowercaseFilename.includes("sp") && playtype === "DP") ||
			(lowercaseFilename.includes("dp") && playtype === "SP"))
	) {
		logger.info(
			`File was uploaded with filename ${fileData.originalname}, but this was set as a ${playtype} import. Sanity check refusing.`
		);

		throw new ScoreImportFatalError(
			400,
			`Safety Triggered: Filename contained '${
				playtype === "SP" ? "DP" : "SP"
			}', but was marked as a ${playtype} import. Are you *absolutely* sure this is right?`
		);
	}

	const { hasBeginnerAndLegg, version, iterableData } = IIDXCSVParse(fileData.buffer, logger);

	logger.verbose("Successfully parsed CSV.");

	const context: IIDXEamusementCSVContext = {
		playtype,
		importVersion: version,
		hasBeginnerAndLegg,
		service,
	};

	logger.verbose(`Successfully Parsed with ${iterableData.length} results.`);

	return {
		iterable: iterableData,
		context,
		game: "iidx",
		classHandler: null,
	};
}

export default GenericParseEamIIDXCSV;
