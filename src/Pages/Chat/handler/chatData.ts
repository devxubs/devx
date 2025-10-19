// ==============================
// 🧍‍♂️ User Type
// ==============================
export interface User {
   id: string;
   name: string;
   avatar: string;
   isOnline?: boolean;
   lastActive?: string; // ISO timestamp
}

// ==============================
// 📎 Attachment Type
// ==============================
export interface Attachment {
   id: string;
   type:
      | "image"
      | "file"
      | "video"
      | "audio"
      | "pdf"
      | "doc"
      | "zip"
      | "xls"
      | "ppt"
      | "psd"
      | "ai"
      | "default";
   url: string;
   name?: string;
   size?: string;
   time?: string;
}

// ==============================
// 💬 Message Type (Direct / Group)
// ==============================
export interface Message {
   id: string;
   conversationId: string; // Direct or group conversation ID
   senderId: string;
   message?: string;
   time: string; // ISO timestamp
   status?: "sent" | "delivered" | "seen"; // Optional for group messages
   attachments?: Attachment[];
   reactions?: { [userId: string]: "❤️" | "👍" | "😂" | "😮" | "😢" | "😡" };
}

// ==============================
// 🗨️ Conversation Type
// ==============================
export interface Conversation {
   id: string;
   type: "direct" | "group";
   name?: string; // Optional for group
   members: string[]; // Array of user IDs
   adminIds?: string[]; // Optional for group
   createdAt: string; // ISO timestamp
   updatedAt?: string;
   lastMessageId?: string;
   isArchived?: boolean;
   settings?: { notifications?: boolean; color?: string; emoji?: string };
}

// ==============================
// Users
// ==============================
export const users: User[] = [
   {
      id: "u1",
      name: "DevXub",
      avatar: "https://...",
      isOnline: true,
      lastActive: "2025-10-12T10:01:15Z",
   },
   {
      id: "u2",
      name: "Ariana Khan",
      avatar: "https://...",
      isOnline: true,
      lastActive: "2025-10-12T10:01:15Z",
   },
   {
      id: "u3",
      name: "Tanvir Alam",
      avatar: "https://...",
      isOnline: false,
      lastActive: "2025-10-12T09:56:10Z",
   },
   {
      id: "u4",
      name: "Nusrat Jahan",
      avatar: "https://...",
      isOnline: true,
      lastActive: "2025-10-12T09:41:20Z",
   },
   {
      id: "u5",
      name: "Shafin Rahman",
      avatar: "https://...",
      isOnline: false,
      lastActive: "2025-10-12T09:31:05Z",
   },
   {
      id: "u6",
      name: "Riyad Hasan",
      avatar: "https://...",
      isOnline: true,
      lastActive: "2025-10-12T09:21:15Z",
   },
   { id: "u7", name: "Rupom Saha", avatar: "https://...", isOnline: true },
   { id: "u8", name: "Sadia Noor", avatar: "https://...", isOnline: false },
   { id: "u9", name: "Mahin Ahmed", avatar: "https://...", isOnline: false },
   { id: "u10", name: "Mim Chowdhury", avatar: "https://...", isOnline: true },
   { id: "u11", name: "Jewel Ahmed", avatar: "https://...", isOnline: true },
   {
      id: "u12",
      name: "Farhana Hossain",
      avatar: "https://...",
      isOnline: false,
   },
];

// ==============================
// Conversations
// ==============================
export const conversations: Conversation[] = [
   // Direct chats
   {
      id: "c1",
      type: "direct",
      members: ["u1", "u2"],
      createdAt: "2025-10-12T10:00:00Z",
      updatedAt: "2025-10-12T10:01:15Z",
      lastMessageId: "m2",
   },
   {
      id: "c2",
      type: "direct",
      members: ["u1", "u3"],
      createdAt: "2025-10-12T09:50:00Z",
      updatedAt: "2025-10-12T09:56:10Z",
      lastMessageId: "m4",
   },
   {
      id: "c3",
      type: "direct",
      members: ["u1", "u4"],
      createdAt: "2025-10-12T09:30:00Z",
      updatedAt: "2025-10-12T09:41:20Z",
      lastMessageId: "m6",
   },

   // Group chats
   {
      id: "c123",
      type: "group",
      name: "Friends Chat",
      members: ["u1", "u2", "u3"],
      adminIds: ["u1"],
      createdAt: "2025-10-15T08:00:00Z",
      updatedAt: "2025-10-15T10:00:00Z",
      lastMessageId: "gm6",
      settings: { notifications: true, color: "#00A76F", emoji: "👍" },
   },
   {
      id: "c124",
      type: "group",
      name: "Project Team",
      members: ["u1", "u2", "u4", "u5"],
      adminIds: ["u1", "u4"],
      createdAt: "2025-10-14T09:00:00Z",
      lastMessageId: "gm12",
      settings: { notifications: true, color: "#FF5733", emoji: "💻" },
   },
   {
      id: "c125",
      type: "group",
      name: "Family Chat",
      members: ["u1", "u6", "u7", "u8"],
      adminIds: ["u6"],
      createdAt: "2025-10-10T07:30:00Z",
      lastMessageId: "gm18",
      settings: { notifications: true, color: "#33B5FF", emoji: "🏠" },
   },
];

