import { Router } from "express";
import db from "external/mongo/db";
import CreateLogCtx from "lib/logger/logger";
import { EvaluateGoalForUser, GetQuestsThatContainGoal } from "lib/targets/goals";
import prValidate from "server/middleware/prudence-validate";
import { FormatGame } from "tachi-common";
import { GetMostSubscribedGoals } from "utils/db";
import { AssignToReqTachiData, GetGPT, GetTachiData } from "utils/req-tachi-data";
import { GetUsersWithIDs, ResolveUser } from "utils/user";
import type { RequestHandler } from "express";
import type { EvaluatedGoalReturn } from "lib/targets/goals";

const logger = CreateLogCtx(__filename);

const router: Router = Router({ mergeParams: true });

/**
 * Get the most popular goals for this GPT.
 *
 * @name GET /api/v1/games/:game/:playtype/targets/goals/popular
 */
router.get("/popular", async (req, res) => {
	const { game, playtype } = GetGPT(req);

	const goals = await GetMostSubscribedGoals({ game, playtype });

	return res.status(200).json({
		success: true,
		description: `Returned ${goals.length} goals.`,
		body: goals,
	});
});

const ResolveGoalID: RequestHandler = async (req, res, next) => {
	const { game, playtype } = GetGPT(req);
	const goalID = req.params.goalID;

	const goal = await db.goals.findOne({
		goalID,
		game,
		playtype,
	});

	if (!goal) {
		return res.status(404).json({
			success: false,
			description: `A goal with ID ${goalID} doesn't exist.`,
		});
	}

	AssignToReqTachiData(req, { goalDoc: goal });

	next();
};

/**
 * Retrieve information about this goal and who is subscribed to it.
 *
 * @name GET /api/v1/games/:game/:playtype/targets/goals/:goalID
 */
router.get("/:goalID", ResolveGoalID, async (req, res) => {
	const goal = GetTachiData(req, "goalDoc");

	const goalSubs = await db["goal-subs"].find({
		goalID: goal.goalID,
	});

	const users = await GetUsersWithIDs(goalSubs.map((e) => e.userID));

	const parentQuests = await GetQuestsThatContainGoal(goal.goalID);

	return res.status(200).json({
		success: true,
		description: `Retrieved information about ${goal.name}.`,
		body: {
			goal,
			goalSubs,
			users,
			parentQuests,
		},
	});
});

/**
 * Evaluates a goal upon a user, even if they aren't subscribed to it.
 *
 * @param userID - The userID to evaluate this goal against. Must be a player of this GPT.
 *
 * @name GET /api/v1/games/:game/:playtype/targets/goals/:goalID/evaluate-for
 */
router.get(
	"/:goalID/evaluate-for",
	ResolveGoalID,
	prValidate({
		userID: "string",
	}),
	async (req, res) => {
		const { game, playtype } = GetGPT(req);

		const userID = req.query.userID as string;

		const user = await ResolveUser(userID);

		if (!user) {
			return res.status(404).json({
				success: false,
				description: `The user ${userID} does not exist.`,
			});
		}

		const hasPlayed = await db["game-stats"].findOne({
			game,
			playtype,
			userID: user.id,
		});

		if (!hasPlayed) {
			return res.status(400).json({
				success: false,
				description: `The user ${user.username} hasn't played ${FormatGame(
					game,
					playtype
				)}.`,
			});
		}

		const goal = GetTachiData(req, "goalDoc");
		const goalID = goal.goalID;

		const goalSub = await db["goal-subs"].findOne({
			userID: user.id,
			goalID,
		});

		let goalResults: EvaluatedGoalReturn;

		// shortcut evaluation by using the user goal

		if (goalSub) {
			goalResults = {
				achieved: goalSub.achieved,
				outOf: goalSub.outOf,
				outOfHuman: goalSub.outOfHuman,
				progress: goalSub.progress,
				progressHuman: goalSub.progressHuman,
			};
		} else {
			const results = await EvaluateGoalForUser(goal, user.id, logger);

			if (!results) {
				throw new Error(
					`Failed to evaluate goal ${goal.name} (${goal.goalID}) for user ${user.id}. More information above.`
				);
			}

			goalResults = results;
		}

		return res.status(200).json({
			success: true,
			description: `Evaluated ${goal.name} for ${user.username}.`,
			body: goalResults,
		});
	}
);

export default router;
