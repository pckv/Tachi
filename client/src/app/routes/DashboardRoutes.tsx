import { APIFetchV1, ToAPIURL } from "util/api";
import SupportMePage from "app/pages/dashboard/misc/SupportMePage";
import { ErrorPage } from "app/pages/ErrorPage";
import PrivacyPolicyPage from "app/pages/PrivacyPolicyPage";
import { Layout } from "components/layout/Layout";
import EmailVerify from "components/layout/misc/EmailVerify";
import DashboardErrorBoundary from "components/util/DashboardErrorBoundary";
import { BannedContext } from "context/BannedContext";
import { UserContext } from "context/UserContext";
import React, { useContext, useEffect, useState } from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import { BackgroundContext } from "context/BackgroundContext";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import CreditsPage from "../pages/dashboard/misc/CreditsPage";
import GameRoutes from "./GameRoutes";
import ImportRoutes from "./ImportRoutes";
import UserRoutes from "./UserRoutes";
import UtilRoutes from "./UtilRoutes";

export default function DashboardRoutes() {
	const { user } = useContext(UserContext);
	const { banned } = useContext(BannedContext);
	const { setBackground } = useContext(BackgroundContext);

	const [hasVerifiedEmail, setHasVerifiedEmail] = useState<boolean | null>(null);

	useEffect(() => {
		if (!user) {
			return setHasVerifiedEmail(null);
		}

		(async () => {
			const hasVerified = await APIFetchV1<boolean>(`/users/${user.id}/is-email-verified`);

			if (hasVerified.success) {
				setHasVerifiedEmail(hasVerified.body);
			}
		})();
	}, [user]);

	useEffect(() => {
		if (user) {
			setBackground(ToAPIURL(`/users/${user.id}/banner`));
		} else {
			setBackground(null);
		}

		return () => {
			setBackground(null);
		};
	}, [user]);

	if (hasVerifiedEmail === false) {
		return (
			<Layout>
				<EmailVerify setHasVerifiedEmail={setHasVerifiedEmail} />
			</Layout>
		);
	}

	if (banned) {
		return <ErrorPage statusCode={403} customMessage="You are banned." />;
	}

	return (
		<Layout>
			<DashboardErrorBoundary>
				<Switch>
					<Route exact path="/dashboard">
						<DashboardPage />
					</Route>

					<Route path="/dashboard/privacy">
						<PrivacyPolicyPage />
					</Route>

					<Route exact path="/dashboard/credits">
						<CreditsPage />
					</Route>

					<Route exact path="/dashboard/support">
						<SupportMePage />
					</Route>

					<Route exact path="/dashboard/users">
						<Redirect to="/dashboard" />
					</Route>

					<Route exact path="/dashboard/games">
						<Redirect to="/dashboard" />
					</Route>

					<Route path="/dashboard/users/:userID">
						<UserRoutes />
					</Route>

					<Route path="/dashboard/games/:game">
						<GameRoutes />
					</Route>

					<Route path="/dashboard/import">
						<ImportRoutes />
					</Route>

					<Route path="/dashboard/utils">
						<UtilRoutes />
					</Route>

					<Route path="*">
						<ErrorPage statusCode={404} />
					</Route>
				</Switch>
			</DashboardErrorBoundary>
		</Layout>
	);
}
