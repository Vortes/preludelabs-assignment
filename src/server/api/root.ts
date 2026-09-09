import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { crudRouter } from "~/server/api/routers/crud";

export const appRouter = createTRPCRouter({
  crud: crudRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
