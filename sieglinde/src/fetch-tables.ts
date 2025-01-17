/* eslint-disable no-await-in-loop */
import TableValueGetters from "lookups";
import fetch from "node-fetch";
import { BMS_TABLES } from "tachi-common";
import type { BMSTablesDataset, BMSTableChart } from "./types";

// only 7k supported atm
const registeredTables: Array<BMSTablesDataset> = BMS_TABLES.filter((e) => e.playtype === "7K");

export interface TableRes {
	table: BMSTablesDataset;
	charts: Array<BMSTableChart>;
}

export default async function GetTableData(): Promise<Array<TableRes>> {
	const out = [];

	for (const table of registeredTables.filter((e) => e.name in TableValueGetters)) {
		const charts = await fetch(table.url).then((r) => r.json());

		out.push({ table, charts });
	}

	return out;
}
