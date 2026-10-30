import { Message, messages } from "./chatData";

export const getTimeline = (chat: Message) => {
   return [
      {
         ...chat,
         type: "message" as const,
         time: toTimestamp(chat.time),
      },
      ...(chat.attachments?.map((a) => {
         return {
            ...chat,
            type: "attachment" as const,
            time: toTimestamp(a.time || new Date().toISOString()),
            attachments: { ...a },
         };
      }) || []),
   ].sort((a, b) => a.time - b.time);
};

export const getLastActiveTime = (userId: string): string | undefined => {
   const userMessages = messages.filter(
      (msg: any) => msg.senderId === userId || msg.receiverId === userId,
   );

   if (!userMessages.length) return undefined;

   const lastMessage = userMessages.reduce((latest, msg) =>
      new Date(msg.time) > new Date(latest.time) ? msg : latest,
   );

   return lastMessage.time;
};

export const toRelativeTime = (ts: number) => {
   const diff = Date.now() - ts;
   const mins = Math.floor(diff / (1000 * 60));
   const hrs = Math.floor(diff / (1000 * 60 * 60));
   const days = Math.floor(diff / (1000 * 60 * 60 * 24));

   return days > 0
      ? `${days} day${days > 1 ? "s" : ""} ago`
      : hrs > 0
        ? `${hrs} hour${hrs > 1 ? "s" : ""} ago`
        : mins > 0
          ? `${mins} minute${mins > 1 ? "s" : ""} ago`
          : "Just now";
};

export const toTimestamp = (timeStr: string) => {
   const now = new Date();
   const n = parseInt(timeStr) || 0;

   if (timeStr.includes("minute")) return now.getTime() - n * 60 * 1000;
   if (timeStr.includes("hour")) return now.getTime() - n * 60 * 60 * 1000;
   if (timeStr.includes("day")) return now.getTime() - n * 24 * 60 * 60 * 1000;
   if (timeStr.includes("week"))
      return now.getTime() - n * 7 * 24 * 60 * 60 * 1000;

   return new Date(timeStr).getTime(); // absolute date fallback
};
