import { ConvexHttpClient } from "convex/browser";
//create a convex http client for server-side actions
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default convex;