import ApiError from "components/util/ApiError";
import Loading from "components/util/Loading";
import useApiQuery from "components/util/query/useApiQuery";
import { UserContext } from "context/UserContext";
import React, { useContext } from "react";
import { Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FolderDocument, PublicUserDocument, RecentlyViewedFolderDocument } from "tachi-common";
import { FolderStatsInfo } from "types/api-returns";
import { GamePT } from "types/react";
import { FolderInfoComponent } from "./FolderSelectPage";

export default function RecentFoldersPage({
	reqUser,
	game,
	playtype,
}: { reqUser: PublicUserDocument } & GamePT) {
	const { user } = useContext(UserContext);

	if (!user) {
		return <>Hey, you're not logged in. How did you get here!</>;
	}

	const { data, error } = useApiQuery<{
		folders: FolderDocument[];
		views: RecentlyViewedFolderDocument[];
		stats: FolderStatsInfo[];
	}>(`/users/${user.id}/games/${game}/${playtype}/folders/recent`);

	if (error) {
		return <ApiError error={error} />;
	}

	if (!data) {
		return <Loading />;
	}

	if (data.folders.length === 0) {
		return (
			<div className="text-center">
				Looks like you've not recently interacted with any folders.{" "}
				<Link to={`/dashboard/users/${user.username}/games/${game}/${playtype}/folders`}>
					Go do that!
				</Link>
			</div>
		);
	}

	const dataset = [];

	for (const recent of data.views) {
		dataset.push({
			view: recent,
			// Is it really O(n^2) if the input is capped at 4?
			folder: data.folders.find((x) => x.folderID === recent.folderID)!,
			stats: data.stats.find((x) => x.folderID === recent.folderID)!,
		});
	}

	return (
		<Row>
			{dataset.map((e) => (
				<FolderInfoComponent
					key={e.folder.folderID}
					reqUser={reqUser}
					folder={e.folder}
					folderStats={e.stats}
					game={game}
					playtype={playtype}
				/>
			))}
		</Row>
	);
}
