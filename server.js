import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import userModel from "./src/models/User.js";
import eventModel from "./src/models/Event.js";
import connectdb from "./src/config/db.js";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI);
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_KEY, // This is the default and can be omitted
// });

// const bot = new Telegraf(process.env.BOT_TOKEN);

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: {
      options: {
          polling: {
              // Specify the port here
              port: process.env.PORT||5001,
          }
      }
  }
});
try {
  connectdb();
  console.log("Database connection established");
} catch (error) {
  console.error(error);
  process.kill(process.pid, "SIGTERM");
}
bot.start(async (ctx) => {
  //   console.log("ctx", ctx);
  const from = ctx.update.message.from;
  console.log("from", from);
  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          username: from.username,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
    await ctx.reply(
      `Hey! ${from.first_name} ,Welcome I will be writing higly engaging social media post for you 🚀 with the events through out the day. Let's shine on social media ✨`
    );
  } catch (error) {
    console.log(error);
    console.log("facing diffculties");
    await ctx.reply("Facing diffculties please try again later.");
  }
});

bot.help((ctx)=>{
  ctx.reply("For support plz contaact admin @Rajput4218")
})

bot.command("admin", async(ctx)=>{
  ctx.reply("For support plz contaact admin @Rajput4218")
  ctx.reply("Admin Instagram : www.instagram.com/rajput.prasoon")
  ctx.reply("Admin Twitter : www.x.com/0xrajput")
})

bot.command("generate", async (ctx) => {
  const from = ctx.update.message.from;
  const { message_id: waitingMeassage } = await ctx.reply(
    `Hey! ${from.first_name}, Kindley wait for a moment.I am curating post for you`
  );
  const{message_id:stickerwaitingId}=await ctx.replyWithSticker('CAACAgIAAxkBAAIBSWY13Nf0sFlR2LaiLmVPOJemSi7nAAIxAAMNttIZXdKISghjh-80BA')
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const events = await eventModel.find({
    tgId: from.id,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });
  // console.log("events", events);

  if (events.length === 0) {
    await ctx.deleteMessage(waitingMeassage);
    await ctx.deleteMessage(stickerwaitingId);

    await ctx.reply("no events for the day");
    return;
  }
  const eventString = events
    .map((event) => event.text)
    .join(", ")
    .toString();
  console.log(eventString);
  const eevnt = eventString.toString();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `i am giving the summary of my whole day and create the post for linked in ,twitter, facebook ${eevnt}`,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "Act as a senior copywritter, you write higly engaging post for Linkedin,facebook and Twitter using provided thoughts/events through out the day",
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 700,
      },
    });
    const msg =
      "Create the three different post for Linkedin,facebook and twitter";

    const result = await chat.sendMessageStream(msg);
    console.log(result);

    let text = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log("Chunk Text:", chunkText);
      text += chunkText;
    }

    const response = await result.response;
    console.log("Response:", response);

    console.log("Full Response:", text);
    await ctx.reply(text);
    // For multi-turn conversations (like chat)
    const history = await chat.getHistory();
    const msgContent = { role: "user", parts: [{ text: msg }] };
    const contents = [...history, msgContent];
    const { totalTokens } = await model.countTokens({ contents });
    console.log(totalTokens);

    await userModel.findOneAndUpdate(
      {
        tgId: from.id,
      },
      {
        $inc: {
          completionTokens: totalTokens,
        },
      }
    );
  } catch (error) {
    console.log("something wrong in generating.....");
    console.log(error);
  }
  await ctx.deleteMessage(waitingMeassage);
  await ctx.deleteMessage(stickerwaitingId);

  await ctx.reply("Done ! Thanks for using");
  const{message_id:stickerThankYouId}=await ctx.replyWithSticker('CAACAgUAAxkBAAIBSGY13JZmXM8tPO70B8XGRpPqDnO2AAJdAANawqASAlw2yWA5pEs0BA')

  // try {
  //   const chatCompletin = await openai.chat.completions.create({
  //     message: [
  //       {
  //         role: "system",
  //         content:
  //           "Act as a senior copywritter, you write higly engaging post for Linkedin,facebook and Twitter using provided thoughts/events through out the day",
  //       },
  //       {
  //         role: "user",
  //         content: `Write like a human, for humans. craft three engaging social media posts tailored for Linkedin,Facebook and Twitter audiences. use simple language. Use given labels just to understand the order of the event. don't mention the time in the post. Each post should creatively highlight the fllowing events. Ensure the tone is conversational andimpactful.Focus o the enagaging the respective platform's audience , ancourage interaction and driving the interest in the events
  //         ${events.map((event) => event.text).join(", ")}`,
  //       },
  //     ],
  //     model: process.env.OPENAI_MODEL,
  //   });
  //   console.log("completion", chatCompletin);
  //   ctx.reply(chatCompletin.choices.);
  // } catch (error) {
  //   console.log("facing defiulties in chat completion");
  //   console.log(error);
  // }
});


// bot.on(message("sticker"),async(ctx)=>{
//   console.log(ctx.update.message)
// } )



bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;

  try {
    await eventModel.create({
      text: message,
      tgId: from.id,
      createdAt: new Date(),
    });
    ctx.reply(
      "Noted ,Keep texting me your thoughts.To genrate the post for social mediea"
    );
  } catch (error) {
    console.log(error);
    console.log(message);
    await ctx.reply("facing difficulties,please try again later");
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
