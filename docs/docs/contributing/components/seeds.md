# Database Seeds Guide

The database seeds component of Tachi controls the actual data inside the app.

Changes made in this component are automatically synchronised with the live Tachi database,
it's kind of a cool system, and allows anyone to contribute patches to songs, charts, folders, and more!

## Tool Knowledge

To properly contribute to the documentation, you'll need to know the following things:

- [The Terminal](../tools/terminal.md)
- [Git](../tools/git.md)
- [JSON](../tools/json.md)

If you know JavaScript, that will be helpful for the scripting sections when we go over how
to batch-apply updates.
However, we don't maintain a JS guide (yet). You'll have to ask in `#dev`!

If you don't know, or aren't comfortable with all of the things on this list, click on them to learn about them!

## Component Overview

All of the content for this component is inside the `database-seeds/` folder.

It contains the `collections/` folder, which contains JSON files for their respective databases.

!!! example
	`collections/songs-iidx.json` will be synced with the `songs-iidx` collection in the database.

The other available folder is `scripts/`.
This contains a Typescript package for scripting changes to the database seeds, and also contains a script that tests whether the data in the seeds is valid.
We'll go over this more later.

## Software Overview

The collections are all just plain JSON files.

The scripts are written in either TypeScript or JavaScript.

## Dependencies

Installation of dependencies for this part of the codebase should be already handled, if you ran the `bootstrap.sh` script.

## How do I know what a song is meant to look like?

These are called schemas (or interfaces) and you can find them in two places:

- The source code.

You can find the actual interfaces we use inside the common module, it's at `common/src/types.ts`. This contains interface definitions like `SongDocument` which,
expectedly, define what a song is meant to look like.

- The documentation.

We also maintain a bit more human readable form for schemas in this documentation, under the [schemas section](../../schemas).

!!! warning
	This may be slightly out of sync with the current content. Please report it if it is!

## Important Scripts

After doing **anything** to the collections, such as adding a new item to the database, you **MUST** run `pnpm run sort` inside the `scripts/` folder.

This will deterministically sort the data you put into the collections, making sure that `git` history stays sane (i.e. it only says things that actually changed, changed).

!!! info
	`pnpm run sort` is an alias for `node deterministic-collection-sort.js`

Before sending any changes, run `pnpm test` to check all your data. If anything you've sent is invalid, it'll be logged in `failed-tests.log`, and the command won't pass.

This is automatically ran when changes are sent to me, but you should run it yourself before committing anyway!

!!! info
	Your changes won't be synced with the database if they fail the tests.

	If you're confused about why tests are failing, ask in `#dev`.

## Rerunners

Inside the `scripts/` folder is a folder called `rerunners/`.
These scripts are intended to be kept around and re-ran (hence the name).

You'll find a bunch of useful little utilities here, and there's sadly too many to document.

It should be obvious what each one does, though.

If you're looking to add a BMS table to Tachi for an example, you'd look into the rerunner scripts.

## Single-Time Scripts

Some scripts we only want to run once, and we don't really need to keep them around. These are saved into the `single-time` folder, and will never be tracked by `git`.

You can make quick hacky scripts here.

## Scripting Changes

We provide utilities for mutating data inside the collections comfortably inside `scripts/util.js`. The most important one is `MutateCollection`, which, as expected, mutates a collection.

It takes a collection name (like `songs-iidx.json`) and a callback function that receives the data inside that collection.

Whatever that callback returns replaces the data in the collection.

Below are some examples of what you can do with this API.

=== "Batch Renaming an artist"
	```js
	const { MutateCollection } = require("../util");

	// Let's say all songs made by the artist "Scrimbly" were renamed to
	// BEMANI SOUND TEAM "Scrimbly".
	MutateCollection("songs-iidx.json", (songs) => {
		// for all the songs in songs-iidx.json
		for (const song of songs) {
			// if the song artist is "Scrimbly"
			if (song.artist === "Scrimbly") {
				// replace it
				song.artist = 'BEMANI SOUND TEAM "Scrimbly"'
			}
		}

		// return the same piece of data we got, with our mutations applied.
		return songs;
	});
	```

=== "Adding data"
	```js
	const { MutateCollection } = require("../util");

	MutateCollection("songs-iidx.json", (songs) => {
		songs.push({
			// some new song object
		})

		songs.push({
			// another new song object
		})

		// return the same piece of data we got, with our mutations applied.
		return songs;
	});
	```

For even more examples, see the `rerunners/` folder, as it makes liberal use of this API.