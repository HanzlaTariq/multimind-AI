import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import SharedConversationView from "@/components/SharedConversationView";

export default async function SharedChatPage({ params }) {
  await dbConnect();

  const conversation = await Conversation.findOne({
    shareId: params.shareId,
    isPublic: true,
  })
    .select("title turns createdAt")
    .lean();

  if (!conversation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-paper">
            This link isn't available
          </h1>
          <p className="mt-2 text-sm text-mist">
            The chat may have been made private again, or no longer exists.
          </p>
        </div>
      </div>
    );
  }

  return <SharedConversationView conversation={JSON.parse(JSON.stringify(conversation))} />;
}