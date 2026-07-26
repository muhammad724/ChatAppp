import { MessageCircle, MousePointer2 } from "lucide-react";

export default function ConversationsPage() {
  return (
    <div className="flex h-full items-center justify-center bg-[#eef7f3] p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[2rem] bg-black text-white shadow-xl shadow-black/10">
          <MessageCircle className="h-9 w-9" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-black">
          Your conversations
        </h1>
        <p className="mt-2 text-sm leading-6 text-black">
          Choose someone from Messages to open a chat and continue the
          conversation.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-black shadow-sm">
          <MousePointer2 className="h-3.5 w-3.5" />
          Select a person on the left
        </div>
      </div>
    </div>
  );
}
