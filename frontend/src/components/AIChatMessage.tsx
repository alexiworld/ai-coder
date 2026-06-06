"use client";

type AIChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export const AIChatMessage = ({ role, content }: AIChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "bg-[var(--secondary-purple)] text-white"
            : "border border-[var(--stroke)] bg-[var(--surface)] text-[var(--navy-dark)]"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-70 mb-1">
          {isUser ? "You" : "AI"}
        </p>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};
