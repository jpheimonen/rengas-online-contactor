import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "./shell/AppShell.tsx";
import { LadderPage } from "./shell/LadderPage.tsx";

const rootRoute = createRootRoute({ component: AppShell });

const ladderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LadderPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([ladderRoute]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
