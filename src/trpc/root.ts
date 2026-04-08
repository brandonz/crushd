import { router } from "./server";
import { gymRouter } from "./routers/gym";
import { routeRouter } from "./routers/route";
import { gradeRouter } from "./routers/grade";
import { commentRouter } from "./routers/comment";
import { postRouter } from "./routers/post";
import { userRouter } from "./routers/user";

export const appRouter = router({
  gym: gymRouter,
  route: routeRouter,
  grade: gradeRouter,
  comment: commentRouter,
  post: postRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
