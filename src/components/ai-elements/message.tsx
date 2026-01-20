import * as React from "react"
import { cn } from "@/lib/utils"

const Message = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { from: "user" | "assistant" | "system" | "data" }
>(({ className, from, ...props }, ref) => (
  <div
    ref={ref}
    data-role={from}
    className={cn(
      "group w-full relative flex gap-4 p-4",
      from === "user" ? "flex-row-reverse is-user" : "flex-row",
      className
    )}
    {...props}
  />
))
Message.displayName = "Message"

const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex-1 space-y-2 overflow-hidden",
      "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:rounded-2xl group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:max-w-[80%]",
      "group-[&:not(.is-user)]:bg-muted group-[&:not(.is-user)]:text-foreground group-[&:not(.is-user)]:rounded-2xl group-[&:not(.is-user)]:px-4 group-[&:not(.is-user)]:py-3 group-[&:not(.is-user)]:max-w-[80%]",
      className
    )}
    {...props}
  />
))
MessageContent.displayName = "MessageContent"

const MessageResponse = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm leading-relaxed", className)} {...props} />
))
MessageResponse.displayName = "MessageResponse"

export { Message, MessageContent, MessageResponse }
