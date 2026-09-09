import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const itemInput = z.object({
  value: z.string().trim().min(1).max(100),
});

export const crudRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.crudItem.findMany({
      where: { clerkUserId: ctx.userId },
      orderBy: { createdAt: "desc" },
    }),
  ),

  create: protectedProcedure.input(itemInput).mutation(({ ctx, input }) =>
    ctx.db.crudItem.create({
      data: { clerkUserId: ctx.userId, value: input.value },
    }),
  ),

  update: protectedProcedure
    .input(itemInput.extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.crudItem.updateMany({
        where: { id: input.id, clerkUserId: ctx.userId },
        data: { value: input.value },
      });

      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.crudItem.deleteMany({
        where: { id: input.id, clerkUserId: ctx.userId },
      });

      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
});
