import { replyToChat } from "./chat.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

// POST /chat  (public)
export const chatController = asyncHandler(async (req, res) => {
   const result = await replyToChat(req.body.messages);

   return res.status(200).json({
      message: "Chat reply generated successfully",
      data: result,
   });
});
