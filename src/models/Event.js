import mongoose from "mongoose";

const eventSchema = mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    tgId: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  { timestamp: true }
);

export default mongoose.model("Event", eventSchema);
