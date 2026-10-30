import Chat from "@src/Pages/admin/Chat";
import React, { Suspense } from "react";

const ChatPage = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <Chat />
      </Suspense>
   );
};

export default ChatPage;