// ==============================
// Messages
// ==============================
export const messages: Message[] = [
   // Direct messages
   {
      id: "m1",
      conversationId: "c1",
      senderId: "u1",
      message: "Hey! How’s it going?",
      time: "2025-10-12T10:00:00Z",
      status: "seen",
   },
   {
      id: "m2",
      conversationId: "c1",
      senderId: "u2",
      message: "Pretty good! Working on a new UI project.",
      time: "2025-10-12T10:01:15Z",
      status: "seen",
   },
   {
      id: "m3",
      conversationId: "c2",
      senderId: "u3",
      message: "Can you send me that React component?",
      time: "2025-10-12T09:55:00Z",
      status: "delivered",
   },
   {
      id: "m4",
      conversationId: "c2",
      senderId: "u1",
      message: "Sure! Here’s the file.",
      time: "2025-10-12T09:56:10Z",
      status: "seen",
   },
   {
      id: "m5",
      conversationId: "c3",
      senderId: "u4",
      message: "Are we meeting today?",
      time: "2025-10-12T09:40:00Z",
      status: "sent",
   },
   {
      id: "m6",
      conversationId: "c3",
      senderId: "u1",
      message: "Yes, 6 PM at the café.",
      time: "2025-10-12T09:41:20Z",
      status: "delivered",
   },

   // Group messages - Friends Chat
   {
      id: "gm1",
      conversationId: "c123",
      senderId: "u1",
      message: "Hi",
      time: "2025-10-15T10:00:00Z",
   },
   {
      id: "gm2",
      conversationId: "c123",
      senderId: "u1",
      message: "How are you?",
      time: "2025-10-15T10:01:00Z",
   },
   {
      id: "gm3",
      conversationId: "c123",
      senderId: "u2",
      message: "I am good!",
      time: "2025-10-15T10:02:00Z",
   },
   {
      id: "gm4",
      conversationId: "c123",
      senderId: "u2",
      message: "And you?",
      time: "2025-10-15T10:03:00Z",
   },
   {
      id: "gm5",
      conversationId: "c123",
      senderId: "u1",
      message: "Fine, thanks!",
      time: "2025-10-15T10:04:00Z",
   },
   {
      id: "gm6",
      conversationId: "c123",
      senderId: "u1",
      message: "Let's meet.",
      time: "2025-10-16T09:00:00Z",
   },

   // Group messages - Project Team
   {
      id: "gm7",
      conversationId: "c124",
      senderId: "u1",
      message: "Project deadline is tomorrow.",
      time: "2025-10-14T09:10:00Z",
   },
   {
      id: "gm8",
      conversationId: "c124",
      senderId: "u4",
      message: "I’ll finish my part today.",
      time: "2025-10-14T09:15:00Z",
   },
   {
      id: "gm9",
      conversationId: "c124",
      senderId: "u2",
      message: "I need some help with the UI.",
      time: "2025-10-14T09:20:00Z",
   },
   {
      id: "gm10",
      conversationId: "c124",
      senderId: "u5",
      message: "I can assist!",
      time: "2025-10-14T09:25:00Z",
   },
   {
      id: "gm11",
      conversationId: "c124",
      senderId: "u1",
      message: "Thanks, team!",
      time: "2025-10-14T09:30:00Z",
   },
   {
      id: "gm12",
      conversationId: "c124",
      senderId: "u4",
      message: "Let’s have a quick meeting.",
      time: "2025-10-14T09:35:00Z",
   },

   // Group messages - Family Chat
   {
      id: "gm13",
      conversationId: "c125",
      senderId: "u1",
      message: "Good morning everyone!",
      time: "2025-10-10T07:35:00Z",
   },
   {
      id: "gm14",
      conversationId: "c125",
      senderId: "u6",
      message: "Morning!",
      time: "2025-10-10T07:36:00Z",
   },
   {
      id: "gm15",
      conversationId: "c125",
      senderId: "u7",
      message: "Hello!",
      time: "2025-10-10T07:37:00Z",
   },
   {
      id: "gm16",
      conversationId: "c125",
      senderId: "u8",
      message: "Good morning!",
      time: "2025-10-10T07:38:00Z",
   },
   {
      id: "gm17",
      conversationId: "c125",
      senderId: "u6",
      message: "Are we visiting grandma today?",
      time: "2025-10-10T07:40:00Z",
   },
   {
      id: "gm18",
      conversationId: "c125",
      senderId: "u1",
      message: "Yes, let’s go after lunch.",
      time: "2025-10-10T07:45:00Z",
   },
];
