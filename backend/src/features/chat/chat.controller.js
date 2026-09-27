import { replyToChat } from "./chat.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

// POST /chat  (public, login opsional)
export const chatController = asyncHandler(async (req, res) => {
   const result = await replyToChat(req.body.messages, req.user?.userId);

   return res.status(200).json({
      message: "Chat reply generated successfully",
      data: result,
   });
});
