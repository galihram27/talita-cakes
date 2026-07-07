import { getGoogleReviews } from "./review.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

// GET /reviews/google  (public)
export const getGoogleReviewsController = asyncHandler(async (req, res) => {
   const result = await getGoogleReviews();

   return res.status(200).json({
      message: "Google reviews fetched successfully",
      data: result,
   });
});
